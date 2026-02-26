from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.accounts.serializers import UserSerializer
from apps.common.models import CrimeSeverity
from apps.complaints.serializers import ComplaintSerializer
from .models import Case, CaseHistory, CaseOrigin, CrimeSceneWitness

User = get_user_model()


class CrimeSceneWitnessSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = CrimeSceneWitness
        fields = [
            "id", "full_name", "phone", "national_id", "notes", "user", "created_at"
        ]


class CaseHistorySerializer(serializers.ModelSerializer):
    changed_by = UserSerializer(read_only=True)

    class Meta:
        model = CaseHistory
        fields = [
            "id", "from_status", "to_status", "changed_by", "notes", "created_at"
        ]


class CaseSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)
    approved_by = UserSerializer(read_only=True)
    lead_detective = UserSerializer(read_only=True)
    officers = UserSerializer(many=True, read_only=True)
    officer_ids = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        many=True,
        write_only=True,
        required=False,
        source="officers"
    )
    origin_complaint = ComplaintSerializer(read_only=True)
    origin_complaint_id = serializers.PrimaryKeyRelatedField(
        queryset=Case.objects.none(),
        write_only=True,
        required=False,
        source="origin_complaint"
    )
    history = CaseHistorySerializer(many=True, read_only=True)
    witnesses = CrimeSceneWitnessSerializer(many=True, read_only=True)
    status = serializers.CharField(read_only=True)
    case_number = serializers.CharField(read_only=True)

    class Meta:
        model = Case
        fields = [
            "id", "case_number", "title", "summary", "status", "origin",
            "crime_severity", "crime_scene_time", "crime_scene_location",
            "detective_board",
            "created_by", "approved_by", "lead_detective",
            "officers", "officer_ids",
            "origin_complaint", "origin_complaint_id",
            "history", "witnesses",
            "created_at", "updated_at",
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Fix the queryset for origin_complaint
        from apps.complaints.models import Complaint
        self.fields["origin_complaint_id"].queryset = Complaint.objects.all()

    def create(self, validated_data):
        officers = validated_data.pop("officers", [])
        case = Case.objects.create(
            created_by=self.context["request"].user,
            **validated_data
        )
        case.officers.set(officers)
        return case


class CaseTransitionSerializer(serializers.Serializer):
    """Serializer for case state transitions."""
    
    notes = serializers.CharField(required=False, allow_blank=True)
    target_user_id = serializers.IntegerField(required=False)

    def validate_target_user_id(self, value):
        if value and not User.objects.filter(id=value).exists():
            raise serializers.ValidationError("User not found.")
        return value


class CrimeSceneCaseSerializer(serializers.Serializer):
    """Serializer for creating case from crime scene."""
    
    title = serializers.CharField(max_length=255)
    summary = serializers.CharField(required=False, allow_blank=True)
    crime_severity = serializers.ChoiceField(choices=CrimeSeverity.choices)
    crime_scene_time = serializers.DateTimeField()
    crime_scene_location = serializers.CharField(max_length=255)
    witnesses = CrimeSceneWitnessSerializer(many=True, required=False)


class DetectiveBoardSerializer(serializers.Serializer):
    """Serializer for detective board updates."""
    
    layout = serializers.JSONField(help_text="Board layout with item positions")
    connections = serializers.JSONField(
        required=False,
        help_text="Connections between items (red lines)"
    )
