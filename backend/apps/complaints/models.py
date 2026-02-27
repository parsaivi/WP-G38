from django.conf import settings
from django.db import models
from django_fsm import FSMField, RETURN_VALUE, transition

from apps.common.models import TimeStampedModel, CrimeSeverity


class ComplaintStatus(models.TextChoices):
    """Complaint workflow states."""
    
    DRAFT = "draft", "Draft"
    SUBMITTED = "submitted", "Submitted by Complainant"
    CADET_REVIEW = "cadet_review", "Under Cadet Review"
    RETURNED_TO_COMPLAINANT = "returned", "Returned to Complainant"
    OFFICER_REVIEW = "officer_review", "Under Officer Review"
    RETURNED_TO_CADET = "returned_to_cadet", "Returned to Cadet"
    APPROVED = "approved", "Approved"
    REJECTED = "rejected", "Rejected"
    INVALIDATED = "invalidated", "Invalidated (3 strikes)"


class Complaint(TimeStampedModel):
    """
    Complaint model with state machine for workflow management.
    
    Flow:
    1. Complainant creates and submits complaint
    2. Cadet reviews: approves → Officer, or rejects → back to Complainant
    3. Officer reviews: approves → Case creation, or rejects → back to Cadet
    4. If complainant gets 3 rejections, complaint is invalidated
    """
    
    status = FSMField(
        default=ComplaintStatus.DRAFT,
        choices=ComplaintStatus.choices,
        protected=True,
    )
    
    # Relationships
    complainants = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="complaints_made",
        blank=True,
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="complaints_created",
    )
    assigned_cadet = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="complaints_as_cadet",
    )
    assigned_officer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="complaints_as_officer",
    )
    
    # Complaint details
    title = models.CharField(max_length=255)
    description = models.TextField()
    location = models.CharField(max_length=255, blank=True)
    incident_date = models.DateTimeField(null=True, blank=True)
    crime_severity = models.IntegerField(
        choices=CrimeSeverity.choices,
        default=CrimeSeverity.LEVEL_3,
    )
    
    # Rejection tracking
    rejection_count = models.PositiveSmallIntegerField(default=0)
    last_rejection_message = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]
        permissions = [
            ("can_submit_complaint", "Can submit complaint"),
            ("can_review_as_cadet", "Can review complaints as cadet"),
            ("can_review_as_officer", "Can review complaints as officer"),
            ("can_approve_complaint", "Can approve complaints"),
        ]

    def __str__(self):
        return f"Complaint #{self.pk}: {self.title}"

    # State transitions
    @transition(field=status, source=ComplaintStatus.DRAFT, target=ComplaintStatus.SUBMITTED)
    def submit(self):
        """Complainant submits the complaint."""
        pass

    @transition(
        field=status,
        source=ComplaintStatus.SUBMITTED,
        target=ComplaintStatus.CADET_REVIEW
    )
    def assign_to_cadet(self, cadet_user):
        """Assign complaint to a cadet for initial review."""
        self.assigned_cadet = cadet_user

    @transition(
        field=status,
        source=[ComplaintStatus.CADET_REVIEW, ComplaintStatus.RETURNED_TO_CADET],
        target=RETURN_VALUE(
            ComplaintStatus.RETURNED_TO_COMPLAINANT,
            ComplaintStatus.INVALIDATED,
        ),
    )
    def return_to_complainant(self, message: str):
        """Cadet returns complaint to complainant for corrections."""
        self.last_rejection_message = message
        self.rejection_count += 1
        if self.rejection_count >= 3:
            self._invalidate()
            return ComplaintStatus.INVALIDATED
        return ComplaintStatus.RETURNED_TO_COMPLAINANT

    @transition(
        field=status,
        source=[ComplaintStatus.RETURNED_TO_COMPLAINANT, ComplaintStatus.DRAFT],
        target=ComplaintStatus.INVALIDATED,
    )
    def invalidate(self):
        """Invalidate complaint after 3 strikes (standalone transition)."""
        self._invalidate()

    def _invalidate(self):
        """Update complainant strike counts and block if needed."""
        for complainant in self.complainants.all():
            complainant.invalid_complaints_count += 1
            if complainant.invalid_complaints_count >= 3:
                complainant.is_blocked_from_complaints = True
            complainant.save()

    @transition(
        field=status,
        source=ComplaintStatus.RETURNED_TO_COMPLAINANT,
        target=ComplaintStatus.SUBMITTED
    )
    def resubmit(self):
        """Complainant resubmits after corrections."""
        pass

    @transition(
        field=status,
        source=[ComplaintStatus.CADET_REVIEW, ComplaintStatus.RETURNED_TO_CADET],
        target=ComplaintStatus.OFFICER_REVIEW
    )
    def escalate_to_officer(self, officer_user):
        """Cadet approves and escalates to officer."""
        self.assigned_officer = officer_user

    @transition(
        field=status,
        source=ComplaintStatus.OFFICER_REVIEW,
        target=ComplaintStatus.RETURNED_TO_CADET
    )
    def return_to_cadet(self, message: str):
        """Officer returns to cadet for further review."""
        self.last_rejection_message = message

    @transition(
        field=status,
        source=ComplaintStatus.OFFICER_REVIEW,
        target=ComplaintStatus.APPROVED
    )
    def approve(self):
        """Officer approves the complaint (case will be created)."""
        pass

    @transition(
        field=status,
        source=[
            ComplaintStatus.CADET_REVIEW,
            ComplaintStatus.OFFICER_REVIEW,
            ComplaintStatus.RETURNED_TO_CADET
        ],
        target=ComplaintStatus.REJECTED
    )
    def reject(self, message: str):
        """Permanently reject the complaint."""
        self.last_rejection_message = message


class ComplaintHistory(TimeStampedModel):
    """Audit log for complaint state transitions."""
    
    complaint = models.ForeignKey(
        Complaint,
        on_delete=models.CASCADE,
        related_name="history",
    )
    from_status = models.CharField(max_length=50, choices=ComplaintStatus.choices)
    to_status = models.CharField(max_length=50, choices=ComplaintStatus.choices)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
    )
    message = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name_plural = "Complaint histories"

    def __str__(self):
        return f"{self.complaint} : {self.from_status} → {self.to_status}"
