from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import InterrogationViewSet, SuspectViewSet

router = DefaultRouter()
router.register("interrogations", InterrogationViewSet, basename="interrogation")
router.register("", SuspectViewSet, basename="suspect")

urlpatterns = [
    path("", include(router.urls)),
]
