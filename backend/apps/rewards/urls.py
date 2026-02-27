from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import RewardCodeViewSet, TipViewSet

router = DefaultRouter()
router.register("tips", TipViewSet, basename="tip")
router.register("codes", RewardCodeViewSet, basename="reward-code")

urlpatterns = [
    path("", include(router.urls)),
]
