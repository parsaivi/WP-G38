from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient, APITestCase
from rest_framework import status

from apps.bail.models import Bail, BailStatus
from apps.bail.serializers import _is_eligible_for_bail
from apps.cases.models import Case, CaseStatus
from apps.common.models import CrimeSeverity
from apps.suspects.models import CaseSuspect, Suspect, SuspectStatus

User = get_user_model()


class BailEligibilityTestCase(TestCase):
    """Test eligibility: ARRESTED level 2/3, CONVICTED level 3."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="officer", email="o@test.com", password="pass"
        )
        self.case_l3 = Case.objects.create(
            title="Minor",
            created_by=self.user,
            crime_severity=CrimeSeverity.LEVEL_3,
            status=CaseStatus.INVESTIGATION,
        )
        self.case_l2 = Case.objects.create(
            title="Major",
            created_by=self.user,
            crime_severity=CrimeSeverity.LEVEL_2,
            status=CaseStatus.INVESTIGATION,
        )
        self.case_l1 = Case.objects.create(
            title="Severe",
            created_by=self.user,
            crime_severity=CrimeSeverity.LEVEL_1,
            status=CaseStatus.INVESTIGATION,
        )

    def test_arrested_level3_eligible(self):
        suspect = Suspect.objects.create(
            full_name="S3",
            status=SuspectStatus.ARRESTED,
        )
        CaseSuspect.objects.create(case=self.case_l3, suspect=suspect)
        self.assertTrue(_is_eligible_for_bail(suspect))

    def test_arrested_level2_eligible(self):
        suspect = Suspect.objects.create(
            full_name="S2",
            status=SuspectStatus.ARRESTED,
        )
        CaseSuspect.objects.create(case=self.case_l2, suspect=suspect)
        self.assertTrue(_is_eligible_for_bail(suspect))

    def test_arrested_level1_not_eligible(self):
        suspect = Suspect.objects.create(
            full_name="S1",
            status=SuspectStatus.ARRESTED,
        )
        CaseSuspect.objects.create(case=self.case_l1, suspect=suspect)
        self.assertFalse(_is_eligible_for_bail(suspect))

    def test_convicted_level3_eligible(self):
        suspect = Suspect.objects.create(
            full_name="C3",
            status=SuspectStatus.CONVICTED,
        )
        CaseSuspect.objects.create(case=self.case_l3, suspect=suspect)
        self.assertTrue(_is_eligible_for_bail(suspect))

    def test_convicted_level2_not_eligible(self):
        suspect = Suspect.objects.create(
            full_name="C2",
            status=SuspectStatus.CONVICTED,
        )
        CaseSuspect.objects.create(case=self.case_l2, suspect=suspect)
        self.assertFalse(_is_eligible_for_bail(suspect))


class BailAPITestCase(APITestCase):
    """Test bail API: create (Sergeant), list (public), confirm_payment."""

    def setUp(self):
        self.client = APIClient()
        self.sergeant = User.objects.create_user(
            username="sgt",
            email="sgt@test.com",
            password="pass",
        )
        self.sergeant.add_role("Sergeant")
        self.other = User.objects.create_user(
            username="other",
            email="other@test.com",
            password="pass",
        )
        self.other.add_role("Detective")
        self.case = Case.objects.create(
            title="Case",
            created_by=self.other,
            crime_severity=CrimeSeverity.LEVEL_3,
            status=CaseStatus.INTERROGATION,
        )
        self.suspect = Suspect.objects.create(
            full_name="Arrested Suspect",
            status=SuspectStatus.ARRESTED,
        )
        CaseSuspect.objects.create(case=self.case, suspect=self.suspect)

    def test_create_bail_sergeant_only(self):
        self.client.force_authenticate(user=self.sergeant)
        resp = self.client.post(
            "/api/v1/bail/bails/",
            {"suspect": self.suspect.pk, "amount": 4000000, "fine_amount": 0},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Bail.objects.count(), 1)
        bail = Bail.objects.get()
        self.assertEqual(bail.amount, 4000000)
        self.assertEqual(bail.status, BailStatus.PENDING)
        self.assertEqual(bail.created_by, self.sergeant)

    def test_create_bail_forbidden_non_sergeant(self):
        self.client.force_authenticate(user=self.other)
        resp = self.client.post(
            "/api/v1/bail/bails/",
            {"suspect": self.suspect.pk, "amount": 4000000},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(Bail.objects.count(), 0)

    def test_create_bail_ineligible_suspect_rejected(self):
        severe_case = Case.objects.create(
            title="Severe",
            created_by=self.other,
            crime_severity=CrimeSeverity.LEVEL_1,
            status=CaseStatus.INTERROGATION,
        )
        severe_suspect = Suspect.objects.create(
            full_name="Severe",
            status=SuspectStatus.ARRESTED,
        )
        CaseSuspect.objects.create(case=severe_case, suspect=severe_suspect)
        self.client.force_authenticate(user=self.sergeant)
        resp = self.client.post(
            "/api/v1/bail/bails/",
            {"suspect": severe_suspect.pk, "amount": 1000},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("eligible", str(resp.data).lower())

    def test_list_bails_public(self):
        bail = Bail.objects.create(
            suspect=self.suspect,
            amount=5000,
            created_by=self.sergeant,
            status=BailStatus.PENDING,
        )
        resp = self.client.get("/api/v1/bail/bails/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        results = resp.data.get("results", resp.data) if isinstance(resp.data, dict) else resp.data
        if isinstance(results, list):
            self.assertGreaterEqual(len(results), 1)
            ids = [b["id"] for b in results]
        else:
            ids = [resp.data["id"]] if "id" in resp.data else []
        self.assertIn(bail.pk, ids)

    def test_confirm_payment_returns_success_only_when_already_paid(self):
        """Payment is confirmed in Zibal callback; confirm_payment only returns status."""
        bail = Bail.objects.create(
            suspect=self.suspect,
            amount=5000,
            created_by=self.sergeant,
            status=BailStatus.PENDING,
        )
        resp = self.client.get(f"/api/v1/bail/bails/{bail.pk}/confirm_payment/")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("not completed", resp.data.get("detail", ""))

        from django.utils import timezone
        bail.status = BailStatus.PAID
        bail.paid_at = timezone.now()
        bail.save()
        self.suspect.release_on_bail()
        self.suspect.save()

        resp = self.client.get(f"/api/v1/bail/bails/{bail.pk}/confirm_payment/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("confirmed", resp.data.get("detail", "").lower())
        self.assertEqual(resp.data.get("bail_id"), bail.pk)
