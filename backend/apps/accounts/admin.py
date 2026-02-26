from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth import get_user_model

User = get_user_model()


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = [
        "username", "email", "first_name", "last_name",
        "is_staff", "is_active", "get_roles_display"
    ]
    list_filter = BaseUserAdmin.list_filter + (
        "is_suspect", "is_criminal", "is_blocked_from_complaints"
    )
    search_fields = ["username", "email", "phone", "national_id", "first_name", "last_name"]
    
    fieldsets = BaseUserAdmin.fieldsets + (
        ("Additional Info", {
            "fields": ("phone", "national_id", "avatar")
        }),
        ("System Status", {
            "fields": (
                "invalid_complaints_count", "is_blocked_from_complaints",
                "is_suspect", "is_criminal"
            )
        }),
    )
    
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ("Additional Info", {
            "fields": ("email", "phone", "national_id", "first_name", "last_name")
        }),
    )

    def get_roles_display(self, obj):
        return ", ".join(obj.get_roles()) or "-"
    get_roles_display.short_description = "Roles"
