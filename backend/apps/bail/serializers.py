from rest_framework import serializers

from apps.accounts.serializers import UserSerializer
from apps.suspects.models import Suspect, SuspectStatus

from .models import Bail, BailStatus


class BailListSerializer(serializers.ModelSerializer):
    """Public list: id, suspect summary, amount, fine_amount, status, created_at."""
    suspect_detail = serializers.SerializerMethodField()
    created_by = UserSerializer(read_only=True)

    class Meta:
        model = Bail
        fields = [
            "id", "suspect", "suspect_detail", "amount", "fine_amount",
            "status", "created_by", "paid_at", "created_at",
        ]

    def get_suspect_detail(self, obj):
        return {
            "id": obj.suspect.id,
            "full_name": obj.suspect.full_name,
            "aliases": obj.suspect.aliases or "",
            "status": obj.suspect.status,
        }


class BailSerializer(serializers.ModelSerializer):
    """Full bail detail for retrieve."""
    suspect_detail = serializers.SerializerMethodField()
    created_by = UserSerializer(read_only=True)

    class Meta:
        model = Bail
        fields = [
            "id", "suspect", "suspect_detail", "amount", "fine_amount",
            "status", "created_by", "paid_at", "zibal_track_id",
            "created_at", "updated_at",
        ]

    def get_suspect_detail(self, obj):
        return {
            "id": obj.suspect.id,
            "full_name": obj.suspect.full_name,
            "aliases": obj.suspect.aliases or "",
            "status": obj.suspect.status,
        }


def _is_eligible_for_bail(suspect):
    """
    Doc: level 2 and 3 suspects (ARRESTED) or level 3 convicts (CONVICTED).
    max_crime_severity: 1 = level 3 minor, 2 = level 2 major, 3 = level 1, 4 = critical.
    So eligible: ARRESTED and max_crime_severity in (1, 2); or CONVICTED and max_crime_severity == 1.
    """
    severity = suspect.max_crime_severity
    if suspect.status == SuspectStatus.ARRESTED:
        return severity in (1, 2)
    if suspect.status == SuspectStatus.CONVICTED:
        return severity == 1
    return False


class BailCreateSerializer(serializers.ModelSerializer):
    """Create bail (Sergeant only). Validates eligibility and single pending per suspect."""
    class Meta:
        model = Bail
        fields = ["suspect", "amount", "fine_amount"]

    def validate_suspect(self, value):
        if not _is_eligible_for_bail(value):
            raise serializers.ValidationError(
                "Suspect is not eligible for bail. "
                "Eligible: ARRESTED with crime level 2 or 3, or CONVICTED with crime level 3."
            )
        if Bail.objects.filter(suspect=value, status=BailStatus.PENDING).exists():
            raise serializers.ValidationError(
                "This suspect already has a pending bail."
            )
        return value

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Amount must be positive.")
        return value

    def validate_fine_amount(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("Fine amount cannot be negative.")
        return value or 0


class InitiatePaymentSerializer(serializers.Serializer):
    """Request body for starting payment (mock or real gateway)."""
    return_url = serializers.URLField(required=True)
