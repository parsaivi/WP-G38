from django.core.cache import cache
from django.http import HttpResponseRedirect
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import Bail, BailStatus
from .serializers import (
    BailCreateSerializer,
    BailListSerializer,
    BailSerializer,
    InitiatePaymentSerializer,
)
from .zibal_client import payment_start_url, request_payment, verify_payment

# Cache TTL for frontend return_url (1 hour)
BAIL_RETURN_URL_CACHE_TTL = 3600


class BailViewSet(viewsets.ModelViewSet):
    """
    Bails: list (public), retrieve (public), create (Sergeant only).
    initiate_payment: POST with return_url -> Zibal request, returns payment_url (redirect to Zibal).
    confirm_payment: GET -> returns current bail status (payment is confirmed in Zibal callback).
    """
    permission_classes = [AllowAny]
    filterset_fields = ["status", "suspect"]
    ordering_fields = ["created_at", "amount"]

    def get_queryset(self):
        return Bail.objects.select_related("suspect", "created_by").all()

    def get_serializer_class(self):
        if self.action == "list":
            return BailListSerializer
        if self.action == "create":
            return BailCreateSerializer
        return BailSerializer

    def get_permissions(self):
        if self.action in ("create",):
            return [IsAuthenticated()]
        return [AllowAny()]

    def create(self, request, *args, **kwargs):
        user_roles = request.user.get_roles() if request.user.is_authenticated else []
        if not request.user.is_staff and "Sergeant" not in user_roles:
            return Response(
                {"error": "Only Sergeant can create bails."},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        bail = serializer.save(created_by=request.user)
        return Response(
            BailSerializer(bail).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"])
    def initiate_payment(self, request, pk=None):
        """
        Start Zibal payment: create payment request, return payment_url for redirect.
        Frontend should redirect user to payment_url (Zibal gateway).
        """
        bail = self.get_object()
        if bail.status != BailStatus.PENDING:
            return Response(
                {"error": "Bail is not pending payment."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        ser = InitiatePaymentSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        return_url = ser.validated_data["return_url"]

        # Build callback URL (Zibal will GET this with success, trackId, orderId, status)
        callback_path = "/api/v1/bail/zibal-callback/"
        callback_url = request.build_absolute_uri(callback_path)

        total_amount = bail.amount + (bail.fine_amount or 0)
        if total_amount < 1000:
            return Response(
                {"error": "Amount must be at least 1,000 Rials for Zibal."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ok, track_id, msg = request_payment(
            amount_rials=total_amount,
            callback_url=callback_url,
            order_id=bail.pk,
            description=f"Bail #{bail.pk} - {bail.suspect.full_name}",
        )
        if not ok:
            return Response(
                {"error": msg or "Zibal request failed."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        bail.zibal_track_id = track_id
        bail.save(update_fields=["zibal_track_id"])
        cache.set(f"bail_return_url_{bail.pk}", return_url, timeout=BAIL_RETURN_URL_CACHE_TTL)

        payment_url = payment_start_url(track_id)
        return Response({
            "payment_url": payment_url,
            "track_id": track_id,
        })

    @action(detail=True, methods=["get"], url_path="confirm_payment")
    def confirm_payment(self, request, pk=None):
        """
        Return current payment status. Actual verification is done in Zibal callback.
        If bail is already PAID, return success; otherwise payment not completed.
        """
        bail = self.get_object()
        if bail.status == BailStatus.PAID:
            return Response({
                "detail": "Payment confirmed. Suspect released on bail.",
                "bail_id": bail.pk,
                "suspect_id": bail.suspect_id,
                "suspect_status": bail.suspect.status,
            })
        return Response(
            {"detail": "Payment not completed or not verified yet.", "status": bail.status},
            status=status.HTTP_400_BAD_REQUEST,
        )


@csrf_exempt
@require_GET
def zibal_callback(request):
    """
    Zibal IPG callback (GET). Query params: success, trackId, orderId, status.
    Verify with Zibal, mark bail paid and release suspect, then redirect to frontend.
    """
    from django.conf import settings
    success_param = request.GET.get("success", "")
    track_id_param = request.GET.get("trackId", "")
    order_id_param = request.GET.get("orderId", "")
    # status: 1 = paid verified, 2 = paid not verified (we must verify)

    try:
        order_id = int(order_id_param)
    except (TypeError, ValueError):
        order_id = None
    if not order_id:
        return _redirect_return(bail_id=None, status="failed", error="invalid_order")

    try:
        bail = Bail.objects.get(pk=order_id)
    except Bail.DoesNotExist:
        return _redirect_return(bail_id=None, status="failed", error="bail_not_found")

    if bail.status != BailStatus.PENDING:
        return _redirect_return(bail_id=bail.pk, status="success")

    # success=1 and (status=1 or 2) means user completed payment; we must verify
    if success_param != "1" or not track_id_param:
        return _redirect_return(bail_id=bail.pk, status="failed")

    ok, data, msg = verify_payment(int(track_id_param))
    if not ok:
        return _redirect_return(bail_id=bail.pk, status="failed")

    bail.status = BailStatus.PAID
    bail.paid_at = timezone.now()
    bail.save(update_fields=["status", "paid_at"])
    suspect = bail.suspect
    try:
        suspect.release_on_bail()
        suspect.save()
    except Exception:
        pass

    return _redirect_return(bail_id=bail.pk, status="success")


def _redirect_return(bail_id=None, status="failed", error=None):
    """Redirect to frontend bail return URL with bail_id and status."""
    from django.conf import settings
    from urllib.parse import urlencode
    return_url = None
    if bail_id:
        return_url = cache.get(f"bail_return_url_{bail_id}")
    if not return_url:
        return_url = getattr(
            settings,
            "FRONTEND_BAIL_RETURN_BASE",
            "http://localhost:3001",
        ).rstrip("/") + "/bail/return"
    params = {"status": status}
    if bail_id is not None:
        params["bail_id"] = bail_id
    if error:
        params["error"] = error
    return HttpResponseRedirect(f"{return_url}?{urlencode(params)}")
