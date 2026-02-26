from django.contrib.auth import get_user_model
from django.db import models, transaction
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Evidence, EvidenceAttachment, EvidenceStatus, EvidenceType, Testimony
from .serializers import (
    AddLabResultSerializer,
    EvidenceAttachmentSerializer,
    EvidenceCreateWithTestimonySerializer,
    EvidenceSerializer,
    TestimonySerializer,
    VerifyEvidenceSerializer,
)

User = get_user_model()


class EvidenceViewSet(viewsets.ModelViewSet):
    serializer_class = EvidenceSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["case", "evidence_type", "status", "collected_by"]
    search_fields = ["title", "description", "location_found"]
    ordering_fields = ["created_at", "collection_date"]

    def get_queryset(self):
        user = self.request.user
        
        if user.is_staff:
            return Evidence.objects.all()
        
        # Users see evidence from cases they're involved in
        return Evidence.objects.filter(
            models.Q(case__created_by=user) |
            models.Q(case__lead_detective=user) |
            models.Q(case__officers=user) |
            models.Q(collected_by=user)
        ).distinct()

    @action(detail=False, methods=["post"])
    def create_testimony(self, request):
        """Create testimony evidence with full details."""
        serializer = EvidenceCreateWithTestimonySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        
        from apps.cases.models import Case
        
        with transaction.atomic():
            # Create evidence
            evidence = Evidence.objects.create(
                case_id=data["case"],
                evidence_type=EvidenceType.TESTIMONY,
                title=data["title"],
                description=data.get("description", ""),
                location_found=data.get("location_found", ""),
                collection_date=data.get("collection_date"),
                collected_by=request.user,
            )
            
            # Create testimony detail
            testimony = Testimony.objects.create(
                evidence=evidence,
                witness_id=data.get("witness_id"),
                witness_name=data.get("witness_name", ""),
                transcription=data["transcription"],
                recorded_at=data.get("recorded_at"),
                interviewer=request.user,
            )
        
        return Response(
            EvidenceSerializer(evidence).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=["post"], parser_classes=[MultiPartParser, FormParser])
    def upload_attachment(self, request, pk=None):
        """Upload attachment to evidence."""
        evidence = self.get_object()
        
        file = request.FILES.get("file")
        if not file:
            return Response(
                {"error": "No file provided."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        attachment_type = request.data.get("attachment_type", "document")
        description = request.data.get("description", "")
        
        attachment = EvidenceAttachment.objects.create(
            evidence=evidence,
            file=file,
            attachment_type=attachment_type,
            description=description,
            uploaded_by=request.user,
        )
        
        return Response(
            EvidenceAttachmentSerializer(attachment).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=["post"])
    def verify(self, request, pk=None):
        """Verify or reject evidence (Coronary for biological, others for general)."""
        evidence = self.get_object()
        serializer = VerifyEvidenceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        evidence.status = serializer.validated_data["status"]
        evidence.verified_by = request.user
        evidence.verified_at = timezone.now()
        
        if serializer.validated_data.get("notes"):
            evidence.description += f"\n\n[Verification Note]: {serializer.validated_data['notes']}"
        
        evidence.save()
        
        return Response(EvidenceSerializer(evidence).data)

    @action(detail=True, methods=["post"])
    def add_lab_result(self, request, pk=None):
        """Add lab/coronary result to biological evidence."""
        evidence = self.get_object()
        
        if evidence.evidence_type != EvidenceType.BIOLOGICAL:
            return Response(
                {"error": "Lab results can only be added to biological evidence."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = AddLabResultSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        evidence.lab_result = serializer.validated_data["lab_result"]
        evidence.status = EvidenceStatus.PROCESSING
        evidence.save()
        
        return Response(EvidenceSerializer(evidence).data)

    @action(detail=True, methods=["get"])
    def attachments(self, request, pk=None):
        """List all attachments for evidence."""
        evidence = self.get_object()
        attachments = evidence.attachments.all()
        return Response(EvidenceAttachmentSerializer(attachments, many=True).data)


class EvidenceAttachmentViewSet(viewsets.ModelViewSet):
    """ViewSet for managing evidence attachments."""
    
    queryset = EvidenceAttachment.objects.all()
    serializer_class = EvidenceAttachmentSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)
