from django.contrib import admin
from .models import Case, CaseHistory, CrimeSceneWitness


class CaseHistoryInline(admin.TabularInline):
    model = CaseHistory
    extra = 0
    readonly_fields = ["from_status", "to_status", "changed_by", "notes", "created_at"]


class CrimeSceneWitnessInline(admin.TabularInline):
    model = CrimeSceneWitness
    extra = 0


@admin.register(Case)
class CaseAdmin(admin.ModelAdmin):
    list_display = [
        "case_number", "title", "status", "origin", "crime_severity",
        "lead_detective", "created_by", "created_at"
    ]
    list_filter = ["status", "origin", "crime_severity", "created_at"]
    search_fields = ["case_number", "title", "summary", "crime_scene_location"]
    readonly_fields = ["case_number", "status"]
    inlines = [CaseHistoryInline, CrimeSceneWitnessInline]
    filter_horizontal = ["officers"]


@admin.register(CaseHistory)
class CaseHistoryAdmin(admin.ModelAdmin):
    list_display = ["case", "from_status", "to_status", "changed_by", "created_at"]
    list_filter = ["from_status", "to_status", "created_at"]
