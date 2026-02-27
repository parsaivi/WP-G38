from django.conf import settings
from django.db import models

from apps.common.models import TimeStampedModel


class VerdictChoice(models.TextChoices):
    """Possible trial verdicts."""
    
    GUILTY = "guilty", "Guilty"
    NOT_GUILTY = "not_guilty", "Not Guilty"
    DISMISSED = "dismissed", "Case Dismissed"
    MISTRIAL = "mistrial", "Mistrial"


class Trial(TimeStampedModel):
    """
    Trial record linking a case to judiciary proceedings.
    
    Judge has full access to:
    - Case details
    - All evidence and testimonies
    - All officers involved with ranks
    - All reports and approvals/rejections
    """
    
    case = models.OneToOneField(
        "cases.Case",
        on_delete=models.CASCADE,
        related_name="trial",
    )
    judge = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="trials_presided",
    )
    
    # Trial dates
    scheduled_date = models.DateTimeField()
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    
    # Verdict
    verdict = models.CharField(
        max_length=20,
        choices=VerdictChoice.choices,
        null=True,
        blank=True,
    )
    verdict_date = models.DateTimeField(null=True, blank=True)
    verdict_notes = models.TextField(blank=True)
    
    # Court details
    court_name = models.CharField(max_length=255, blank=True)
    court_room = models.CharField(max_length=50, blank=True)

    class Meta:
        ordering = ["-scheduled_date"]
        permissions = [
            ("can_preside_trial", "Can preside over trials"),
            ("can_issue_verdict", "Can issue verdicts"),
        ]

    def __str__(self):
        return f"Trial for {self.case.case_number}"


class Sentence(TimeStampedModel):
    """
    Sentence issued by judge for convicted suspects.
    """
    
    trial = models.ForeignKey(
        Trial,
        on_delete=models.CASCADE,
        related_name="sentences",
    )
    suspect = models.ForeignKey(
        "suspects.Suspect",
        on_delete=models.CASCADE,
        related_name="sentences",
    )
    issued_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="sentences_issued",
    )
    
    # Sentence details
    title = models.CharField(
        max_length=255,
        help_text="Type of sentence (imprisonment, fine, etc.)"
    )
    description = models.TextField(
        help_text="Full sentence details"
    )
    
    # Duration (if applicable)
    duration_days = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Sentence duration in days"
    )
    
    # Fine (if applicable)
    fine_amount = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Fine amount in Rials"
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Sentence for {self.suspect.full_name}: {self.title}"


class CaseReport(TimeStampedModel):
    """
    Comprehensive case report for judiciary.
    Aggregates all case information for judge review.
    """
    
    case = models.OneToOneField(
        "cases.Case",
        on_delete=models.CASCADE,
        related_name="judicial_report",
    )
    generated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
    )
    generated_at = models.DateTimeField(auto_now_add=True)
    
    # Cached report data (JSON for flexibility)
    report_data = models.JSONField(
        default=dict,
        help_text="Full case report data"
    )

    class Meta:
        ordering = ["-generated_at"]

    def __str__(self):
        return f"Report for {self.case.case_number}"

    def generate_report(self):
        """Generate comprehensive report data."""
        case = self.case
        
        # Get all officers involved
        officers = []
        for officer in case.officers.all():
            officers.append({
                "id": officer.id,
                "name": officer.get_full_name(),
                "roles": officer.get_roles(),
            })
        
        if case.lead_detective:
            officers.append({
                "id": case.lead_detective.id,
                "name": case.lead_detective.get_full_name(),
                "roles": case.lead_detective.get_roles(),
                "role_in_case": "Lead Detective",
            })
        
        # Get all evidence
        evidence = []
        for ev in case.evidence.all():
            evidence.append({
                "id": ev.id,
                "type": ev.evidence_type,
                "title": ev.title,
                "description": ev.description,
                "status": ev.status,
                "collected_by": ev.collected_by.get_full_name() if ev.collected_by else None,
            })
        
        # Get all suspects
        suspects = []
        for link in case.suspect_links.all():
            suspect = link.suspect
            suspects.append({
                "id": suspect.id,
                "name": suspect.full_name,
                "role": link.role,
                "status": suspect.status,
                "detective_score": suspect.detective_guilt_score,
                "sergeant_score": suspect.sergeant_guilt_score,
                "captain_decision": suspect.captain_decision,
                "chief_decision": suspect.chief_decision,
            })
        
        # Get case history
        history = []
        for entry in case.history.all():
            history.append({
                "from": entry.from_status,
                "to": entry.to_status,
                "by": entry.changed_by.get_full_name() if entry.changed_by else None,
                "date": entry.created_at.isoformat(),
                "notes": entry.notes,
            })
        
        # Get complainants if from complaint
        complainants = []
        if case.origin_complaint:
            for comp in case.origin_complaint.complainants.all():
                complainants.append({
                    "id": comp.id,
                    "name": comp.get_full_name(),
                })
        
        self.report_data = {
            "case_number": case.case_number,
            "title": case.title,
            "summary": case.summary,
            "origin": case.origin,
            "crime_severity": case.crime_severity,
            "status": case.status,
            "created_at": case.created_at.isoformat(),
            "officers_involved": officers,
            "evidence": evidence,
            "suspects": suspects,
            "history": history,
            "complainants": complainants,
        }
        self.save()
        return self.report_data
