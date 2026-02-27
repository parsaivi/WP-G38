from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.common.models import TimeStampedModel


class BailStatus(models.TextChoices):
    """Bail payment status."""
    PENDING = "pending", "Pending"
    PAID = "paid", "Paid"
    CANCELLED = "cancelled", "Cancelled"


class Bail(TimeStampedModel):
    """
    Bail assigned by a sergeant to a suspect for release from detention.
    Eligible: ARRESTED suspects with crime level 2 or 3; CONVICTED (level 3) with sergeant approval.
    """
    suspect = models.ForeignKey(
        "suspects.Suspect",
        on_delete=models.CASCADE,
        related_name="bails",
    )
    amount = models.PositiveIntegerField(help_text="Bail amount in Rials")
    fine_amount = models.PositiveIntegerField(
        default=0,
        help_text="Optional fine in Rials (e.g. for level 3 convicts)",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="bails_created",
    )
    status = models.CharField(
        max_length=20,
        choices=BailStatus.choices,
        default=BailStatus.PENDING,
    )
    paid_at = models.DateTimeField(null=True, blank=True)
    zibal_track_id = models.BigIntegerField(
        null=True,
        blank=True,
        help_text="Zibal payment session trackId",
    )

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Bail"
        verbose_name_plural = "Bails"

    def __str__(self):
        return f"Bail #{self.pk} - {self.suspect.full_name} ({self.amount:,} Rials)"

    def clean(self):
        from django.core.exceptions import ValidationError
        if self.status == BailStatus.PENDING:
            qs = Bail.objects.filter(suspect=self.suspect, status=BailStatus.PENDING)
            if self.pk:
                qs = qs.exclude(pk=self.pk)
            if qs.exists():
                raise ValidationError(
                    {"suspect": "This suspect already has a pending bail."}
                )

