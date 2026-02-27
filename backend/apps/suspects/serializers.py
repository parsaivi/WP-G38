from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.accounts.serializers import UserSerializer
from .models import CaseSuspect, Interrogation, Suspect, SuspectStatus

User = get_user_model()


class CaseSuspectSerializer(serializers.ModelSerializer):
    added_by = UserSerializer(read_only=True)
    suspect_detail = serializers.SerializerMethodField()

    class Meta:
        model = CaseSuspect
        fields = [
            "id", "case", "suspect", "suspect_detail", "role", "notes", "added_by", "created_at"
        ]
        read_only_fields = ["added_by"]

    def get_suspect_detail(self, obj):
        return {
            "id": obj.suspect.id,
            "full_name": obj.suspect.full_name,
            "aliases": obj.suspect.aliases,
            "status": obj.suspect.status,
            "description": obj.suspect.description,
            "detective_guilt_score": obj.suspect.detective_guilt_score,
            "sergeant_guilt_score": obj.suspect.sergeant_guilt_score,
            "captain_decision": obj.suspect.captain_decision or "",
            "chief_decision": obj.suspect.chief_decision or "",
        }


class InterrogationSerializer(serializers.ModelSerializer):
    conducted_by = UserSerializer(read_only=True)

    class Meta:
        model = Interrogation
        fields = [
            "id", "suspect", "case", "conducted_by",
            "started_at", "ended_at", "location",
            "transcription", "notes", "created_at"
        ]
        read_only_fields = ["conducted_by"]


class SuspectSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        write_only=True,
        required=False,
        source="user"
    )
    case_links = CaseSuspectSerializer(many=True, read_only=True)
    interrogations = InterrogationSerializer(many=True, read_only=True)
    status = serializers.CharField(read_only=True)
    
    # Computed fields
    days_wanted = serializers.IntegerField(read_only=True)
    most_wanted_rank = serializers.IntegerField(read_only=True)
    reward_amount = serializers.IntegerField(read_only=True)
    max_crime_severity = serializers.IntegerField(read_only=True)

    class Meta:
        model = Suspect
        fields = [
            "id", "full_name", "aliases", "photo", "description",
            "status", "user", "user_id",
            "wanted_since", "arrested_at", "last_known_location",
            "detective_guilt_score", "sergeant_guilt_score",
            "captain_decision", "chief_decision",
            "case_links", "interrogations",
            "days_wanted", "most_wanted_rank", "reward_amount", "max_crime_severity",
            "created_at", "updated_at",
        ]


class SuspectListSerializer(serializers.ModelSerializer):
    """Simplified serializer for list views."""
    
    days_wanted = serializers.IntegerField(read_only=True)
    most_wanted_rank = serializers.IntegerField(read_only=True)
    reward_amount = serializers.IntegerField(read_only=True)

    class Meta:
        model = Suspect
        fields = [
            "id", "full_name", "aliases", "photo", "status",
            "wanted_since", "last_known_location",
            "days_wanted", "most_wanted_rank", "reward_amount",
        ]


class MostWantedSerializer(serializers.ModelSerializer):
    """Serializer for public Most Wanted page."""
    
    days_wanted = serializers.IntegerField(read_only=True)
    most_wanted_rank = serializers.IntegerField(read_only=True)
    reward_amount = serializers.IntegerField(read_only=True)
    max_crime_severity = serializers.IntegerField(read_only=True)

    class Meta:
        model = Suspect
        fields = [
            "id", "full_name", "aliases", "photo", "description",
            "last_known_location", "wanted_since",
            "days_wanted", "most_wanted_rank", "reward_amount",
            "max_crime_severity",
        ]


class GuildScoreSerializer(serializers.Serializer):
    """Serializer for submitting guilt scores."""
    
    score = serializers.IntegerField(min_value=1, max_value=10)
    notes = serializers.CharField(required=False, allow_blank=True)


class CaptainDecisionSerializer(serializers.Serializer):
    """Serializer for captain's decision."""
    
    decision = serializers.CharField()
    approve_for_trial = serializers.BooleanField(default=False)


class LinkSuspectToCaseSerializer(serializers.Serializer):
    """Serializer for linking suspect to case."""
    
    case_id = serializers.IntegerField()
    role = serializers.ChoiceField(
        choices=CaseSuspect.Role.choices,
        default=CaseSuspect.Role.PRIMARY
    )
    notes = serializers.CharField(required=False, allow_blank=True)
