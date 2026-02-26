from django.contrib import admin
from .models import CaseReport, Sentence, Trial


class SentenceInline(admin.TabularInline):
    model = Sentence
    extra = 0


@admin.register(Trial)
class TrialAdmin(admin.ModelAdmin):
    list_display = [
        "id", "case", "judge", "scheduled_date",
        "verdict", "verdict_date", "created_at"
    ]
    list_filter = ["verdict", "scheduled_date", "created_at"]
    inlines = [SentenceInline]


@admin.register(Sentence)
class SentenceAdmin(admin.ModelAdmin):
    list_display = [
        "id", "trial", "suspect", "title",
        "duration_days", "fine_amount", "issued_by"
    ]
    list_filter = ["created_at"]


@admin.register(CaseReport)
class CaseReportAdmin(admin.ModelAdmin):
    list_display = ["id", "case", "generated_by", "generated_at"]
    list_filter = ["generated_at"]
