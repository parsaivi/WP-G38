from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import serializers

from apps.accounts.serializers import UserSerializer
from .models import Evidence, EvidenceAttachment, EvidenceStatus, EvidenceType, Testimony

User = get_user_model()


class EvidenceAttachmentSerializer(serializers.ModelSerializer):
    uploaded_by = UserSerializer(read_only=True)

    class Meta:
        model = EvidenceAttachment
        fields = [
            "id", "file", "attachment_type", "description",
            "uploaded_by", "created_at"
        ]
        read_only_fields = ["uploaded_by"]


class TestimonySerializer(serializers.ModelSerializer):
    witness = UserSerializer(read_only=True)
    witness_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        write_only=True,
        required=False,
        source="witness"
    )
    interviewer = UserSerializer(read_only=True)

    class Meta:
        model = Testimony
        fields = [
            "id", "witness", "witness_id", "witness_name",
            "transcription", "recorded_at", "interviewer", "created_at"
        ]
        read_only_fields = ["interviewer"]


class EvidenceSerializer(serializers.ModelSerializer):
    collected_by = UserSerializer(read_only=True)
    verified_by = UserSerializer(read_only=True)
    attachments = EvidenceAttachmentSerializer(many=True, read_only=True)
    testimony_detail = TestimonySerializer(read_only=True)

    class Meta:
        model = Evidence
        fields = [
            "id", "case", "evidence_type", "status",
            "title", "description", "collected_by",
            "collection_date", "location_found",
            "metadata", "lab_result",
            "verified_by", "verified_at",
            "attachments", "testimony_detail",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "collected_by", "verified_by", "verified_at", "status"
        ]

    def validate(self, attrs):
        evidence_type = attrs.get("evidence_type")
        metadata = attrs.get("metadata", {})
        
        # Validate vehicle evidence constraint
        if evidence_type == EvidenceType.VEHICLE:
            plate = metadata.get("plate", "").strip()
            serial = metadata.get("serial_number", "").strip()
            
            has_plate = bool(plate)
            has_serial = bool(serial)
            
            if has_plate and has_serial:
                raise serializers.ValidationError({
                    "metadata": "Vehicle evidence must have either 'plate' OR 'serial_number', not both."
                })
            if not has_plate and not has_serial:
                raise serializers.ValidationError({
                    "metadata": "Vehicle evidence must have either 'plate' OR 'serial_number'."
                })
            if not metadata.get("model"):
                raise serializers.ValidationError({
                    "metadata": "Vehicle evidence must have 'model' in metadata."
                })
            if not metadata.get("color"):
                raise serializers.ValidationError({
                    "metadata": "Vehicle evidence must have 'color' in metadata."
                })
        
        # Validate ID document has at least owner name
        if evidence_type == EvidenceType.ID_DOCUMENT:
            if not metadata.get("owner_name"):
                raise serializers.ValidationError({
                    "metadata": "ID document evidence must have 'owner_name' in metadata."
                })
        
        return attrs

    def create(self, validated_data):
        validated_data["collected_by"] = self.context["request"].user
        return super().create(validated_data)


class EvidenceCreateWithTestimonySerializer(serializers.Serializer):
    """Combined serializer for creating testimony evidence with details."""
    
    # Evidence fields
    case = serializers.IntegerField()
    title = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True)
    location_found = serializers.CharField(max_length=255, required=False, allow_blank=True)
    collection_date = serializers.DateTimeField(required=False)
    
    # Testimony fields
    witness_id = serializers.IntegerField(required=False)
    witness_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    transcription = serializers.CharField()
    recorded_at = serializers.DateTimeField(required=False)


class VerifyEvidenceSerializer(serializers.Serializer):
    """Serializer for evidence verification."""
    
    status = serializers.ChoiceField(
        choices=[EvidenceStatus.VERIFIED, EvidenceStatus.REJECTED]
    )
    notes = serializers.CharField(required=False, allow_blank=True)


class AddLabResultSerializer(serializers.Serializer):
    """Serializer for adding lab/coronary results to biological evidence."""
    
    lab_result = serializers.CharField()
