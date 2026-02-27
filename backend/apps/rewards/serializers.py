from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import serializers

from apps.accounts.serializers import UserSerializer
from .models import RewardCode, Tip, TipStatus

User = get_user_model()


class RewardCodeSerializer(serializers.ModelSerializer):
    recipient = UserSerializer(read_only=True)

    class Meta:
        model = RewardCode
        fields = [
            "id", "code", "amount", "is_claimed",
            "claimed_at", "expires_at", "recipient", "created_at"
        ]


class TipSerializer(serializers.ModelSerializer):
    submitted_by = UserSerializer(read_only=True)
    reviewed_by_officer = UserSerializer(read_only=True)
    reviewed_by_detective = UserSerializer(read_only=True)
    reward_code = RewardCodeSerializer(read_only=True)

    class Meta:
        model = Tip
        fields = [
            "id", "status", "title", "description",
            "case", "suspect",
            "submitted_by",
            "reviewed_by_officer", "officer_review_date", "officer_notes",
            "reviewed_by_detective", "detective_review_date", "detective_notes",
            "reward_code",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "status", "submitted_by",
            "reviewed_by_officer", "officer_review_date",
            "reviewed_by_detective", "detective_review_date",
        ]

    def validate(self, attrs):
        if not attrs.get("case") and not attrs.get("suspect"):
            raise serializers.ValidationError(
                "Tip must be about a case or a suspect (or both)."
            )
        return attrs


class TipReviewSerializer(serializers.Serializer):
    """Serializer for reviewing tips."""
    
    approved = serializers.BooleanField()
    notes = serializers.CharField(required=False, allow_blank=True)


class ClaimRewardSerializer(serializers.Serializer):
    """Serializer for claiming rewards."""
    
    national_id = serializers.CharField(max_length=10)
    reward_code = serializers.CharField(max_length=36)

    def validate(self, attrs):
        national_id = attrs["national_id"]
        code = attrs["reward_code"]
        
        try:
            reward = RewardCode.objects.get(code=code)
        except RewardCode.DoesNotExist:
            raise serializers.ValidationError({"reward_code": "Invalid reward code."})
        
        if reward.is_claimed:
            raise serializers.ValidationError({"reward_code": "Reward already claimed."})
        
        if reward.expires_at and reward.expires_at < timezone.now():
            raise serializers.ValidationError({"reward_code": "Reward code has expired."})
        
        # Verify national_id matches tip submitter
        if reward.recipient.national_id != national_id:
            raise serializers.ValidationError({
                "national_id": "National ID does not match reward recipient."
            })
        
        attrs["reward"] = reward
        return attrs


class RewardLookupSerializer(serializers.Serializer):
    """Serializer for looking up reward by national_id + code."""
    
    national_id = serializers.CharField(max_length=10)
    reward_code = serializers.CharField(max_length=36)
