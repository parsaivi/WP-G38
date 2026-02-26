from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import serializers

from apps.accounts.serializers import UserSerializer
from apps.cases.serializers import CaseSerializer
from apps.suspects.serializers import SuspectSerializer
from .models import CaseReport, Sentence, Trial, VerdictChoice

User = get_user_model()


class SentenceSerializer(serializers.ModelSerializer):
    issued_by = UserSerializer(read_only=True)
    suspect = SuspectSerializer(read_only=True)
    suspect_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = Sentence
        fields = [
            "id", "trial", "suspect", "suspect_id", "issued_by",
            "title", "description", "duration_days", "fine_amount",
            "created_at",
        ]
        read_only_fields = ["issued_by"]


class TrialSerializer(serializers.ModelSerializer):
    judge = UserSerializer(read_only=True)
    judge_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        write_only=True,
        source="judge"
    )
    case = CaseSerializer(read_only=True)
    case_id = serializers.IntegerField(write_only=True, source="case.id")
    sentences = SentenceSerializer(many=True, read_only=True)

    class Meta:
        model = Trial
        fields = [
            "id", "case", "case_id", "judge", "judge_id",
            "scheduled_date", "started_at", "ended_at",
            "verdict", "verdict_date", "verdict_notes",
            "court_name", "court_room",
            "sentences",
            "created_at", "updated_at",
        ]
        read_only_fields = ["verdict", "verdict_date"]

    def create(self, validated_data):
        case_data = validated_data.pop("case")
        from apps.cases.models import Case
        case = Case.objects.get(id=case_data["id"])
        return Trial.objects.create(case=case, **validated_data)


class VerdictSerializer(serializers.Serializer):
    """Serializer for issuing verdict."""
    
    verdict = serializers.ChoiceField(choices=VerdictChoice.choices)
    notes = serializers.CharField(required=False, allow_blank=True)


class CaseReportSerializer(serializers.ModelSerializer):
    generated_by = UserSerializer(read_only=True)

    class Meta:
        model = CaseReport
        fields = [
            "id", "case", "generated_by", "generated_at", "report_data"
        ]
        read_only_fields = ["generated_by", "generated_at", "report_data"]
