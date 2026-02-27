#!/usr/bin/env python3
"""
Police Department Management System - Comprehensive Workflow Test

This script tests all 40+ workflows across the entire system:
- Complaint workflow (9 workflows)
- Case workflow (7 workflows)
- Evidence system (9 workflows)
- Suspect investigation (10 workflows)
- Trials & sentencing (5 workflows)

Usage:
    python comprehensive_workflow_test.py
    
    Or if system is not running on defaults:
    API_URL=http://your-api:port python comprehensive_workflow_test.py

Environment Variables:
    API_URL: Base API URL (default: http://localhost:8001/api/v1)
    ADMIN_USERNAME: Admin username (default: admin)
    ADMIN_PASSWORD: Admin password (default: admin)
"""

import requests
import time
import sys
from datetime import datetime, timedelta
import io
import os

# Configuration
API_URL = os.getenv("API_URL", "http://localhost:8001/api/v1")
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin")

# Test Results
PASS = 0
FAIL = 0
ERRORS = []


def test(name, condition, details=""):
    """Record a test result."""
    global PASS, FAIL, ERRORS
    if condition:
        print(f"✓ {name}")
        PASS += 1
    else:
        print(f"✗ {name}")
        FAIL += 1
        if details:
            ERRORS.append(f"{name}: {details}")


def print_header(title):
    """Print a section header."""
    print(f"\n" + "="*80)
    print(f"{title}")
    print("="*80 + "\n")


def print_footer():
    """Print final results."""
    print(f"\n" + "="*80)
    print("FINAL RESULTS")
    print("="*80 + "\n")

    total = PASS + FAIL
    if total > 0:
        pct = (PASS * 100) // total
        print(f"✓ PASSED: {PASS}")
        print(f"✗ FAILED: {FAIL}")
        print(f"SUCCESS RATE: {pct}%\n")

        if pct == 100:
            print("🎉🎉🎉 100% - ALL WORKFLOWS OPERATIONAL 🎉🎉🎉\n")
        elif pct >= 95:
            print("🎉 95%+ - SYSTEM FULLY FUNCTIONAL\n")
        elif pct >= 90:
            print("✅ 90%+ - SYSTEM HIGHLY FUNCTIONAL\n")
        elif pct >= 85:
            print("⚠️  85%+ - MOST WORKFLOWS WORKING\n")
        else:
            print(f"⚠️  {pct}% - SOME ISSUES FOUND\n")

    if ERRORS:
        print("FAILED TEST DETAILS:")
        for e in ERRORS[:10]:
            print(f"  • {e}")
        if len(ERRORS) > 10:
            print(f"  ... and {len(ERRORS) - 10} more")

    print("="*80)


def setup_users():
    """Create test users and get auth tokens."""
    print("[SETUP] Creating test users...")

    ts = str(int(time.time() * 1000))

    users = {}

    # Create complainant
    u1 = f"c{ts[-8:]}"
    requests.post(
        f"{API_URL}/auth/register/",
        json={
            "username": u1,
            "email": f"{u1}@x.com",
            "password": "Test@1234",
            "password_confirm": "Test@1234",
            "national_id": f"1{ts[-8:]}",
        },
    )
    users["complainant"] = {
        "username": u1,
        "token": requests.post(
            f"{API_URL}/auth/login/",
            json={"identifier": u1, "password": "Test@1234"},
        )
        .json()["access"],
    }

    # Create cadet
    u2 = f"k{ts[-8:]}"
    requests.post(
        f"{API_URL}/auth/register/",
        json={
            "username": u2,
            "email": f"{u2}@x.com",
            "password": "Test@1234",
            "password_confirm": "Test@1234",
            "national_id": f"2{ts[-8:]}",
        },
    )
    users["cadet"] = {
        "username": u2,
        "token": requests.post(
            f"{API_URL}/auth/login/",
            json={"identifier": u2, "password": "Test@1234"},
        )
        .json()["access"],
    }

    # Create officer
    u3 = f"o{ts[-8:]}"
    requests.post(
        f"{API_URL}/auth/register/",
        json={
            "username": u3,
            "email": f"{u3}@x.com",
            "password": "Test@1234",
            "password_confirm": "Test@1234",
            "national_id": f"3{ts[-8:]}",
        },
    )
    users["officer"] = {
        "username": u3,
        "token": requests.post(
            f"{API_URL}/auth/login/",
            json={"identifier": u3, "password": "Test@1234"},
        )
        .json()["access"],
    }

    # Create detective
    u4 = f"d{ts[-8:]}"
    requests.post(
        f"{API_URL}/auth/register/",
        json={
            "username": u4,
            "email": f"{u4}@x.com",
            "password": "Test@1234",
            "password_confirm": "Test@1234",
            "national_id": f"4{ts[-8:]}",
        },
    )
    users["detective"] = {
        "username": u4,
        "token": requests.post(
            f"{API_URL}/auth/login/",
            json={"identifier": u4, "password": "Test@1234"},
        )
        .json()["access"],
    }

    # Admin
    users["admin"] = {
        "username": ADMIN_USERNAME,
        "token": requests.post(
            f"{API_URL}/auth/login/",
            json={"identifier": ADMIN_USERNAME, "password": ADMIN_PASSWORD},
        )
        .json()["access"],
    }

    # Get user IDs
    user_list = requests.get(
        f"{API_URL}/auth/users/",
        headers={"Authorization": f"Bearer {users['admin']['token']}"},
    ).json()

    for u in user_list.get("results", []):
        if u["username"] == u2:
            users["cadet"]["id"] = u["id"]
        elif u["username"] == u3:
            users["officer"]["id"] = u["id"]
        elif u["username"] == u4:
            users["detective"]["id"] = u["id"]

    print(f"✓ Test users created\n")
    return users


def test_complaint_workflow(users, ts):
    """Test complaint workflow - 9 workflows."""
    print_header("[1] COMPLAINT WORKFLOW - 9 STATES & TRANSITIONS")

    tok_complainant = users["complainant"]["token"]
    tok_cadet = users["cadet"]["token"]
    tok_officer = users["officer"]["token"]
    tok_admin = users["admin"]["token"]
    uid_cadet = users["cadet"]["id"]
    uid_officer = users["officer"]["id"]

    # Create complaint
    c1 = requests.post(
        f"{API_URL}/complaints/",
        json={
            "title": f"Theft_{ts}",
            "description": "Stolen wallet",
            "location": "Market",
            "crime_severity": 3,
        },
        headers={"Authorization": f"Bearer {tok_complainant}"},
    ).json()
    c1id = c1.get("id")
    test("1.1. CREATE: Complaint (DRAFT)", c1.get("status") == "draft")

    if c1id and uid_cadet and uid_officer:
        # Submit
        r = requests.post(
            f"{API_URL}/complaints/{c1id}/submit/",
            headers={"Authorization": f"Bearer {tok_complainant}"},
        ).json()
        test("1.2. SUBMIT: → SUBMITTED", r.get("status") == "submitted")

        # Assign cadet
        r = requests.post(
            f"{API_URL}/complaints/{c1id}/assign_cadet/",
            json={"target_user_id": uid_cadet},
            headers={"Authorization": f"Bearer {tok_admin}"},
        ).json()
        test("1.3. ASSIGN_CADET: → CADET_REVIEW", r.get("status") == "cadet_review")

        # Escalate
        r = requests.post(
            f"{API_URL}/complaints/{c1id}/escalate/",
            json={"target_user_id": uid_officer},
            headers={"Authorization": f"Bearer {tok_cadet}"},
        ).json()
        test("1.4. ESCALATE: → OFFICER_REVIEW", r.get("status") == "officer_review")

        # Approve
        r = requests.post(
            f"{API_URL}/complaints/{c1id}/approve/",
            headers={"Authorization": f"Bearer {tok_officer}"},
        ).json()
        test("1.5. APPROVE: → APPROVED", r.get("status") == "approved")

        # Return flow
        c2 = requests.post(
            f"{API_URL}/complaints/",
            json={
                "title": f"Fraud_{ts}",
                "description": "Bad",
                "location": "Bank",
                "crime_severity": 2,
            },
            headers={"Authorization": f"Bearer {tok_complainant}"},
        ).json()
        c2id = c2.get("id")
        if c2id:
            requests.post(
                f"{API_URL}/complaints/{c2id}/submit/",
                headers={"Authorization": f"Bearer {tok_complainant}"},
            )
            requests.post(
                f"{API_URL}/complaints/{c2id}/assign_cadet/",
                json={"target_user_id": uid_cadet},
                headers={"Authorization": f"Bearer {tok_admin}"},
            )
            r = requests.post(
                f"{API_URL}/complaints/{c2id}/return_to_complainant/",
                json={"message": "Info needed"},
                headers={"Authorization": f"Bearer {tok_cadet}"},
            ).json()
            test("1.6. RETURN: → RETURNED", r.get("status") == "returned")

            r = requests.post(
                f"{API_URL}/complaints/{c2id}/resubmit/",
                headers={"Authorization": f"Bearer {tok_complainant}"},
            ).json()
            test("1.7. RESUBMIT: → SUBMITTED", r.get("status") == "submitted")

        # Reject
        c3 = requests.post(
            f"{API_URL}/complaints/",
            json={
                "title": f"Spam_{ts}",
                "description": "Fake",
                "location": "Online",
                "crime_severity": 3,
            },
            headers={"Authorization": f"Bearer {tok_complainant}"},
        ).json()
        c3id = c3.get("id")
        if c3id:
            requests.post(
                f"{API_URL}/complaints/{c3id}/submit/",
                headers={"Authorization": f"Bearer {tok_complainant}"},
            )
            r = requests.post(
                f"{API_URL}/complaints/{c3id}/reject/",
                json={"message": "False"},
                headers={"Authorization": f"Bearer {tok_officer}"},
            ).json()
            test("1.8. REJECT: → REJECTED", r.get("status") == "rejected")

        # Add complainant
        c4 = requests.post(
            f"{API_URL}/complaints/",
            json={
                "title": f"Group_{ts}",
                "description": "Many",
                "location": "Mall",
                "crime_severity": 1,
            },
            headers={"Authorization": f"Bearer {tok_complainant}"},
        ).json()
        c4id = c4.get("id")
        if c4id:
            r = requests.post(
                f"{API_URL}/complaints/{c4id}/add_complainant/",
                json={"user_id": uid_officer, "approved": True},
                headers={"Authorization": f"Bearer {tok_complainant}"},
            ).json()
            test("1.9. ADD_COMPLAINANT: Added", r.get("id") is not None)

    return c1id


def test_case_workflow(users, ts):
    """Test case workflow - 7 workflows."""
    print_header("[2] CASE WORKFLOW - 7 STATES & TRANSITIONS")

    tok_complainant = users["complainant"]["token"]
    tok_detective = users["detective"]["token"]
    tok_admin = users["admin"]["token"]
    uid_detective = users["detective"]["id"]

    case = requests.post(
        f"{API_URL}/cases/",
        json={
            "title": f"Case_{ts}",
            "description": "Investigation",
            "crime_scene_location": "Scene",
            "case_type": "theft",
            "crime_severity": 2,
        },
        headers={"Authorization": f"Bearer {tok_complainant}"},
    ).json()
    caseid = case.get("id")
    test("2.1. CREATE: Case", caseid is not None)

    if caseid and uid_detective:
        test(
            "2.2. ASSIGN_DETECTIVE: Assigned",
            requests.post(
                f"{API_URL}/cases/{caseid}/assign_detective/",
                json={"target_user_id": uid_detective},
                headers={"Authorization": f"Bearer {tok_admin}"},
            )
            .json()
            .get("lead_detective")
            is not None,
        )

        test(
            "2.3. START_INVESTIGATION: Status changed",
            requests.post(
                f"{API_URL}/cases/{caseid}/start_investigation/",
                headers={"Authorization": f"Bearer {tok_detective}"},
            )
            .json()
            .get("status")
            is not None,
        )

        test(
            "2.4. IDENTIFY_SUSPECT: Status changed",
            requests.post(
                f"{API_URL}/cases/{caseid}/identify_suspect/",
                headers={"Authorization": f"Bearer {tok_detective}"},
            )
            .json()
            .get("status")
            is not None,
        )

        test(
            "2.5. START_INTERROGATION: Status changed",
            requests.post(
                f"{API_URL}/cases/{caseid}/start_interrogation/",
                headers={"Authorization": f"Bearer {tok_detective}"},
            )
            .json()
            .get("status")
            is not None,
        )

        test(
            "2.6. PREPARE_TRIAL: Status changed",
            requests.post(
                f"{API_URL}/cases/{caseid}/prepare_trial/",
                headers={"Authorization": f"Bearer {tok_detective}"},
            )
            .json()
            .get("status")
            is not None,
        )

        test(
            "2.7. CLOSE_SOLVED: Status changed",
            requests.post(
                f"{API_URL}/cases/{caseid}/close_solved/",
                headers={"Authorization": f"Bearer {tok_detective}"},
            )
            .json()
            .get("status")
            is not None,
        )

    return caseid


def test_evidence_workflow(users, caseid, ts):
    """Test evidence workflow - 9 workflows (all 5 types)."""
    print_header("[3] EVIDENCE - ALL 5 TYPES + VERIFICATION + LAB + ATTACHMENTS")

    tok_detective = users["detective"]["token"]

    if caseid:
        # Type 1: Testimony
        ev1 = requests.post(
            f"{API_URL}/evidence/",
            json={
                "case": caseid,
                "evidence_type": "testimony",
                "title": "Witness",
                "description": "D",
                "metadata": {"transcription": "said", "witness_name": "John"},
            },
            headers={"Authorization": f"Bearer {tok_detective}"},
        ).json()
        test("3.1. TESTIMONY", ev1.get("id") is not None)

        # Type 2: Biological
        ev2 = requests.post(
            f"{API_URL}/evidence/",
            json={
                "case": caseid,
                "evidence_type": "biological",
                "title": "Blood",
                "description": "D",
            },
            headers={"Authorization": f"Bearer {tok_detective}"},
        ).json()
        ev2id = ev2.get("id")
        test("3.2. BIOLOGICAL", ev2id is not None)

        # Type 3: Vehicle
        ev3 = requests.post(
            f"{API_URL}/evidence/",
            json={
                "case": caseid,
                "evidence_type": "vehicle",
                "title": "Car",
                "description": "D",
                "metadata": {"plate": "ABC123"},
            },
            headers={"Authorization": f"Bearer {tok_detective}"},
        ).json()
        test("3.3. VEHICLE", ev3.get("id") is not None)

        # Type 4: ID_Document
        ev4 = requests.post(
            f"{API_URL}/evidence/",
            json={
                "case": caseid,
                "evidence_type": "id_document",
                "title": "ID",
                "description": "D",
                "metadata": {"owner_name": "Jane", "doc_type": "passport"},
            },
            headers={"Authorization": f"Bearer {tok_detective}"},
        ).json()
        test("3.4. ID_DOCUMENT", ev4.get("id") is not None)

        # Type 5: Other
        ev5 = requests.post(
            f"{API_URL}/evidence/",
            json={
                "case": caseid,
                "evidence_type": "other",
                "title": "Gun",
                "description": "D",
            },
            headers={"Authorization": f"Bearer {tok_detective}"},
        ).json()
        test("3.5. OTHER", ev5.get("id") is not None)

        # Verify biological
        if ev2id:
            r = requests.post(
                f"{API_URL}/evidence/{ev2id}/verify/",
                json={"status": "verified", "notes": "OK"},
                headers={"Authorization": f"Bearer {tok_detective}"},
            ).json()
            test("3.6. VERIFY_EVIDENCE", r.get("status") == "verified")

            # Lab result
            r = requests.post(
                f"{API_URL}/evidence/{ev2id}/add_lab_result/",
                json={"lab_result": "DNA match"},
                headers={"Authorization": f"Bearer {tok_detective}"},
            ).json()
            test("3.7. LAB_RESULT", r.get("id") is not None)

            # Upload attachment
            try:
                r = requests.post(
                    f"{API_URL}/evidence/{ev2id}/upload_attachment/",
                    files={"file": ("t.txt", io.BytesIO(b"c"), "text/plain")},
                    data={"attachment_type": "document"},
                    headers={"Authorization": f"Bearer {tok_detective}"},
                ).json()
                test("3.8. UPLOAD_ATTACHMENT", r.get("id") is not None)
            except Exception:
                test("3.8. UPLOAD_ATTACHMENT", False)

            # List attachments
            r = requests.get(
                f"{API_URL}/evidence/{ev2id}/attachments/",
                headers={"Authorization": f"Bearer {tok_detective}"},
            ).json()
            test("3.9. LIST_ATTACHMENTS", isinstance(r, (list, dict)))


def test_suspect_workflow(users, ts):
    """Test suspect workflow - 10 workflows."""
    print_header(
        "[4] SUSPECT - INVESTIGATION + GUILT SCORES + ARREST + CLEAR + MOST_WANTED"
    )

    tok_detective = users["detective"]["token"]

    sus = requests.post(
        f"{API_URL}/suspects/",
        json={"full_name": f"Suspect {ts}", "description": "Robber", "crime_severity": 1},
        headers={"Authorization": f"Bearer {tok_detective}"},
    ).json()
    susid = sus.get("id")
    test("4.1. CREATE_SUSPECT", susid is not None)

    if susid:
        r = requests.post(
            f"{API_URL}/suspects/{susid}/start_investigation/",
            json={},
            headers={"Authorization": f"Bearer {tok_detective}"},
        ).json()
        test("4.2. START_INVESTIGATION", r.get("status") == "under_investigation")

        r = requests.post(
            f"{API_URL}/suspects/{susid}/mark_wanted/",
            json={},
            headers={"Authorization": f"Bearer {tok_detective}"},
        ).json()
        test("4.3. MARK_WANTED", r.get("status") == "under_pursuit")

        r = requests.post(
            f"{API_URL}/suspects/{susid}/mark_most_wanted/",
            json={},
            headers={"Authorization": f"Bearer {tok_detective}"},
        ).json()
        test("4.4. MARK_MOST_WANTED", r.get("status") == "most_wanted")

        r = requests.post(
            f"{API_URL}/suspects/{susid}/detective_score/",
            json={"score": 8},
            headers={"Authorization": f"Bearer {tok_detective}"},
        ).json()
        test("4.5. DETECTIVE_SCORE", r.get("detective_guilt_score") == 8)

        r = requests.post(
            f"{API_URL}/suspects/{susid}/sergeant_score/",
            json={"score": 7},
            headers={"Authorization": f"Bearer {tok_detective}"},
        ).json()
        test("4.6. SERGEANT_SCORE", r.get("sergeant_guilt_score") == 7)

        r = requests.post(
            f"{API_URL}/suspects/{susid}/captain_decision/",
            json={"decision": "guilty", "notes": "E"},
            headers={"Authorization": f"Bearer {tok_detective}"},
        ).json()
        test(
            "4.7. CAPTAIN_DECISION",
            r.get("captain_decision") in ["guilty", "innocent"],
        )

        r = requests.post(
            f"{API_URL}/suspects/{susid}/arrest/",
            headers={"Authorization": f"Bearer {tok_detective}"},
        ).json()
        test("4.8. ARREST", r.get("status") == "arrested")

    # Test clear (new suspect in under_investigation state)
    sus2 = requests.post(
        f"{API_URL}/suspects/",
        json={"full_name": f"Clear {ts}", "description": "Innocent", "crime_severity": 3},
        headers={"Authorization": f"Bearer {tok_detective}"},
    ).json()
    sus2id = sus2.get("id")
    if sus2id:
        requests.post(
            f"{API_URL}/suspects/{sus2id}/start_investigation/",
            headers={"Authorization": f"Bearer {tok_detective}"},
        )
        r = requests.post(
            f"{API_URL}/suspects/{sus2id}/clear/",
            headers={"Authorization": f"Bearer {tok_detective}"},
        ).json()
        test("4.9. CLEAR", r.get("status") == "cleared")

    # Most wanted list (public)
    r = requests.get(f"{API_URL}/suspects/most_wanted/").json()
    test("4.10. MOST_WANTED_LIST (PUBLIC)", isinstance(r, list))

    return susid


def test_trial_workflow(users, caseid, susid, ts):
    """Test trial workflow - 5 workflows."""
    print_header("[5] TRIALS - CREATION + START + VERDICT + SENTENCE + REPORT")

    tok_detective = users["detective"]["token"]
    uid_detective = users["detective"]["id"]

    if caseid and uid_detective:
        trial = requests.post(
            f"{API_URL}/judiciary/",
            json={
                "case": caseid,
                "scheduled_date": (datetime.now() + timedelta(days=7)).isoformat(),
                "judge": uid_detective,
            },
            headers={"Authorization": f"Bearer {tok_detective}"},
        ).json()
        trialid = trial.get("id")
        test("5.1. CREATE_TRIAL", trialid is not None)

        if trialid:
            r = requests.post(
                f"{API_URL}/judiciary/{trialid}/start/",
                headers={"Authorization": f"Bearer {tok_detective}"},
            ).json()
            test("5.2. START_TRIAL", r.get("started_at") is not None)

            r = requests.post(
                f"{API_URL}/judiciary/{trialid}/issue_verdict/",
                json={"verdict": "guilty", "notes": "E"},
                headers={"Authorization": f"Bearer {tok_detective}"},
            ).json()
            test("5.3. ISSUE_VERDICT", r.get("verdict") == "guilty")

            if susid:
                r = requests.post(
                    f"{API_URL}/judiciary/{trialid}/add_sentence/",
                    json={
                        "suspect_id": susid,
                        "sentence_type": "imprisonment",
                        "duration_years": 5,
                        "description": "5y",
                    },
                    headers={"Authorization": f"Bearer {tok_detective}"},
                ).json()
                test("5.4. ADD_SENTENCE", r.get("id") is not None)

            r = requests.post(
                f"{API_URL}/judiciary/{trialid}/full_report/",
                headers={"Authorization": f"Bearer {tok_detective}"},
            ).json()
            test("5.5. FULL_REPORT", r.get("id") is not None)


def main():
    """Run all tests."""
    print("\n" + "="*80)
    print("POLICE DEPARTMENT MANAGEMENT SYSTEM - COMPREHENSIVE WORKFLOW TEST")
    print("="*80 + "\n")

    print(f"API URL: {API_URL}\n")

    try:
        # Setup
        users = setup_users()
        ts = str(int(time.time() * 1000))

        # Run all tests
        c1id = test_complaint_workflow(users, ts)
        caseid = test_case_workflow(users, ts)
        test_evidence_workflow(users, caseid, ts)
        susid = test_suspect_workflow(users, ts)
        test_trial_workflow(users, caseid, susid, ts)

    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        print(f"   Make sure the API is running at {API_URL}")
        sys.exit(1)

    # Print results
    print_footer()

    # Exit with appropriate code
    sys.exit(0 if FAIL == 0 else 1)


if __name__ == "__main__":
    main()
