import uuid
from django.conf import settings
from django.db import models

from apps.common.models import TimeStampedModel


class TipStatus(models.TextChoices):
    """Status of a tip/information submission."""
    
    SUBMITTED = "submitted", "Submitted"
    OFFICER_REVIEW = "officer_review", "Under Officer Review"
    OFFICER_REJECTED = "officer_rejected", "Rejected by Officer"
    DETECTIVE_REVIEW = "detective_review", "Under Detective Review"
    DETECTIVE_REJECTED = "detective_rejected", "Rejected by Detective"
    APPROVED = "approved", "Approved"
    REWARD_CLAIMED = "reward_claimed", "Reward Claimed"


class Tip(TimeStampedModel):
    """
    Information/tip submitted by regular users about cases or suspects.
    
    Flow:
    1. User submits tip about a case/suspect
    2. Police officer reviews (initial filter)
    3. If valid, forwarded to case detective
    4. If detective approves, unique reward code is generated
    5. User can claim reward with national_id + code
    """
    
    status = models.CharField(
        max_length=20,
        choices=TipStatus.choices,
        default=TipStatus.SUBMITTED,
    )
    
    # Who submitted
    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="tips_submitted",
    )
    
    # What it's about
    case = models.ForeignKey(
        "cases.Case",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="tips",
    )
    suspect = models.ForeignKey(
        "suspects.Suspect",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="tips",
    )
    
    # Tip content
    title = models.CharField(max_length=255)
    description = models.TextField()
    
    # Review tracking
    reviewed_by_officer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="tips_reviewed_as_officer",
    )
    officer_review_date = models.DateTimeField(null=True, blank=True)
    officer_notes = models.TextField(blank=True)
    
    reviewed_by_detective = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="tips_reviewed_as_detective",
    )
    detective_review_date = models.DateTimeField(null=True, blank=True)
    detective_notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Tip #{self.pk}: {self.title}"


class RewardCode(TimeStampedModel):
    """
    Unique reward code generated for approved tips.
    Used for in-person reward claim verification.
    """
    
    code = models.CharField(
        max_length=36,
        unique=True,
        editable=False,
    )
    tip = models.OneToOneField(
        Tip,
        on_delete=models.CASCADE,
        related_name="reward_code",
    )
    
    # Reward details
    amount = models.PositiveIntegerField(help_text="Reward amount in Rials")
    
    # Claim tracking
    is_claimed = models.BooleanField(default=False)
    claimed_at = models.DateTimeField(null=True, blank=True)
    claimed_by_officer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="rewards_processed",
        help_text="Officer who processed the reward claim"
    )
    
    # Expiry
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Reward {self.code} - {self.amount:,} Rials"

    def save(self, *args, **kwargs):
        if not self.code:
            self.code = self._generate_code()
        super().save(*args, **kwargs)

    def _generate_code(self):
        """Generate unique reward code."""
        return uuid.uuid4().hex[:12].upper()

    @property
    def recipient(self):
        """Get the person who submitted the tip."""
        return self.tip.submitted_by
