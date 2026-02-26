from django.contrib.auth import get_user_model
from django.db import models, transaction
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.common.models import CrimeSeverity
from .models import Case, CaseHistory, CaseOrigin, CaseStatus, CrimeSceneWitness
from .serializers import (
    CaseSerializer,
    CaseTransitionSerializer,
    CrimeSceneCaseSerializer,
    CrimeSceneWitnessSerializer,
    DetectiveBoardSerializer,
)

User = get_user_model()


class CaseViewSet(viewsets.ModelViewSet):
    serializer_class = CaseSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["status", "origin", "crime_severity", "lead_detective"]
    search_fields = ["case_number", "title", "summary", "crime_scene_location"]
    ordering_fields = ["created_at", "updated_at", "crime_severity"]

    def create(self, request, *args, **kwargs):
        """Standard case creation - restricted to admin/staff only."""
        if not request.user.is_staff:
            return Response(
                {"error": "Direct case creation is restricted to administrators. Use 'from_crime_scene' endpoint or file a complaint."},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().create(request, *args, **kwargs)

    def get_queryset(self):
        user = self.request.user
        
        # Admins see all
        if user.is_staff:
            return Case.objects.all()
        
        # Users see cases they're involved in
        return Case.objects.filter(
            models.Q(created_by=user) |
            models.Q(lead_detective=user) |
            models.Q(officers=user) |
            models.Q(approved_by=user)
        ).distinct()

    def _log_transition(self, case, from_status, to_status, user, notes=""):
        CaseHistory.objects.create(
            case=case,
            from_status=from_status,
            to_status=to_status,
            changed_by=user,
            notes=notes,
        )

    @action(detail=False, methods=["post"])
    def from_crime_scene(self, request):
        """Create case from crime scene report (police officer)."""
        ALLOWED_ROLES = ["Chief", "Captain", "Sergeant", "Detective", "Police Officer", "Patrol Officer"]
        user_roles = request.user.get_roles()
        
        if not request.user.is_staff and not any(role in ALLOWED_ROLES for role in user_roles):
            return Response(
                {"error": "Only police officers (non-Cadet) can register crime scenes."},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = CrimeSceneCaseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        witnesses_data = serializer.validated_data.pop("witnesses", [])
        
        with transaction.atomic():
            case = Case.objects.create(
                created_by=request.user,
                origin=CaseOrigin.CRIME_SCENE,
                **serializer.validated_data
            )
            
            # Create witness records
            for witness_data in witnesses_data:
                CrimeSceneWitness.objects.create(case=case, **witness_data)
            
            # Submit for approval (unless created by Chief)
            if request.user.has_role("Chief"):
                case.start_investigation()
            else:
                case.submit_for_approval()
            case.save()
            
            self._log_transition(
                case, CaseStatus.CREATED, case.status, request.user,
                "Case created from crime scene"
            )
        
        return Response(
            CaseSerializer(case, context={"request": request}).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        """Superior approves the case."""
        case = self.get_object()
        from_status = case.status
        
        try:
            case.approve_and_start(request.user)
            case.save()
            self._log_transition(case, from_status, case.status, request.user)
            return Response(CaseSerializer(case, context={"request": request}).data)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def assign_detective(self, request, pk=None):
        """Assign lead detective to case."""
        case = self.get_object()
        serializer = CaseTransitionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        detective_id = serializer.validated_data.get("target_user_id")
        if not detective_id:
            return Response(
                {"error": "target_user_id (detective) is required."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        case.lead_detective = User.objects.get(id=detective_id)
        case.save()
        
        return Response(CaseSerializer(case, context={"request": request}).data)

    @action(detail=True, methods=["post"])
    def start_investigation(self, request, pk=None):
        """Start investigation phase."""
        case = self.get_object()
        from_status = case.status
        
        try:
            case.start_investigation()
            case.save()
            self._log_transition(case, from_status, case.status, request.user)
            return Response(CaseSerializer(case, context={"request": request}).data)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def identify_suspect(self, request, pk=None):
        """Mark suspects as identified."""
        case = self.get_object()
        from_status = case.status
        
        try:
            case.identify_suspect()
            case.save()
            self._log_transition(case, from_status, case.status, request.user)
            return Response(CaseSerializer(case, context={"request": request}).data)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def start_interrogation(self, request, pk=None):
        """Start interrogation phase."""
        case = self.get_object()
        from_status = case.status
        
        try:
            case.start_interrogation()
            case.save()
            self._log_transition(case, from_status, case.status, request.user)
            return Response(CaseSerializer(case, context={"request": request}).data)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def submit_to_captain(self, request, pk=None):
        """Submit to captain for decision."""
        case = self.get_object()
        from_status = case.status
        
        try:
            case.submit_to_captain()
            case.save()
            self._log_transition(case, from_status, case.status, request.user)
            
            # Auto-escalate critical cases to Chief
            if case.crime_severity == CrimeSeverity.CRITICAL:
                captain_status = case.status
                case.escalate_to_chief()
                case.save()
                self._log_transition(
                    case, captain_status, case.status, request.user,
                    "Auto-escalated to Chief due to critical severity"
                )
            
            return Response(CaseSerializer(case, context={"request": request}).data)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def escalate_to_chief(self, request, pk=None):
        """Escalate critical case to chief."""
        case = self.get_object()
        from_status = case.status
        
        try:
            case.escalate_to_chief()
            case.save()
            self._log_transition(case, from_status, case.status, request.user)
            return Response(CaseSerializer(case, context={"request": request}).data)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def send_to_trial(self, request, pk=None):
        """Send case to trial."""
        case = self.get_object()
        from_status = case.status
        
        try:
            case.send_to_trial()
            case.save()
            self._log_transition(case, from_status, case.status, request.user)
            return Response(CaseSerializer(case, context={"request": request}).data)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def close_solved(self, request, pk=None):
        """Close case as solved."""
        case = self.get_object()
        from_status = case.status
        
        try:
            case.close_solved()
            case.save()
            self._log_transition(case, from_status, case.status, request.user)
            return Response(CaseSerializer(case, context={"request": request}).data)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def close_unsolved(self, request, pk=None):
        """Close case as unsolved."""
        case = self.get_object()
        from_status = case.status
        serializer = CaseTransitionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            case.close_unsolved()
            case.save()
            self._log_transition(
                case, from_status, case.status, request.user,
                serializer.validated_data.get("notes", "")
            )
            return Response(CaseSerializer(case, context={"request": request}).data)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["get", "put", "patch"])
    def detective_board(self, request, pk=None):
        """Get or update detective board."""
        case = self.get_object()
        
        if request.method == "GET":
            return Response(case.detective_board)
        
        serializer = DetectiveBoardSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        case.detective_board = {
            "layout": serializer.validated_data.get("layout", {}),
            "connections": serializer.validated_data.get("connections", []),
        }
        case.save()
        
        return Response(case.detective_board)

    @action(detail=True, methods=["post"])
    def add_witness(self, request, pk=None):
        """Add witness to case."""
        case = self.get_object()
        serializer = CrimeSceneWitnessSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        witness = CrimeSceneWitness.objects.create(case=case, **serializer.validated_data)
        return Response(
            CrimeSceneWitnessSerializer(witness).data,
            status=status.HTTP_201_CREATED
        )
