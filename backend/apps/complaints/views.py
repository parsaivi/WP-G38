from django.contrib.auth import get_user_model
from django.db import models, transaction
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.cases.models import Case, CaseOrigin

from .models import Complaint, ComplaintHistory, ComplaintStatus
from .serializers import (
    AddComplainantSerializer,
    ComplaintSerializer,
    ComplaintTransitionSerializer,
)

User = get_user_model()


class ComplaintViewSet(viewsets.ModelViewSet):
    serializer_class = ComplaintSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["status", "crime_severity", "created_by"]
    search_fields = ["title", "description", "location"]
    ordering_fields = ["created_at", "updated_at", "crime_severity"]

    def create(self, request, *args, **kwargs):
        """Only users with Complainant role can file complaints."""
        if not request.user.is_staff and not request.user.has_role("Complainant"):
            return Response(
                {"error": "Only users with Complainant role can file complaints."},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().create(request, *args, **kwargs)

    def get_queryset(self):
        user = self.request.user
        
        # Admins see all
        if user.is_staff:
            return Complaint.objects.all()
        
        q = (
            models.Q(created_by=user) |
            models.Q(complainants=user) |
            models.Q(assigned_cadet=user) |
            models.Q(assigned_officer=user)
        )
        
        # Cadets see submitted complaints (awaiting cadet assignment/review)
        if user.has_role("Cadet"):
            q |= models.Q(status__in=[
                ComplaintStatus.SUBMITTED,
                ComplaintStatus.CADET_REVIEW,
                ComplaintStatus.RETURNED_TO_CADET,
            ])
        
        # Police Officers see complaints in officer review
        if user.has_role("Police Officer"):
            q |= models.Q(status__in=[
                ComplaintStatus.SUBMITTED,
                ComplaintStatus.OFFICER_REVIEW,
            ])
        
        return Complaint.objects.filter(q).distinct()

    def _log_transition(self, complaint, from_status, to_status, user, message=""):
        ComplaintHistory.objects.create(
            complaint=complaint,
            from_status=from_status,
            to_status=to_status,
            changed_by=user,
            message=message,
        )

    @action(detail=True, methods=["post"])
    def submit(self, request, pk=None):
        """Complainant submits their complaint."""
        complaint = self.get_object()
        if complaint.created_by != request.user:
            return Response({"error": "Only the creator can submit."}, status=status.HTTP_403_FORBIDDEN)
        from_status = complaint.status
        
        try:
            complaint.submit()
            complaint.save()
            self._log_transition(complaint, from_status, complaint.status, request.user)
            return Response(ComplaintSerializer(complaint).data)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def assign_cadet(self, request, pk=None):
        """Assign complaint to a cadet for review."""
        if not (request.user.has_role("Police Officer") or request.user.is_staff):
            return Response({"error": "Only officers or admins can assign cadets."}, status=status.HTTP_403_FORBIDDEN)
        complaint = self.get_object()
        serializer = ComplaintTransitionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        cadet_id = serializer.validated_data.get("target_user_id")
        cadet = User.objects.get(id=cadet_id) if cadet_id else request.user
        
        from_status = complaint.status
        try:
            complaint.assign_to_cadet(cadet)
            complaint.save()
            self._log_transition(complaint, from_status, complaint.status, request.user)
            return Response(ComplaintSerializer(complaint).data)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def return_to_complainant(self, request, pk=None):
        """Cadet returns complaint to complainant for corrections."""
        if not request.user.has_role("Cadet"):
            return Response({"error": "Only cadets can return complaints."}, status=status.HTTP_403_FORBIDDEN)
        complaint = self.get_object()
        serializer = ComplaintTransitionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        message = serializer.validated_data.get("message", "")
        from_status = complaint.status
        
        try:
            with transaction.atomic():
                complaint.return_to_complainant(message)
                complaint.save()
                self._log_transition(
                    complaint, from_status, complaint.status, request.user, message
                )
            return Response(ComplaintSerializer(complaint).data)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def resubmit(self, request, pk=None):
        """Complainant resubmits after corrections."""
        complaint = self.get_object()
        from_status = complaint.status
        
        try:
            complaint.resubmit()
            complaint.save()
            self._log_transition(complaint, from_status, complaint.status, request.user)
            return Response(ComplaintSerializer(complaint).data)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def escalate(self, request, pk=None):
        """Cadet approves and escalates to officer."""
        if not request.user.has_role("Cadet"):
            return Response({"error": "Only cadets can escalate complaints."}, status=status.HTTP_403_FORBIDDEN)
        complaint = self.get_object()
        serializer = ComplaintTransitionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        officer_id = serializer.validated_data.get("target_user_id")
        officer = User.objects.get(id=officer_id) if officer_id else None
        
        from_status = complaint.status
        try:
            complaint.escalate_to_officer(officer)
            complaint.save()
            self._log_transition(complaint, from_status, complaint.status, request.user)
            return Response(ComplaintSerializer(complaint).data)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def return_to_cadet(self, request, pk=None):
        """Officer returns to cadet for review."""
        if not request.user.has_role("Police Officer"):
            return Response({"error": "Only officers can return complaints to cadets."}, status=status.HTTP_403_FORBIDDEN)
        complaint = self.get_object()
        serializer = ComplaintTransitionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        message = serializer.validated_data.get("message", "")
        from_status = complaint.status
        
        try:
            complaint.return_to_cadet(message)
            complaint.save()
            self._log_transition(
                complaint, from_status, complaint.status, request.user, message
            )
            return Response(ComplaintSerializer(complaint).data)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        """Officer approves the complaint."""
        if not request.user.has_role("Police Officer"):
            return Response({"error": "Only officers can approve complaints."}, status=status.HTTP_403_FORBIDDEN)
        complaint = self.get_object()
        from_status = complaint.status
        
        try:
            with transaction.atomic():
                complaint.approve()
                complaint.save()
                self._log_transition(complaint, from_status, complaint.status, request.user)
                Case.objects.create(
                    title=complaint.title,
                    summary=complaint.description,
                    origin=CaseOrigin.COMPLAINT,
                    origin_complaint=complaint,
                    crime_severity=complaint.crime_severity,
                    created_by=request.user,
                )
            return Response(ComplaintSerializer(complaint).data)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        """Reject the complaint permanently."""
        complaint = self.get_object()
        serializer = ComplaintTransitionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        message = serializer.validated_data.get("message", "")
        from_status = complaint.status
        
        try:
            complaint.reject(message)
            complaint.save()
            self._log_transition(
                complaint, from_status, complaint.status, request.user, message
            )
            return Response(ComplaintSerializer(complaint).data)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def add_complainant(self, request, pk=None):
        """Add additional complainant to the complaint."""
        complaint = self.get_object()
        serializer = AddComplainantSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user_id = serializer.validated_data["user_id"]
        approved = serializer.validated_data["approved"]
        
        if approved:
            user = User.objects.get(id=user_id)
            complaint.complainants.add(user)
            return Response({
                "message": "Complainant added successfully.",
                "complaint": ComplaintSerializer(complaint).data
            })
        else:
            return Response({"message": "Complainant request rejected."})



