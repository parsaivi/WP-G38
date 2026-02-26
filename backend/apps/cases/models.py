import uuid
from django.conf import settings
from django.db import models
from django_fsm import FSMField, transition

from apps.common.models import TimeStampedModel, CrimeSeverity


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

    # State transitions
    @transition(
        field=status,
        source=CaseStatus.CREATED,
        target=CaseStatus.PENDING_APPROVAL
    )
    def submit_for_approval(self):
        """Submit crime scene case for superior approval."""
        pass

    @transition(
        field=status,
        source=CaseStatus.PENDING_APPROVAL,
        target=CaseStatus.INVESTIGATION
    )
    def approve_and_start(self, approver):
        """Superior approves and starts investigation."""
        self.approved_by = approver

    @transition(
        field=status,
        source=[CaseStatus.CREATED, CaseStatus.PENDING_APPROVAL],
        target=CaseStatus.INVESTIGATION
    )
    def start_investigation(self, detective=None):
        """Start investigation (complaint cases skip approval)."""
        if detective:
            self.lead_detective = detective

    @transition(
        field=status,
        source=CaseStatus.INVESTIGATION,
        target=CaseStatus.SUSPECT_IDENTIFIED
    )
    def identify_suspect(self):
        """Detective identifies primary suspects."""
        pass

    @transition(
        field=status,
        source=CaseStatus.SUSPECT_IDENTIFIED,
        target=CaseStatus.INTERROGATION
    )
    def start_interrogation(self):
        """Begin interrogation of suspects."""
        pass

    @transition(
        field=status,
        source=CaseStatus.INTERROGATION,
        target=CaseStatus.PENDING_CAPTAIN
    )
    def submit_to_captain(self):
        """Submit to captain for decision."""
        pass

    @transition(
        field=status,
        source=CaseStatus.PENDING_CAPTAIN,
        target=CaseStatus.PENDING_CHIEF
    )
    def escalate_to_chief(self):
        """Escalate critical cases to chief."""
        pass

    @transition(
        field=status,
        source=[CaseStatus.PENDING_CAPTAIN, CaseStatus.PENDING_CHIEF],
        target=CaseStatus.TRIAL
    )
    def send_to_trial(self):
        """Send case to trial."""
        pass

    @transition(
        field=status,
        source=CaseStatus.TRIAL,
        target=CaseStatus.CLOSED_SOLVED
    )
    def close_solved(self):
        """Close case as solved after trial."""
        pass

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
        """Close case as unsolved."""
        pass


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
