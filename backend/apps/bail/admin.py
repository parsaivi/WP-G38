from django.contrib import admin
from .models import Bail


@admin.register(Bail)
class BailAdmin(admin.ModelAdmin):
    list_display = ["id", "suspect", "amount", "fine_amount", "status", "created_by", "paid_at", "created_at"]
    list_filter = ["status", "created_at"]
    search_fields = ["suspect__full_name"]
    raw_id_fields = ["suspect", "created_by"]
    readonly_fields = ["paid_at", "created_at", "updated_at"]
