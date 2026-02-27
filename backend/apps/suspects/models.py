from datetime import timedelta
from django.conf import settings
from django.db import models
from django.utils import timezone
from django_fsm import FSMField, transition

from apps.common.models import TimeStampedModel, CrimeSeverity


class SuspectStatus(models.TextChoices):
    """Suspect status states."""
    
    IDENTIFIED = "identified", "Identified"
    UNDER_INVESTIGATION = "under_investigation", "Under Investigation"
    UNDER_PURSUIT = "under_pursuit", "Under Pursuit (Wanted)"
    MOST_WANTED = "most_wanted", "Most Wanted"
    ARRESTED = "arrested", "Arrested"
    RELEASED_ON_BAIL = "released_on_bail", "Released on Bail"
    CLEARED = "cleared", "Cleared"
    CONVICTED = "convicted", "Convicted"


class Suspect(TimeStampedModel):
    """
    Suspect model with status tracking and Most Wanted ranking.
    
    Ranking Formula (per spec):
    - Rank = max(Lj) * max(Di)
      - max(Lj): Maximum days wanted for any single case
      - max(Di): Maximum crime severity level (1-4)
    
    Reward Formula:
    - Reward = max(Lj) * max(Di) * 20,000,000 Rials
    """
    
    status = FSMField(
        default=SuspectStatus.IDENTIFIED,
        choices=SuspectStatus.choices,
        protected=True,
    )
    
    # Identity
    full_name = models.CharField(max_length=255)
    aliases = models.CharField(max_length=500, blank=True)
    photo = models.ImageField(upload_to="suspects/", null=True, blank=True)
    description = models.TextField(blank=True)
    
    # Link to user if suspect has an account
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="suspect_profile",
    )
    
    # Tracking
    wanted_since = models.DateTimeField(null=True, blank=True)
    arrested_at = models.DateTimeField(null=True, blank=True)
    last_known_location = models.CharField(max_length=255, blank=True)
    
    # Investigation scores (1-10)
    detective_guilt_score = models.PositiveSmallIntegerField(
        null=True, blank=True,
        help_text="Detective's guilt probability score (1-10)"
    )
    sergeant_guilt_score = models.PositiveSmallIntegerField(
        null=True, blank=True,
        help_text="Sergeant's guilt probability score (1-10)"
    )
    captain_decision = models.TextField(
        blank=True,
        help_text="Captain's final decision notes"
    )
    chief_decision = models.TextField(
        blank=True,
        help_text="Chief's decision for critical cases"
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.full_name} ({self.get_status_display()})"

    @property
    def days_wanted(self) -> int:
        """Days since marked as wanted."""
        if not self.wanted_since:
            return 0
        return (timezone.now() - self.wanted_since).days

    @property
    def is_most_wanted_eligible(self) -> bool:
        """Check if suspect should be moved to Most Wanted (after 30 days)."""
        return (
            self.status == SuspectStatus.UNDER_PURSUIT and
            self.days_wanted >= 30
        )

    @property
    def max_crime_severity(self) -> int:
        """
        Get maximum crime severity from all linked cases (open or closed).
        Converts CrimeSeverity (CRITICAL=0..LEVEL_3=3) to doc scale (1..4).
        """
        links = self.case_links.select_related("case").all()
        if not links:
            return 0
        min_severity = min(link.case.crime_severity for link in links)
        # Convert: CRITICAL(0)→4, LEVEL_1(1)→3, LEVEL_2(2)→2, LEVEL_3(3)→1
        return 4 - min_severity

    @property
    def max_days_wanted_for_case(self) -> int:
        """
        Maximum days wanted for any single OPEN case (per doc formula).
        Only considers cases that are not closed.
        """
        if not self.wanted_since:
            return 0
        from apps.cases.models import CaseStatus
        open_cases = self.case_links.select_related("case").exclude(
            case__status__in=[CaseStatus.CLOSED_SOLVED, CaseStatus.CLOSED_UNSOLVED]
        )
        if not open_cases.exists():
            return 0
        return self.days_wanted

    @property
    def most_wanted_rank(self) -> int:
        """
        Calculate Most Wanted rank.
        Rank = max(Lj) * max(Di)
        """
        return self.max_days_wanted_for_case * self.max_crime_severity

    @property
    def reward_amount(self) -> int:
        """
        Calculate reward amount in Rials.
        Reward = max(Lj) * max(Di) * 20,000,000
        """
        return self.most_wanted_rank * 20_000_000

    # State transitions
    @transition(
        field=status,
        source=SuspectStatus.IDENTIFIED,
        target=SuspectStatus.UNDER_INVESTIGATION
    )
    def start_investigation(self):
        """Begin investigating this suspect."""
        pass

    @transition(
        field=status,
        source=SuspectStatus.IDENTIFIED,
        target=SuspectStatus.UNDER_PURSUIT
    )
    def authorize_pursuit(self):
        """Sergeant approved suspect → move from identified to under pursuit (wanted)."""
        self.wanted_since = timezone.now()
        if self.user:
            self.user.is_suspect = True
            self.user.save()

    @transition(
        field=status,
        source=SuspectStatus.UNDER_INVESTIGATION,
        target=SuspectStatus.UNDER_PURSUIT
    )
    def mark_wanted(self):
        """Mark suspect as wanted."""
        self.wanted_since = timezone.now()
        if self.user:
            self.user.is_suspect = True
            self.user.save()

    @transition(
        field=status,
        source=SuspectStatus.UNDER_PURSUIT,
        target=SuspectStatus.MOST_WANTED
    )
    def mark_most_wanted(self):
        """Promote to Most Wanted status."""
        pass

    @transition(
        field=status,
        source=[
            SuspectStatus.UNDER_PURSUIT,
            SuspectStatus.MOST_WANTED,
        ],
        target=SuspectStatus.ARRESTED
    )
    def arrest(self):
        """Mark suspect as arrested."""
        self.arrested_at = timezone.now()

    @transition(
        field=status,
        source=[
            SuspectStatus.IDENTIFIED,
            SuspectStatus.UNDER_INVESTIGATION,
        ],
        target=SuspectStatus.CLEARED
    )
    def clear(self):
        """Clear suspect of suspicion."""
        if self.user:
            self.user.is_suspect = False
            self.user.save()

    @transition(
        field=status,
        source=SuspectStatus.ARRESTED,
        target=SuspectStatus.CONVICTED
    )
    def convict(self):
        """Mark as convicted after trial."""
        if self.user:
            self.user.is_criminal = True
            self.user.save()

    @transition(
        field=status,
        source=[SuspectStatus.ARRESTED, SuspectStatus.CONVICTED],
        target=SuspectStatus.RELEASED_ON_BAIL
    )
    def release_on_bail(self):
        """Release suspect on bail payment (level 2/3 suspects or level 3 convicts)."""
        pass


class CaseSuspect(TimeStampedModel):
    """Link between cases and suspects with role information."""
    
    class Role(models.TextChoices):
        PRIMARY = "primary", "Primary Suspect"
        ACCOMPLICE = "accomplice", "Accomplice"
        WITNESS_TURNED_SUSPECT = "witness_turned", "Witness Turned Suspect"
        PERSON_OF_INTEREST = "poi", "Person of Interest"
    
    case = models.ForeignKey(
        "cases.Case",
        on_delete=models.CASCADE,
        related_name="suspect_links",
    )
    suspect = models.ForeignKey(
        Suspect,
        on_delete=models.CASCADE,
        related_name="case_links",
    )
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.PRIMARY,
    )
    notes = models.TextField(blank=True)
    added_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
    )

    class Meta:
        unique_together = ("case", "suspect")

    def __str__(self):
        return f"{self.suspect.full_name} - {self.case.case_number}"


class Interrogation(TimeStampedModel):
    """Record of interrogation sessions."""
    
    suspect = models.ForeignKey(
        Suspect,
        on_delete=models.CASCADE,
        related_name="interrogations",
    )
    case = models.ForeignKey(
        "cases.Case",
        on_delete=models.CASCADE,
        related_name="interrogations",
    )
    conducted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="interrogations_conducted",
    )
    started_at = models.DateTimeField()
    ended_at = models.DateTimeField(null=True, blank=True)
    location = models.CharField(max_length=255, blank=True)
    transcription = models.TextField(blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-started_at"]

    def __str__(self):
        return f"Interrogation of {self.suspect.full_name} - {self.started_at}"
