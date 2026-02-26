from django.conf import settings
from django.db import models
from django.core.exceptions import ValidationError

from apps.common.models import TimeStampedModel


class EvidenceType(models.TextChoices):
    """Types of evidence as defined in the spec."""
    
    TESTIMONY = "testimony", "Testimony / Witness Statement"
    BIOLOGICAL = "biological", "Biological / Medical Evidence"
    VEHICLE = "vehicle", "Vehicle Evidence"
    ID_DOCUMENT = "id_document", "Identification Document"
    OTHER = "other", "Other Evidence"


class EvidenceStatus(models.TextChoices):
    """Evidence verification status."""
    
    PENDING = "pending", "Pending Review"
    VERIFIED = "verified", "Verified"
    REJECTED = "rejected", "Rejected"
    PROCESSING = "processing", "Processing (Lab/Coronary)"


class Evidence(TimeStampedModel):
    """
    Base evidence model supporting all 5 evidence types.
    Uses JSONField for type-specific metadata to maintain flexibility.
    
    Evidence Types:
    1. Testimony: Witness statements with optional audio/video
    2. Biological/Medical: Blood, hair, fingerprints with lab results
    3. Vehicle: Vehicle info with plate XOR serial constraint
    4. ID Document: Dynamic key-value fields
    5. Other: Simple title/description
    """
    
    case = models.ForeignKey(
        "cases.Case",
        on_delete=models.CASCADE,
        related_name="evidence",
    )
    evidence_type = models.CharField(
        max_length=20,
        choices=EvidenceType.choices,
    )
    status = models.CharField(
        max_length=20,
        choices=EvidenceStatus.choices,
        default=EvidenceStatus.PENDING,
    )
    
    # Common fields
    title = models.CharField(max_length=255)
    description = models.TextField()
    collected_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="evidence_collected",
    )
    collection_date = models.DateTimeField(null=True, blank=True)
    location_found = models.CharField(max_length=255, blank=True)
    
    # Type-specific metadata stored as JSON
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Type-specific data (e.g., plate/serial for vehicle, key-values for ID)"
    )
    
    # For biological evidence - result from coronary/lab
    lab_result = models.TextField(
        blank=True,
        help_text="Lab/Coronary analysis result (for biological evidence)"
    )
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="evidence_verified",
    )
    verified_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name_plural = "Evidence"
        permissions = [
            ("can_verify_evidence", "Can verify evidence"),
            ("can_add_lab_results", "Can add lab results"),
        ]

    def __str__(self):
        return f"{self.get_evidence_type_display()}: {self.title}"

    def clean(self):
        """Validate type-specific constraints."""
        if self.evidence_type == EvidenceType.VEHICLE:
            self._validate_vehicle_evidence()

    def _validate_vehicle_evidence(self):
        """Validate vehicle evidence: plate XOR serial (not both, not neither)."""
        plate = self.metadata.get("plate", "").strip()
        serial = self.metadata.get("serial_number", "").strip()
        
        has_plate = bool(plate)
        has_serial = bool(serial)
        
        if has_plate and has_serial:
            raise ValidationError({
                "metadata": "Vehicle evidence must have either 'plate' OR 'serial_number', not both."
            })
        if not has_plate and not has_serial:
            raise ValidationError({
                "metadata": "Vehicle evidence must have either 'plate' OR 'serial_number'."
            })

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class EvidenceAttachment(TimeStampedModel):
    """
    File attachments for evidence (images, audio, video).
    Supports testimonies with multimedia and biological evidence with images.
    """
    
    class AttachmentType(models.TextChoices):
        IMAGE = "image", "Image"
        AUDIO = "audio", "Audio"
        VIDEO = "video", "Video"
        DOCUMENT = "document", "Document"
    
    evidence = models.ForeignKey(
        Evidence,
        on_delete=models.CASCADE,
        related_name="attachments",
    )
    file = models.FileField(upload_to="evidence_attachments/%Y/%m/")
    attachment_type = models.CharField(
        max_length=20,
        choices=AttachmentType.choices,
    )
    description = models.CharField(max_length=255, blank=True)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
    )

    def __str__(self):
        return f"{self.get_attachment_type_display()} for {self.evidence.title}"


class Testimony(TimeStampedModel):
    """
    Detailed testimony/witness statement linked to evidence.
    Stores the transcription and links to witness.
    """
    
    evidence = models.OneToOneField(
        Evidence,
        on_delete=models.CASCADE,
        related_name="testimony_detail",
    )
    witness = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="testimonies",
    )
    witness_name = models.CharField(
        max_length=255,
        blank=True,
        help_text="Name if witness is not a registered user"
    )
    transcription = models.TextField(help_text="Full text of the testimony")
    recorded_at = models.DateTimeField(null=True, blank=True)
    interviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="interviews_conducted",
    )

    class Meta:
        verbose_name_plural = "Testimonies"

    def __str__(self):
        name = self.witness.get_full_name() if self.witness else self.witness_name
        return f"Testimony by {name}"
