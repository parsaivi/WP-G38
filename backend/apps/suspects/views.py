from django.contrib.auth import get_user_model
from django.db import models
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from apps.suspects.models import CaseSuspect
from apps.cases.models import CaseStatus

from apps.cases.models import Case
from .models import CaseSuspect, Interrogation, Suspect, SuspectStatus
from .serializers import (
    CaptainDecisionSerializer,
    CaseSuspectSerializer,
    GuildScoreSerializer,
    InterrogationSerializer,
    LinkSuspectToCaseSerializer,
    MostWantedSerializer,
    SuspectListSerializer,
    SuspectSerializer,
)

User = get_user_model()


class SuspectViewSet(viewsets.ModelViewSet):
    serializer_class = SuspectSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["status"]
    search_fields = ["full_name", "aliases", "description", "last_known_location"]
    ordering_fields = ["created_at", "wanted_since"]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return Suspect.objects.all()

        user_roles = user.get_roles()

        # Detectives see suspects from their cases
        if "Detective" in user_roles:
            suspect_ids = CaseSuspect.objects.filter(
                case__lead_detective=user
            ).values_list("suspect_id", flat=True)
            return Suspect.objects.filter(
                models.Q(id__in=suspect_ids)
            ).distinct()

        # Sergeant sees suspects from cases in suspect_identified status
        if "Sergeant" in user_roles:
            suspect_ids = CaseSuspect.objects.filter(
                case__status__in=[CaseStatus.SUSPECT_IDENTIFIED, CaseStatus.INTERROGATION]
            ).values_list("suspect_id", flat=True)
            return Suspect.objects.filter(id__in=suspect_ids).distinct()

        # Captain sees suspects from cases pending captain decision
        if "Captain" in user_roles:
            suspect_ids = CaseSuspect.objects.filter(
                case__status__in=[CaseStatus.INTERROGATION, CaseStatus.PENDING_CAPTAIN]
            ).values_list("suspect_id", flat=True)
            return Suspect.objects.filter(id__in=suspect_ids).distinct()

        # Chief sees suspects from critical cases pending chief decision
        if "Chief" in user_roles:
            suspect_ids = CaseSuspect.objects.filter(
                case__status=CaseStatus.PENDING_CHIEF
            ).values_list("suspect_id", flat=True)
            return Suspect.objects.filter(id__in=suspect_ids).distinct()

        return Suspect.objects.none()

    def get_serializer_class(self):
        if self.action == "list":
            return SuspectListSerializer
        return SuspectSerializer

    @action(detail=False, methods=["get"], permission_classes=[AllowAny])
    def most_wanted(self, request):
        """
        Public Most Wanted list.
        Auto-promotes suspects under pursuit for 30+ days to Most Wanted.
        Returns suspects ranked by formula: max(Lj) * max(Di).
        """
        # Auto-promote eligible suspects (under pursuit > 30 days)
        eligible = Suspect.objects.filter(status=SuspectStatus.UNDER_PURSUIT)
        for suspect in eligible:
            if suspect.is_most_wanted_eligible:
                suspect.mark_most_wanted()
                suspect.save()

        suspects = Suspect.objects.filter(
            status = SuspectStatus.MOST_WANTED
        )

        # Sort by rank (computed property)
        suspects_with_rank = [
            (s, s.most_wanted_rank) for s in suspects
        ]
        suspects_with_rank.sort(key=lambda x: x[1], reverse=True)

        sorted_suspects = [s[0] for s in suspects_with_rank]

        serializer = MostWantedSerializer(sorted_suspects, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def start_investigation(self, request, pk=None):
        """Start investigating this suspect."""
        suspect = self.get_object()
        
        try:
            suspect.start_investigation()
            suspect.save()
            return Response(SuspectSerializer(suspect).data)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def mark_wanted(self, request, pk=None):
        """Mark suspect as wanted."""
        suspect = self.get_object()
        
        try:
            suspect.mark_wanted()
            suspect.save()
            return Response(SuspectSerializer(suspect).data)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def mark_most_wanted(self, request, pk=None):
        """Promote to Most Wanted status."""
        suspect = self.get_object()
        
        try:
            suspect.mark_most_wanted()
            suspect.save()
            return Response(SuspectSerializer(suspect).data)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def arrest(self, request, pk=None):
        """Mark suspect as arrested. If all suspects of a case are arrested, case moves to INTERROGATION."""
        user_roles = request.user.get_roles()
        if not request.user.is_staff and "Sergeant" not in user_roles:
            return Response(
                {"error": "Only Sergeant can arrest suspects."},
                status=status.HTTP_403_FORBIDDEN,
            )
        
        suspect = self.get_object()
        
        try:
            suspect.arrest()
            suspect.save()
            # When all suspects of a case are arrested, case enters interrogation
            for link in CaseSuspect.objects.filter(suspect=suspect).select_related("case"):
                case = link.case
                case.maybe_start_interrogation()
                case.save()
            return Response(SuspectSerializer(suspect).data)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def clear(self, request, pk=None):
        """Clear suspect of suspicion."""
        suspect = self.get_object()
        
        try:
            suspect.clear()
            suspect.save()
            return Response(SuspectSerializer(suspect).data)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def detective_score(self, request, pk=None):
        """Detective submits guilt probability score (1-10)."""
        user_roles = request.user.get_roles()
        if not request.user.is_staff and "Detective" not in user_roles:
            return Response(
                {"error": "Only detectives can submit detective guilt scores."},
                status=status.HTTP_403_FORBIDDEN,
            )
        suspect = self.get_object()
        if suspect.status != SuspectStatus.ARRESTED:
            return Response(
                {"error": "Guilt scoring is only allowed for arrested suspects during interrogation."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = GuildScoreSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        suspect.detective_guilt_score = serializer.validated_data["score"]
        suspect.save()
        
        return Response(SuspectSerializer(suspect).data)

    @action(detail=True, methods=["post"])
    def sergeant_score(self, request, pk=None):
        """Sergeant submits guilt probability score (1-10)."""
        user_roles = request.user.get_roles()
        if not request.user.is_staff and "Sergeant" not in user_roles:
            return Response(
                {"error": "Only sergeants can submit sergeant guilt scores."},
                status=status.HTTP_403_FORBIDDEN,
            )
        suspect = self.get_object()
        if suspect.status != SuspectStatus.ARRESTED:
            return Response(
                {"error": "Guilt scoring is only allowed for arrested suspects during interrogation."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = GuildScoreSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        suspect.sergeant_guilt_score = serializer.validated_data["score"]
        suspect.save()
        
        return Response(SuspectSerializer(suspect).data)

    @action(detail=True, methods=["post"])
    def captain_decision(self, request, pk=None):
        """Captain makes final decision on suspect."""
        user_roles = request.user.get_roles()
        if not request.user.is_staff and "Captain" not in user_roles:
            return Response(
                {"error": "Only Captain can make captain decisions."},
                status=status.HTTP_403_FORBIDDEN,
            )
        suspect = self.get_object()
        serializer = CaptainDecisionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        suspect.captain_decision = serializer.validated_data["decision"]
        suspect.save()
        
        return Response(SuspectSerializer(suspect).data)

    @action(detail=True, methods=["post"])
    def chief_decision(self, request, pk=None):
        """Chief makes decision for critical cases."""
        user_roles = request.user.get_roles()
        if not request.user.is_staff and "Chief" not in user_roles:
            return Response(
                {"error": "Only Chief can make chief decisions."},
                status=status.HTTP_403_FORBIDDEN,
            )
        suspect = self.get_object()
        decision = request.data.get("decision", "")
        if not decision:
            return Response(
                {"error": "Decision text is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        suspect.chief_decision = decision
        suspect.save()
        
        return Response(SuspectSerializer(suspect).data)

    @action(detail=True, methods=["post"])
    def link_to_case(self, request, pk=None):
        """Link suspect to a case."""
        suspect = self.get_object()
        serializer = LinkSuspectToCaseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        case = Case.objects.get(id=serializer.validated_data["case_id"])
        
        link, created = CaseSuspect.objects.get_or_create(
            case=case,
            suspect=suspect,
            defaults={
                "role": serializer.validated_data["role"],
                "notes": serializer.validated_data.get("notes", ""),
                "added_by": request.user,
            }
        )
        
        if not created:
            return Response(
                {"error": "Suspect is already linked to this case."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return Response(CaseSuspectSerializer(link).data, status=status.HTTP_201_CREATED)


class InterrogationViewSet(viewsets.ModelViewSet):
    queryset = Interrogation.objects.all()
    serializer_class = InterrogationSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["suspect", "case", "conducted_by"]
    ordering_fields = ["started_at"]

    def perform_create(self, serializer):
        serializer.save(conducted_by=self.request.user)
