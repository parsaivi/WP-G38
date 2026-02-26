from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import (
    AssignRoleSerializer,
    CustomTokenObtainPairSerializer,
    RoleSerializer,
    UserRegistrationSerializer,
    UserSerializer,
)

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    """User registration endpoint."""
    
    queryset = User.objects.all()
    permission_classes = [AllowAny]
    serializer_class = UserRegistrationSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {
                "message": "User registered successfully.",
                "user": UserSerializer(user).data,
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(TokenObtainPairView):
    """Custom login view that accepts identifier (username/email/phone/national_id)."""
    
    serializer_class = CustomTokenObtainPairSerializer


class ProfileView(generics.RetrieveUpdateAPIView):
    """Get or update current user's profile."""
    
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class UserViewSet(viewsets.ModelViewSet):
    """Admin user management."""
    
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdminUser]
    filterset_fields = ["is_active", "is_staff", "is_suspect", "is_criminal"]
    search_fields = ["username", "email", "first_name", "last_name", "national_id"]
    ordering_fields = ["date_joined", "username"]

    @action(detail=True, methods=["post"])
    def assign_roles(self, request, pk=None):
        """Assign roles to a user."""
        user = self.get_object()
        role_ids = request.data.get("role_ids", [])
        
        roles = Group.objects.filter(id__in=role_ids)
        user.groups.set(roles)
        
        return Response({
            "message": "Roles assigned successfully.",
            "roles": user.get_roles(),
        })

    @action(detail=True, methods=["post"])
    def add_role(self, request, pk=None):
        """Add a single role to a user."""
        user = self.get_object()
        role_name = request.data.get("role_name")
        
        if not role_name:
            return Response(
                {"error": "role_name is required."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user.add_role(role_name)
        return Response({"roles": user.get_roles()})

    @action(detail=True, methods=["post"])
    def remove_role(self, request, pk=None):
        """Remove a role from a user."""
        user = self.get_object()
        role_name = request.data.get("role_name")
        
        if not role_name:
            return Response(
                {"error": "role_name is required."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user.remove_role(role_name)
        return Response({"roles": user.get_roles()})


class RoleViewSet(viewsets.ModelViewSet):
    """
    Dynamic role management.
    Roles can be created/updated/deleted without code changes.
    """
    
    queryset = Group.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [IsAdminUser]
    search_fields = ["name"]
