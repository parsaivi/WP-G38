from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    LoginView,
    ProfileView,
    RegisterView,
    RoleViewSet,
    UserViewSet,
)

router = DefaultRouter()
router.register("users", UserViewSet, basename="user")
router.register("roles", RoleViewSet, basename="role")

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("profile/", ProfileView.as_view(), name="profile"),
    path("", include(router.urls)),
]
