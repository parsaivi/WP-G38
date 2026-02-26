from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import CaseReportViewSet, TrialViewSet

router = DefaultRouter()
router.register("trials", TrialViewSet, basename="trial")
router.register("reports", CaseReportViewSet, basename="case-report")

urlpatterns = [
    path("", include(router.urls)),
]
