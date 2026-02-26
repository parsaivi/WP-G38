from django.contrib import admin
from .models import CaseSuspect, Interrogation, Suspect


class CaseSuspectInline(admin.TabularInline):
    model = CaseSuspect
    extra = 0


class InterrogationInline(admin.TabularInline):
    model = Interrogation
    extra = 0


@admin.register(Suspect)
class SuspectAdmin(admin.ModelAdmin):
    list_display = [
        "id", "full_name", "status", "wanted_since",
        "most_wanted_rank", "reward_amount", "created_at"
    ]
    list_filter = ["status", "created_at", "wanted_since"]
    search_fields = ["full_name", "aliases", "description"]
    readonly_fields = ["status", "most_wanted_rank", "reward_amount"]
    inlines = [CaseSuspectInline, InterrogationInline]

    def most_wanted_rank(self, obj):
        return obj.most_wanted_rank
    most_wanted_rank.short_description = "Most Wanted Rank"

    def reward_amount(self, obj):
        return f"{obj.reward_amount:,} Rials"
    reward_amount.short_description = "Reward Amount"


@admin.register(Interrogation)
class InterrogationAdmin(admin.ModelAdmin):
    list_display = ["id", "suspect", "case", "conducted_by", "started_at", "ended_at"]
    list_filter = ["started_at", "conducted_by"]
