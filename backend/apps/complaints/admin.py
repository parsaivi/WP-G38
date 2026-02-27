from django.contrib import admin
from .models import Complaint, ComplaintHistory


class ComplaintHistoryInline(admin.TabularInline):
    model = ComplaintHistory
    extra = 0
    readonly_fields = ["from_status", "to_status", "changed_by", "message", "created_at"]


@admin.register(Complaint)
class ComplaintAdmin(admin.ModelAdmin):
    list_display = [
        "id", "title", "status", "crime_severity", "rejection_count",
        "created_by", "assigned_cadet", "assigned_officer", "created_at"
    ]
    list_filter = ["status", "crime_severity", "created_at"]
    search_fields = ["title", "description", "location"]
    readonly_fields = ["status", "rejection_count"]
    inlines = [ComplaintHistoryInline]
    filter_horizontal = ["complainants"]


@admin.register(ComplaintHistory)
class ComplaintHistoryAdmin(admin.ModelAdmin):
    list_display = ["complaint", "from_status", "to_status", "changed_by", "created_at"]
    list_filter = ["from_status", "to_status", "created_at"]
