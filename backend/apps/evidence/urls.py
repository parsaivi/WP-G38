from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import EvidenceViewSet, EvidenceAttachmentViewSet

router = DefaultRouter()
router.register("attachments", EvidenceAttachmentViewSet, basename="evidence-attachment")
router.register("", EvidenceViewSet, basename="evidence")

urlpatterns = [
    path("", include(router.urls)),
]
