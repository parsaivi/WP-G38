from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView,
)

urlpatterns = [
    path("admin/", admin.site.urls),
    
    # API v1
    path("api/v1/auth/", include("apps.accounts.urls")),
    path("api/v1/complaints/", include("apps.complaints.urls")),
    path("api/v1/cases/", include("apps.cases.urls")),
    path("api/v1/evidence/", include("apps.evidence.urls")),
    path("api/v1/suspects/", include("apps.suspects.urls")),
    path("api/v1/judiciary/", include("apps.judiciary.urls")),
    path("api/v1/rewards/", include("apps.rewards.urls")),
    path("api/v1/bail/", include("apps.bail.urls")),
    path("api/v1/stats/", include("apps.stats.urls")),
    
    # API Documentation
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
