from django.core.management.base import BaseCommand
from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType


class Command(BaseCommand):
    help = "Setup default roles (groups) and permissions for the police system"

    DEFAULT_ROLES = [
        "Administrator",
        "Chief",
        "Captain",
        "Sergeant",
        "Detective",
        "Police Officer",
        "Patrol Officer",
        "Cadet",
        "Complainant",
        "Witness",
        "Suspect",
        "Criminal",
        "Judge",
        "Coronary",
        "Base User",
    ]

    def handle(self, *args, **options):
        self.stdout.write("Setting up default roles...")
        
        for role_name in self.DEFAULT_ROLES:
            group, created = Group.objects.get_or_create(name=role_name)
            if created:
                self.stdout.write(f"  Created role: {role_name}")
            else:
                self.stdout.write(f"  Role exists: {role_name}")
        
        self.stdout.write(self.style.SUCCESS(f"\nCreated/verified {len(self.DEFAULT_ROLES)} roles."))
        
        # Assign default permissions to roles
        self._assign_admin_permissions()
        self._assign_police_permissions()
        self._assign_judiciary_permissions()
        
        self.stdout.write(self.style.SUCCESS("\nRole setup complete!"))

    def _assign_admin_permissions(self):
        """Give Administrator all permissions."""
        admin_group = Group.objects.get(name="Administrator")
        all_permissions = Permission.objects.all()
        admin_group.permissions.set(all_permissions)
        self.stdout.write("  Assigned all permissions to Administrator")

    def _assign_police_permissions(self):
        """Assign relevant permissions to police roles."""
        # Chief gets most permissions except admin
        chief_group = Group.objects.get(name="Chief")
        police_perms = Permission.objects.filter(
            content_type__app_label__in=[
                "cases", "complaints", "evidence", "suspects", "rewards"
            ]
        )
        chief_group.permissions.set(police_perms)
        self.stdout.write("  Assigned police permissions to Chief")

    def _assign_judiciary_permissions(self):
        """Assign permissions to Judge."""
        judge_group = Group.objects.get(name="Judge")
        judge_perms = Permission.objects.filter(
            content_type__app_label__in=["judiciary", "cases"]
        )
        judge_group.permissions.set(judge_perms)
        self.stdout.write("  Assigned judiciary permissions to Judge")
