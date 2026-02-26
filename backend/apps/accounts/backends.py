from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend
from django.db.models import Q

User = get_user_model()


class MultiFieldAuthBackend(ModelBackend):
    """
    Custom authentication backend that allows login with:
    - username
    - email
    - phone
    - national_id
    """

    def authenticate(self, request, username=None, password=None, **kwargs):
        identifier = username or kwargs.get("identifier")
        
        if identifier is None:
            return None

        try:
            user = User.objects.get(
                Q(username=identifier) |
                Q(email=identifier) |
                Q(phone=identifier) |
                Q(national_id=identifier)
            )
        except User.DoesNotExist:
            return None
        except User.MultipleObjectsReturned:
            return None

        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        
        return None
