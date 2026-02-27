from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.accounts.serializers import UserSerializer
from .models import Complaint, ComplaintHistory, ComplaintStatus

User = get_user_model()


class ComplaintHistorySerializer(serializers.ModelSerializer):
    changed_by = UserSerializer(read_only=True)

    class Meta:
        model = ComplaintHistory
        fields = [
            "id", "from_status", "to_status", "changed_by", "message", "created_at"
        ]


class ComplaintSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)
    assigned_cadet = UserSerializer(read_only=True)
    assigned_officer = UserSerializer(read_only=True)
    complainants = UserSerializer(many=True, read_only=True)
    complainant_ids = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        many=True,
        write_only=True,
        required=False,
        source="complainants"
    )
    history = ComplaintHistorySerializer(many=True, read_only=True)
    status = serializers.CharField(read_only=True)

    class Meta:
        model = Complaint
        fields = [
            "id", "title", "description", "location", "incident_date",
            "crime_severity", "status", "rejection_count", "last_rejection_message",
            "created_by", "assigned_cadet", "assigned_officer",
            "complainants", "complainant_ids", "history",
            "created_at", "updated_at",
        ]

    def validate(self, attrs):
        request = self.context.get("request")
        if request and request.user.is_blocked_from_complaints:
            raise serializers.ValidationError(
                "You are blocked from submitting complaints due to 3 invalid submissions."
            )
        return attrs

    def create(self, validated_data):
        complainants = validated_data.pop("complainants", [])
        complaint = Complaint.objects.create(
            created_by=self.context["request"].user,
            **validated_data
        )
        complaint.complainants.set(complainants)
        # Add creator as complainant if not already
        if self.context["request"].user not in complainants:
            complaint.complainants.add(self.context["request"].user)
        return complaint


class ComplaintTransitionSerializer(serializers.Serializer):
    """Serializer for complaint state transitions."""
    
    message = serializers.CharField(required=False, allow_blank=True)
    target_user_id = serializers.IntegerField(required=False)

    def validate_target_user_id(self, value):
        if value and not User.objects.filter(id=value).exists():
            raise serializers.ValidationError("User not found.")
        return value


class AddComplainantSerializer(serializers.Serializer):
    """Serializer for adding additional complainants."""
    
    user_id = serializers.IntegerField()
    approved = serializers.BooleanField(default=False)

    def validate_user_id(self, value):
        if not User.objects.filter(id=value).exists():
            raise serializers.ValidationError("User not found.")
        return value
