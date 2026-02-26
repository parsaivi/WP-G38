from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group, Permission
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()


class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ["id", "name", "codename", "content_type"]


class RoleSerializer(serializers.ModelSerializer):
    """Serializer for roles (Django Groups)."""
    
    permissions = PermissionSerializer(many=True, read_only=True)
    permission_ids = serializers.PrimaryKeyRelatedField(
        queryset=Permission.objects.all(),
        many=True,
        write_only=True,
        required=False,
        source="permissions"
    )

    class Meta:
        model = Group
        fields = ["id", "name", "permissions", "permission_ids"]


class UserSerializer(serializers.ModelSerializer):
    """Serializer for user details."""
    
    roles = serializers.SerializerMethodField()
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = [
            "id", "username", "email", "phone", "national_id",
            "first_name", "last_name", "avatar", "roles",
            "is_active", "is_staff", "date_joined", "password",
            "is_suspect", "is_criminal", "is_blocked_from_complaints",
        ]
        read_only_fields = [
            "id", "date_joined", "is_suspect", "is_criminal",
            "is_blocked_from_complaints",
        ]

    def get_roles(self, obj):
        return obj.get_roles()

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        user = User(**validated_data)
        if password:
            user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration."""
    
    password = serializers.CharField(
        write_only=True,
        validators=[validate_password],
        style={"input_type": "password"}
    )
    password_confirm = serializers.CharField(
        write_only=True,
        style={"input_type": "password"}
    )

    class Meta:
        model = User
        fields = [
            "username", "email", "phone", "national_id",
            "first_name", "last_name", "password", "password_confirm"
        ]
        extra_kwargs = {
            "phone": {"required": True},
            "national_id": {"required": True},
            "first_name": {"required": True},
            "last_name": {"required": True},
        }

    def validate(self, attrs):
        if attrs["password"] != attrs.pop("password_confirm"):
            raise serializers.ValidationError({
                "password_confirm": "Passwords do not match."
            })
        return attrs

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
            first_name=validated_data["first_name"],
            last_name=validated_data["last_name"],
            phone=validated_data["phone"],
            national_id=validated_data["national_id"],
        )
        # Assign default "Base User" role
        user.add_role("Base User")
        return user


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Custom JWT serializer that accepts identifier instead of username."""
    
    username_field = "identifier"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["identifier"] = serializers.CharField()
        self.fields.pop("username", None)

    def validate(self, attrs):
        identifier = attrs.get("identifier")
        password = attrs.get("password")

        from apps.accounts.backends import MultiFieldAuthBackend
        backend = MultiFieldAuthBackend()
        user = backend.authenticate(
            request=self.context.get("request"),
            username=identifier,
            password=password
        )

        if user is None:
            raise serializers.ValidationError("Invalid credentials.")

        if not user.is_active:
            raise serializers.ValidationError("User account is disabled.")

        refresh = self.get_token(user)

        return {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
            "user": UserSerializer(user).data,
        }


class AssignRoleSerializer(serializers.Serializer):
    """Serializer for assigning roles to users."""
    
    user_id = serializers.IntegerField()
    role_ids = serializers.ListField(
        child=serializers.IntegerField(),
        help_text="List of role (group) IDs to assign"
    )

    def validate_user_id(self, value):
        if not User.objects.filter(id=value).exists():
            raise serializers.ValidationError("User not found.")
        return value

    def validate_role_ids(self, value):
        existing_ids = set(Group.objects.filter(id__in=value).values_list("id", flat=True))
        if len(existing_ids) != len(value):
            raise serializers.ValidationError("One or more roles not found.")
        return value
