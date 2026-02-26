from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.cases.models import Case
from apps.suspects.models import Suspect
from .models import CaseReport, Sentence, Trial, VerdictChoice
from .serializers import (
    CaseReportSerializer,
    SentenceSerializer,
    TrialSerializer,
    VerdictSerializer,
)

User = get_user_model()


class TrialViewSet(viewsets.ModelViewSet):
    queryset = Trial.objects.all()
    serializer_class = TrialSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["judge", "verdict"]
    ordering_fields = ["scheduled_date", "created_at"]

    @action(detail=True, methods=["post"])
    def start(self, request, pk=None):
        """Mark trial as started."""
        trial = self.get_object()
        trial.started_at = timezone.now()
        trial.save()
        return Response(TrialSerializer(trial).data)

    @action(detail=True, methods=["post"])
    def issue_verdict(self, request, pk=None):
        """Judge issues verdict."""
        trial = self.get_object()
        serializer = VerdictSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        trial.verdict = serializer.validated_data["verdict"]
        trial.verdict_date = timezone.now()
        trial.verdict_notes = serializer.validated_data.get("notes", "")
        trial.ended_at = timezone.now()
        trial.save()
        
        # Update case status
        case = trial.case
        if trial.verdict == VerdictChoice.GUILTY:
            case.close_solved()
            case.save()
            
            # Update suspect statuses
            for link in case.suspect_links.filter(role="primary"):
                link.suspect.convict()
                link.suspect.save()
        
        return Response(TrialSerializer(trial).data)

    @action(detail=True, methods=["post"])
    def add_sentence(self, request, pk=None):
        """Add sentence for a convicted suspect."""
        trial = self.get_object()
        
        if trial.verdict != VerdictChoice.GUILTY:
            return Response(
                {"error": "Cannot add sentence without guilty verdict."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = SentenceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        suspect_id = serializer.validated_data.pop("suspect_id")
        suspect = Suspect.objects.get(id=suspect_id)
        
        sentence = Sentence.objects.create(
            trial=trial,
            suspect=suspect,
            issued_by=request.user,
            **serializer.validated_data
        )
        
        return Response(SentenceSerializer(sentence).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"])
    def full_report(self, request, pk=None):
        """Get comprehensive case report for judge."""
        trial = self.get_object()
        case = trial.case
        
        # Generate or get report
        report, created = CaseReport.objects.get_or_create(
            case=case,
            defaults={"generated_by": request.user}
        )
        
        if created or not report.report_data:
            report.generated_by = request.user
            report.generate_report()
        
        return Response(CaseReportSerializer(report).data)


class CaseReportViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = CaseReport.objects.all()
    serializer_class = CaseReportSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["post"])
    def generate(self, request):
        """Generate report for a case."""
        case_id = request.data.get("case_id")
        
        if not case_id:
            return Response(
                {"error": "case_id is required."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        case = Case.objects.get(id=case_id)
        
        report, created = CaseReport.objects.get_or_create(
            case=case,
            defaults={"generated_by": request.user}
        )
        
        report.generated_by = request.user
        report.generate_report()
        
        return Response(CaseReportSerializer(report).data)
