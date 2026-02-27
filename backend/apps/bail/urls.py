from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import BailViewSet, zibal_callback

router = DefaultRouter()
router.register("bails", BailViewSet, basename="bail")

urlpatterns = [
    path("", include(router.urls)),
    path("zibal-callback/", zibal_callback, name="zibal-callback"),
]
