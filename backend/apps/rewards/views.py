from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import RewardCode, Tip, TipStatus
from .serializers import (
    ClaimRewardSerializer,
    RewardCodeSerializer,
    RewardLookupSerializer,
    TipReviewSerializer,
    TipSerializer,
)

User = get_user_model()


class TipViewSet(viewsets.ModelViewSet):
    serializer_class = TipSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["status", "case", "suspect"]
    search_fields = ["title", "description"]
    ordering_fields = ["created_at"]

    def get_queryset(self):
        user = self.request.user
        
        if user.is_staff:
            return Tip.objects.all()
        
        user_roles = user.get_roles()
        
        # Police officers see submitted tips for initial review
        officer_roles = ["Police Officer", "Patrol Officer", "Chief", "Captain", "Sergeant"]
        if any(role in officer_roles for role in user_roles):
            from django.db.models import Q
            return Tip.objects.filter(
                Q(submitted_by=user) |
                Q(status=TipStatus.SUBMITTED) |
                Q(status=TipStatus.OFFICER_REVIEW)
            ).distinct()
        
        # Detectives see tips forwarded for their review (about their cases)
        if "Detective" in user_roles:
            from django.db.models import Q
            return Tip.objects.filter(
                Q(submitted_by=user) |
                Q(status=TipStatus.DETECTIVE_REVIEW, case__lead_detective=user)
            ).distinct()
        
        # Regular users see their own tips
        return Tip.objects.filter(submitted_by=user)

    def perform_create(self, serializer):
        serializer.save(submitted_by=self.request.user)

    @action(detail=True, methods=["post"])
    def officer_review(self, request, pk=None):
        """Police officer reviews the tip."""
        allowed_roles = ["Police Officer", "Patrol Officer", "Chief", "Captain", "Sergeant", "Administrator"]
        if not any(request.user.has_role(role) for role in allowed_roles):
            return Response(
                {"error": "You do not have permission to perform officer review."},
                status=status.HTTP_403_FORBIDDEN,
            )
        tip = self.get_object()
        serializer = TipReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        tip.reviewed_by_officer = request.user
        tip.officer_review_date = timezone.now()
        tip.officer_notes = serializer.validated_data.get("notes", "")
        
        if serializer.validated_data["approved"]:
            tip.status = TipStatus.DETECTIVE_REVIEW
        else:
            tip.status = TipStatus.OFFICER_REJECTED
        
        tip.save()
        return Response(TipSerializer(tip).data)

    @action(detail=True, methods=["post"])
    def detective_review(self, request, pk=None):
        """Detective reviews the tip and approves reward."""
        if not any(request.user.has_role(role) for role in ["Detective", "Administrator"]):
            return Response(
                {"error": "You do not have permission to perform detective review."},
                status=status.HTTP_403_FORBIDDEN,
            )
        tip = self.get_object()
        serializer = TipReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        tip.reviewed_by_detective = request.user
        tip.detective_review_date = timezone.now()
        tip.detective_notes = serializer.validated_data.get("notes", "")
        
        if serializer.validated_data["approved"]:
            tip.status = TipStatus.APPROVED
            tip.save()
            
            # Generate reward code
            # Calculate reward based on case/suspect severity
            reward_amount = self._calculate_reward(tip)
            
            reward_code = RewardCode.objects.create(
                tip=tip,
                amount=reward_amount,
            )
            
            return Response({
                "message": "Tip approved. Reward code generated.",
                "tip": TipSerializer(tip).data,
                "reward_code": RewardCodeSerializer(reward_code).data,
            })
        else:
            tip.status = TipStatus.DETECTIVE_REJECTED
            tip.save()
            return Response(TipSerializer(tip).data)

    def _calculate_reward(self, tip) -> int:
        """Calculate reward amount based on case/suspect severity."""
        base_reward = 5_000_000  # 5 million Rials base
        
        if tip.suspect and hasattr(tip.suspect, "reward_amount"):
            # Use suspect's calculated reward
            return tip.suspect.reward_amount
        
        if tip.case:
            # Higher severity = higher reward
            severity_multiplier = 5 - tip.case.crime_severity  # 1-4
            return base_reward * severity_multiplier
        
        return base_reward


class RewardCodeViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = RewardCode.objects.all()
    serializer_class = RewardCodeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        
        if user.is_staff:
            return RewardCode.objects.all()
        
        # Users see their own rewards
        return RewardCode.objects.filter(tip__submitted_by=user)

    def _user_can_lookup_claim(self, user):
        """Only police ranks may lookup or claim rewards."""
        allowed_roles = [
            "Police Officer", "Patrol Officer", "Chief", "Captain", "Sergeant", "Administrator"
        ]
        return any(user.has_role(role) for role in allowed_roles)

    @action(detail=False, methods=["post"])
    def lookup(self, request):
        """
        Look up reward info by national_id + code.
        All police ranks can use this to verify rewards.
        """
        if not self._user_can_lookup_claim(request.user):
            return Response(
                {"error": "Only police personnel can lookup rewards."},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = RewardLookupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        national_id = serializer.validated_data["national_id"]
        code = serializer.validated_data["reward_code"]
        
        try:
            reward = RewardCode.objects.get(code=code)
        except RewardCode.DoesNotExist:
            return Response(
                {"error": "Reward code not found."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Verify national_id matches
        if reward.recipient.national_id != national_id:
            return Response(
                {"error": "National ID does not match."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return Response({
            "reward": RewardCodeSerializer(reward).data,
            "recipient": {
                "full_name": reward.recipient.get_full_name(),
                "national_id": reward.recipient.national_id,
            }
        })

    @action(detail=False, methods=["post"])
    def claim(self, request):
        """Process reward claim in person. Only police personnel."""
        if not self._user_can_lookup_claim(request.user):
            return Response(
                {"error": "Only police personnel can process reward claims."},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = ClaimRewardSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        reward = serializer.validated_data["reward"]
        
        reward.is_claimed = True
        reward.claimed_at = timezone.now()
        reward.claimed_by_officer = request.user
        reward.save()
        
        # Update tip status
        reward.tip.status = TipStatus.REWARD_CLAIMED
        reward.tip.save()
        
        return Response({
            "message": "Reward claimed successfully.",
            "reward": RewardCodeSerializer(reward).data,
        })
