from django.contrib import admin
from .models import Evidence, EvidenceAttachment, Testimony


class EvidenceAttachmentInline(admin.TabularInline):
    model = EvidenceAttachment
    extra = 0


class TestimonyInline(admin.StackedInline):
    model = Testimony
    extra = 0


@admin.register(Evidence)
class EvidenceAdmin(admin.ModelAdmin):
    list_display = [
        "id", "title", "evidence_type", "status", "case",
        "collected_by", "verified_by", "created_at"
    ]
    list_filter = ["evidence_type", "status", "created_at"]
    search_fields = ["title", "description", "location_found"]
    inlines = [EvidenceAttachmentInline, TestimonyInline]


@admin.register(EvidenceAttachment)
class EvidenceAttachmentAdmin(admin.ModelAdmin):
    list_display = ["id", "evidence", "attachment_type", "uploaded_by", "created_at"]
    list_filter = ["attachment_type", "created_at"]


@admin.register(Testimony)
class TestimonyAdmin(admin.ModelAdmin):
    list_display = ["id", "evidence", "witness", "witness_name", "interviewer", "recorded_at"]
    list_filter = ["recorded_at", "created_at"]
