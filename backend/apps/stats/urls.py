from django.urls import path
from . import views

urlpatterns = [
    path('dashboard/', views.dashboard_stats, name='dashboard-stats'),
    path('cases/', views.cases_stats, name='cases-stats'),
    path('suspects/', views.suspects_stats, name='suspects-stats'),
    path('complaints/', views.complaints_stats, name='complaints-stats'),
]
