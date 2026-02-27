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

    APPROVAL_ROLES = ["Chief", "Captain", "Sergeant"]

    def get_queryset(self):
        user = self.request.user
        
        # Admins see all
        if user.is_staff:
            return Case.objects.all()
        
        user_roles = user.get_roles()
        
        # Judge, Captain, Chief: full access to all cases for overall report (گزارش‌گیری کلی)
        if any(role in ["Judge", "Captain", "Chief"] for role in user_roles):
            return Case.objects.all()
        
        q = (
            models.Q(created_by=user) |
            models.Q(lead_detective=user) |
            models.Q(officers=user) |
            models.Q(approved_by=user)
        )
        
        # Superiors (Sergeant, Captain, Chief) can see pending_approval cases
        if any(role in self.APPROVAL_ROLES for role in user_roles):
            q |= models.Q(status=CaseStatus.PENDING_APPROVAL)
        
        # Sergeant can see suspect_identified (approve/reject) and interrogation
        if "Sergeant" in user_roles:
            q |= models.Q(status=CaseStatus.SUSPECT_IDENTIFIED)
            q |= models.Q(status=CaseStatus.INTERROGATION)

        # Captain can see cases pending their decision and interrogation cases
        if "Captain" in user_roles:
            q |= models.Q(status=CaseStatus.PENDING_CAPTAIN)
            q |= models.Q(status=CaseStatus.INTERROGATION)

        # Chief can see cases pending their decision
        if "Chief" in user_roles:
            q |= models.Q(status=CaseStatus.PENDING_CHIEF)

        # Judge can see cases in trial
        if "Judge" in user_roles:
            q |= models.Q(status=CaseStatus.TRIAL)

        # Detectives can see created, investigation, suspect_identified (their case), interrogation
        if "Detective" in user_roles:
            q |= models.Q(status=CaseStatus.CREATED)
            q |= (models.Q(status=CaseStatus.INVESTIGATION) & models.Q(lead_detective=user))
            q |= (models.Q(status=CaseStatus.SUSPECT_IDENTIFIED) & models.Q(lead_detective=user))
            q |= (models.Q(status=CaseStatus.INTERROGATION) & models.Q(lead_detective=user))
        
        return Case.objects.filter(q).distinct()

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
            
            # Submit for approval (unless created by Chief – no approval needed)
            if not request.user.has_role("Chief"):
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
        """Superior approves the case (Sergeant, Captain, Chief only)."""
        user_roles = request.user.get_roles()
        if not request.user.is_staff and not any(role in self.APPROVAL_ROLES for role in user_roles):
            return Response(
                {"error": "Only Sergeant, Captain, or Chief can approve cases."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        case = self.get_object()
        from_status = case.status
        
        try:
            case.approve_case(request.user)
            case.save()
            self._log_transition(case, from_status, case.status, request.user, "Case approved by superior")
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
        """Start investigation phase – assigns requesting detective as lead."""
        case = self.get_object()
        from_status = case.status
        
        try:
            case.start_investigation(detective=request.user)
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
    def approve_suspects(self, request, pk=None):
        """Sergeant approves suspects → case becomes SUSPECT_IDENTIFIED, suspects become UNDER_PURSUIT."""
        user_roles = request.user.get_roles()
        if not request.user.is_staff and "Sergeant" not in user_roles:
            return Response(
                {"error": "Only Sergeant can approve identified suspects."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        case = self.get_object()
        if not case.suspect_links.exists():
            return Response(
                {"error": "This case has no suspects to approve."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            case.approve_suspects_for_pursuit()
            self._log_transition(
                case, case.status, case.status, request.user,
                "Sergeant approved suspects – under pursuit (arrest when captured)"
            )
            return Response(CaseSerializer(case, context={"request": request}).data)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def reject_suspects(self, request, pk=None):
        """Sergeant rejects identified suspects → case returns to investigation."""
        user_roles = request.user.get_roles()
        if not request.user.is_staff and "Sergeant" not in user_roles:
            return Response(
                {"error": "Only Sergeant can reject identified suspects."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        case = self.get_object()
        from_status = case.status
        notes = request.data.get("notes", "")
        
        try:
            case.reject_suspects()
            case.save()
            self._log_transition(
                case, from_status, case.status, request.user,
                notes or "Sergeant rejected suspects – case returned to investigation"
            )
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
        """Submit to captain for decision after interrogation scores are complete."""
        case = self.get_object()
        from_status = case.status
        
        try:
            case.submit_to_captain()
            case.save()
            self._log_transition(case, from_status, case.status, request.user,
                                 "Interrogation complete – submitted to captain")
            return Response(CaseSerializer(case, context={"request": request}).data)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def captain_approve(self, request, pk=None):
        """Captain approves case after reviewing scores and evidence.
        Non-critical → trial. Critical → escalate to chief."""
        user_roles = request.user.get_roles()
        if not request.user.is_staff and "Captain" not in user_roles:
            return Response(
                {"error": "Only Captain can approve cases at this stage."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        case = self.get_object()
        from_status = case.status
        
        try:
            if case.crime_severity == CrimeSeverity.CRITICAL:
                case.escalate_to_chief()
                case.save()
                self._log_transition(
                    case, from_status, case.status, request.user,
                    "Captain approved – escalated to Chief (critical case)"
                )
            else:
                case.send_to_trial()
                case.save()
                self._log_transition(
                    case, from_status, case.status, request.user,
                    "Captain approved – sent to trial"
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
    def chief_approve(self, request, pk=None):
        """Chief approves critical case for trial."""
        user_roles = request.user.get_roles()
        if not request.user.is_staff and "Chief" not in user_roles:
            return Response(
                {"error": "Only Chief can approve cases at this stage."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        case = self.get_object()
        from_status = case.status
        
        try:
            case.send_to_trial()
            case.save()
            self._log_transition(
                case, from_status, case.status, request.user,
                "Chief approved – sent to trial"
            )
            return Response(CaseSerializer(case, context={"request": request}).data)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def send_to_trial(self, request, pk=None):
        """Send case to trial (Captain/Chief only)."""
        user_roles = request.user.get_roles()
        if not request.user.is_staff and not any(role in ["Captain", "Chief"] for role in user_roles):
            return Response(
                {"error": "Only Captain or Chief can send cases to trial."},
                status=status.HTTP_403_FORBIDDEN
            )
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
            from apps.evidence.models import Evidence
            evidence_qs = Evidence.objects.filter(case=case).values(
                "id", "title", "description", "evidence_type", "status"
            )
            board_data = dict(case.detective_board or {})
            board_data.setdefault("notes", [])
            board_data.setdefault("connections", [])
            board_data["evidence_items"] = list(evidence_qs)
            return Response(board_data)
        
        serializer = DetectiveBoardSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        case.detective_board = {
            "notes": serializer.validated_data.get("notes", []),
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

    @action(detail=True, methods=["post"])
    def add_suspect(self, request, pk=None):
        """Detective adds a suspect to this case."""
        case = self.get_object()

        user_roles = request.user.get_roles()
        if not request.user.is_staff and "Detective" not in user_roles:
            return Response(
                {"error": "Only detectives can add suspects to cases."},
                status=status.HTTP_403_FORBIDDEN
            )

        if not request.user.is_staff and case.lead_detective != request.user:
            return Response(
                {"error": "Only the lead detective of this case can add suspects."},
                status=status.HTTP_403_FORBIDDEN
            )

        from apps.suspects.models import Suspect, CaseSuspect

        full_name = request.data.get("full_name")
        if not full_name:
            return Response(
                {"error": "full_name is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            suspect = Suspect.objects.create(
                full_name=full_name,
                aliases=request.data.get("aliases", ""),
                description=request.data.get("description", ""),
                last_known_location=request.data.get("last_known_location", ""),
            )

            CaseSuspect.objects.create(
                case=case,
                suspect=suspect,
                role=request.data.get("role", "primary"),
                notes=request.data.get("notes", ""),
                added_by=request.user,
            )

        from apps.suspects.serializers import SuspectSerializer as SuspectSer
        return Response(
            SuspectSer(suspect).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=["get"])
    def suspects(self, request, pk=None):
        """Get all suspects linked to this case."""
        case = self.get_object()
        from apps.suspects.models import CaseSuspect
        from apps.suspects.serializers import CaseSuspectSerializer
        links = CaseSuspect.objects.filter(case=case).select_related("suspect", "added_by")
        return Response(CaseSuspectSerializer(links, many=True).data)
    
    @action(detail=False, methods=["get"], url_path="detective-board-cases")
    def detective_board_cases(self, request):
        """
        Returns cases that the current detective can open in detective board:
        status=INVESTIGATION and lead_detective=user
        """
        user = request.user

        if not user.is_staff and not user.has_role("Detective"):
            return Response([])

        qs = Case.objects.filter(
            models.Q(status=CaseStatus.INVESTIGATION) &
            models.Q(lead_detective=user)
        ).distinct().order_by("-updated_at")

        data = list(qs.values("id", "case_number", "title", "status", "updated_at"))
        return Response(data)
