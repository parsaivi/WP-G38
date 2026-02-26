from django.contrib.auth import get_user_model
from django.db import models
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

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
        return Suspect.objects.all()

    def get_serializer_class(self):
        if self.action == "list":
            return SuspectListSerializer
        return SuspectSerializer

    @action(detail=False, methods=["get"], permission_classes=[AllowAny])
    def most_wanted(self, request):
        """
        Public Most Wanted list.
        Returns suspects in Most Wanted status, ranked by formula.
        """
        suspects = Suspect.objects.filter(
            status__in=[SuspectStatus.UNDER_PURSUIT, SuspectStatus.MOST_WANTED]
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
        """Mark suspect as arrested."""
        suspect = self.get_object()
        
        try:
            suspect.arrest()
            suspect.save()
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
        suspect = self.get_object()
        if suspect.status not in (SuspectStatus.ARRESTED, SuspectStatus.UNDER_INVESTIGATION):
            return Response(
                {"error": "Guilt scoring is only allowed for arrested or under-investigation suspects."},
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
        suspect = self.get_object()
        if suspect.status not in (SuspectStatus.ARRESTED, SuspectStatus.UNDER_INVESTIGATION):
            return Response(
                {"error": "Guilt scoring is only allowed for arrested or under-investigation suspects."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = GuildScoreSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        suspect.sergeant_guilt_score = serializer.validated_data["score"]
        suspect.save()
        
        return Response(SuspectSerializer(suspect).data)

    @action(detail=True, methods=["post"])
    def captain_decision(self, request, pk=None):
        """Captain makes final decision."""
        suspect = self.get_object()
        serializer = CaptainDecisionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        suspect.captain_decision = serializer.validated_data["decision"]
        suspect.save()
        
        return Response(SuspectSerializer(suspect).data)

    @action(detail=True, methods=["post"])
    def chief_decision(self, request, pk=None):
        """Chief makes decision for critical cases."""
        suspect = self.get_object()
        decision = request.data.get("decision", "")
        
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
