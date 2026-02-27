from django.contrib import admin
from .models import RewardCode, Tip


class RewardCodeInline(admin.StackedInline):
    model = RewardCode
    extra = 0
    readonly_fields = ["code"]


@admin.register(Tip)
class TipAdmin(admin.ModelAdmin):
    list_display = [
        "id", "title", "status", "submitted_by",
        "case", "suspect", "created_at"
    ]
    list_filter = ["status", "created_at"]
    search_fields = ["title", "description"]
    inlines = [RewardCodeInline]


@admin.register(RewardCode)
class RewardCodeAdmin(admin.ModelAdmin):
    list_display = [
        "code", "amount", "is_claimed", "claimed_at",
        "claimed_by_officer", "created_at"
    ]
    list_filter = ["is_claimed", "created_at"]
    readonly_fields = ["code"]
