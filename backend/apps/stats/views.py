from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth.models import Group

from apps.cases.models import Case, CaseStatus
from apps.suspects.models import Suspect, SuspectStatus
from apps.complaints.models import Complaint, ComplaintStatus
from django.contrib.auth import get_user_model

User = get_user_model()

POLICE_GROUPS = [
    'Chief', 'Captain', 'Sergeant', 'Detective',
    'Police Officer', 'Patrol Officer', 'Cadet',
]


@api_view(['GET'])
@permission_classes([AllowAny])
def dashboard_stats(request):
    """Get dashboard statistics (public for homepage display)."""
    closed_statuses = [CaseStatus.CLOSED_SOLVED, CaseStatus.CLOSED_UNSOLVED]
    stats = {
        'active_cases': Case.objects.exclude(status__in=closed_statuses).count(),
        'total_solved_cases': Case.objects.filter(status=CaseStatus.CLOSED_SOLVED).count(),
        'total_staff': User.objects.filter(groups__name__in=POLICE_GROUPS).distinct().count(),
        'wanted_suspects': Suspect.objects.filter(
            status__in=[SuspectStatus.UNDER_PURSUIT, SuspectStatus.MOST_WANTED]
        ).count(),
        'pending_complaints': Complaint.objects.filter(
            status__in=[
                ComplaintStatus.SUBMITTED,
                ComplaintStatus.CADET_REVIEW,
                ComplaintStatus.OFFICER_REVIEW,
                ComplaintStatus.RETURNED_TO_CADET,
            ]
        ).count(),
    }
    return Response(stats)


@api_view(['GET'])
@permission_classes([AllowAny])
def cases_stats(request):
    """Get case statistics."""
    stats = {
        'total_cases': Case.objects.count(),
        'open_cases': Case.objects.filter(status='open').count(),
        'solved_cases': Case.objects.filter(status='solved').count(),
        'closed_cases': Case.objects.filter(status='closed').count(),
    }
    return Response(stats)


@api_view(['GET'])
@permission_classes([AllowAny])
def suspects_stats(request):
    """Get suspect statistics."""
    stats = {
        'total_suspects': Suspect.objects.count(),
        'wanted': Suspect.objects.filter(status='wanted').count(),
        'arrested': Suspect.objects.filter(status='arrested').count(),
        'cleared': Suspect.objects.filter(status='cleared').count(),
    }
    return Response(stats)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def complaints_stats(request):
    """Get complaint statistics."""
    stats = {
        'total_complaints': Complaint.objects.count(),
        'pending': Complaint.objects.filter(status='pending').count(),
        'resolved': Complaint.objects.filter(status='resolved').count(),
        'dismissed': Complaint.objects.filter(status='dismissed').count(),
    }
    return Response(stats)
