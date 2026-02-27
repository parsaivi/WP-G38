import uuid
from django.conf import settings
from django.db import models
from django_fsm import FSMField, transition

from apps.common.models import TimeStampedModel, CrimeSeverity
from apps.suspects.models import SuspectStatus


class CaseStatus(models.TextChoices):
    """Case workflow states."""
    
    CREATED = "created", "Created"
    PENDING_APPROVAL = "pending_approval", "Pending Superior Approval"
    INVESTIGATION = "investigation", "Under Investigation"
    SUSPECT_IDENTIFIED = "suspect_identified", "Suspect Identified"
    INTERROGATION = "interrogation", "Interrogation"
    PENDING_CAPTAIN = "pending_captain", "Pending Captain Decision"
    PENDING_CHIEF = "pending_chief", "Pending Chief Decision (Critical)"
    TRIAL = "trial", "In Trial"
    CLOSED_SOLVED = "closed_solved", "Closed - Solved"
    CLOSED_UNSOLVED = "closed_unsolved", "Closed - Unsolved"


class CaseOrigin(models.TextChoices):
    """How the case was initiated."""
    
    COMPLAINT = "complaint", "From Complaint"
    CRIME_SCENE = "crime_scene", "From Crime Scene Report"


class Case(TimeStampedModel):
    """
    Case model with state machine for investigation workflow.
    
    Cases can originate from:
    1. Approved complaints (via complainant flow)
    2. Crime scene reports (via police officer)
    """
    
    case_number = models.CharField(
        max_length=32,
        unique=True,
        editable=False,
    )
    status = FSMField(
        default=CaseStatus.CREATED,
        choices=CaseStatus.choices,
        protected=True,
    )
    origin = models.CharField(
        max_length=20,
        choices=CaseOrigin.choices,
        default=CaseOrigin.COMPLAINT,
    )
    
    # Relationships
    origin_complaint = models.ForeignKey(
        "complaints.Complaint",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cases",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="cases_created",
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cases_approved",
        help_text="Superior who approved crime scene case"
    )
    lead_detective = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cases_led",
    )
    officers = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="cases_assigned",
        blank=True,
    )
    
    # Case details
    title = models.CharField(max_length=255)
    summary = models.TextField(blank=True)
    crime_severity = models.IntegerField(
        choices=CrimeSeverity.choices,
        default=CrimeSeverity.LEVEL_3,
    )
    
    # Crime scene details (for crime scene origin)
    crime_scene_time = models.DateTimeField(null=True, blank=True)
    crime_scene_location = models.CharField(max_length=255, blank=True)
    
    # Detective Board data (stored as JSON for flexibility)
    detective_board = models.JSONField(
        default=dict,
        blank=True,
        help_text="Detective board layout data (positions, connections)"
    )

    class Meta:
        ordering = ["-created_at"]
        permissions = [
            ("can_create_from_crime_scene", "Can create case from crime scene"),
            ("can_approve_case", "Can approve cases"),
            ("can_assign_detective", "Can assign detective to case"),
            ("can_identify_suspect", "Can identify suspects"),
            ("can_close_case", "Can close cases"),
        ]

    def __str__(self):
        return f"Case {self.case_number}: {self.title}"

    def save(self, *args, **kwargs):
        if not self.case_number:
            self.case_number = self._generate_case_number()
        super().save(*args, **kwargs)

    def _generate_case_number(self):
        """Generate unique case number: CASE-YYYYMMDD-XXXX"""
        from django.utils import timezone
        date_str = timezone.now().strftime("%Y%m%d")
        short_uuid = uuid.uuid4().hex[:4].upper()
        return f"CASE-{date_str}-{short_uuid}"

    # Helper methods for transition conditions
    def has_suspects(self):
        """Check that at least one suspect is linked to this case."""
        return self.suspect_links.exists()

    def has_guilt_scores(self):
        """Check that all suspects have both detective and sergeant guilt scores."""
        for link in self.suspect_links.select_related("suspect").all():
            s = link.suspect
            if s.detective_guilt_score is None or s.sergeant_guilt_score is None:
                return False
        return self.suspect_links.exists()

    def has_captain_decision(self):
        """Check that captain decision exists for all suspects."""
        for link in self.suspect_links.select_related("suspect").all():
            if not link.suspect.captain_decision:
                return False
        return self.suspect_links.exists()

    def has_chief_decision_if_critical(self):
        """For critical crimes, check chief decision exists."""
        if self.crime_severity != CrimeSeverity.CRITICAL:
            return True
        for link in self.suspect_links.select_related("suspect").all():
            if not link.suspect.chief_decision:
                return False
        return True

    def has_trial_verdict(self):
        """Check that the trial has a verdict."""
        return hasattr(self, "trial") and self.trial.verdict is not None

    # State transitions
    @transition(
        field=status,
        source=CaseStatus.CREATED,
        target=CaseStatus.PENDING_APPROVAL
    )
    def submit_for_approval(self):
        """Submit crime scene case for superior approval."""
        if self.origin != CaseOrigin.CRIME_SCENE:
            raise ValueError("Only crime scene cases need superior approval.")

    @transition(
        field=status,
        source=CaseStatus.PENDING_APPROVAL,
        target=CaseStatus.CREATED
    )
    def approve_case(self, approver):
        """Superior approves crime scene case → moves to Created."""
        self.approved_by = approver

    @transition(
        field=status,
        source=CaseStatus.CREATED,
        target=CaseStatus.INVESTIGATION
    )
    def start_investigation(self, detective=None):
        """Detective starts investigation on a created case."""
        if detective:
            self.lead_detective = detective
            self.officers.add(detective)

    @transition(
        field=status,
        source=CaseStatus.INVESTIGATION,
        target=CaseStatus.SUSPECT_IDENTIFIED,
        conditions=[has_suspects],
    )
    def identify_suspect(self):
        """
        Detective sends case to sergeant for approval → case becomes SUSPECT_IDENTIFIED.
        Suspects stay IDENTIFIED until sergeant approves (then → UNDER_PURSUIT).
        """
        pass

    def approve_suspects_for_pursuit(self):
        """
        Sergeant approved: move all case suspects from IDENTIFIED (or UNDER_INVESTIGATION) to UNDER_PURSUIT.
        Case stays SUSPECT_IDENTIFIED.
        """
        for link in self.suspect_links.select_related("suspect").all():
            suspect = link.suspect
            if suspect.status == SuspectStatus.IDENTIFIED:
                suspect.authorize_pursuit()
                suspect.save()
            elif suspect.status == SuspectStatus.UNDER_INVESTIGATION:
                suspect.mark_wanted()
                suspect.save()

    def maybe_start_interrogation(self):
        """
        If all suspects of this case are arrested, transition case to INTERROGATION.
        """
        if self.status != CaseStatus.SUSPECT_IDENTIFIED:
            return
        for link in self.suspect_links.select_related("suspect").all():
            if link.suspect.status != SuspectStatus.ARRESTED:
                return
        self.start_interrogation()

    @transition(
        field=status,
        source=CaseStatus.SUSPECT_IDENTIFIED,
        target=CaseStatus.INTERROGATION
    )
    def start_interrogation(self):
        """Start interrogation phase (e.g. when all suspects are arrested)."""
        pass

    @transition(
        field=status,
        source=CaseStatus.SUSPECT_IDENTIFIED,
        target=CaseStatus.INVESTIGATION
    )
    def reject_suspects(self):
        """Sergeant rejects suspects; case returns to investigation."""
        pass

    @transition(
        field=status,
        source=CaseStatus.INTERROGATION,
        target=CaseStatus.PENDING_CAPTAIN,
        conditions=[has_guilt_scores],
    )
    def submit_to_captain(self):
        """
        Submit interrogation results to captain for decision.
        Requires detective and sergeant guilt scores for all suspects.
        """
        pass

    @transition(
        field=status,
        source=CaseStatus.PENDING_CAPTAIN,
        target=CaseStatus.PENDING_CHIEF,
        conditions=[has_captain_decision],
    )
    def escalate_to_chief(self):
        """Escalate critical cases to chief after captain decision."""
        if self.crime_severity != CrimeSeverity.CRITICAL:
            raise ValueError("Only critical-level cases require chief approval.")

    @transition(
        field=status,
        source=[CaseStatus.PENDING_CAPTAIN, CaseStatus.PENDING_CHIEF],
        target=CaseStatus.TRIAL,
    )
    def send_to_trial(self):
        """
        Send case to trial after captain (and chief for critical) approval.
        Validates that required decisions are in place.
        """
        if self.crime_severity == CrimeSeverity.CRITICAL:
            if not self.has_chief_decision_if_critical():
                raise ValueError(
                    "Critical cases require chief decision before trial."
                )
        elif not self.has_captain_decision():
            raise ValueError(
                "Captain decision is required before sending to trial."
            )

    @transition(
        field=status,
        source=CaseStatus.TRIAL,
        target=CaseStatus.CLOSED_SOLVED,
        conditions=[has_trial_verdict],
    )
    def close_solved(self):
        """
        Close case as solved after trial verdict.
        Marks guilty suspects as convicted.
        """
        from apps.judiciary.models import VerdictChoice
        if self.trial.verdict == VerdictChoice.GUILTY:
            for link in self.suspect_links.select_related("suspect").all():
                suspect = link.suspect
                if suspect.status == "arrested":
                    suspect.convict()
                    suspect.save()

    @transition(
        field=status,
        source=[
            CaseStatus.INVESTIGATION,
            CaseStatus.SUSPECT_IDENTIFIED,
            CaseStatus.INTERROGATION,
        ],
        target=CaseStatus.CLOSED_UNSOLVED
    )
    def close_unsolved(self):
        """Close case as unsolved. Clears suspects that were only identified."""
        for link in self.suspect_links.select_related("suspect").all():
            suspect = link.suspect
            if suspect.status in ("identified", "under_investigation"):
                suspect.clear()
                suspect.save()


class CaseHistory(TimeStampedModel):
    """Audit log for case state transitions."""
    
    case = models.ForeignKey(
        Case,
        on_delete=models.CASCADE,
        related_name="history",
    )
    from_status = models.CharField(max_length=50, choices=CaseStatus.choices)
    to_status = models.CharField(max_length=50, choices=CaseStatus.choices)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
    )
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name_plural = "Case histories"

    def __str__(self):
        return f"{self.case.case_number}: {self.from_status} → {self.to_status}"


class CrimeSceneWitness(TimeStampedModel):
    """Witnesses recorded at crime scene."""
    
    case = models.ForeignKey(
        Case,
        on_delete=models.CASCADE,
        related_name="witnesses",
    )
    full_name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20)
    national_id = models.CharField(max_length=10)
    notes = models.TextField(blank=True)
    
    # Link to user account if exists
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="witness_records",
    )

    class Meta:
        verbose_name_plural = "Crime scene witnesses"

    def __str__(self):
        return f"{self.full_name} - {self.case.case_number}"
