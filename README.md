# Police Department Management System

A comprehensive web-based system for automating police department processes, built with **Django REST Framework** and **React**. The project is inspired by L.A. Noire and covers complaint handling, case investigation, evidence management, suspect tracking, trials, rewards, bail payment, and judicial proceedings.

**Reference (Checkpoint)**: Full requirements and flows are documented in **[Doc.md](Doc.md)** (Persian).

---

## Table of Contents

- [Project Overview](#-project-overview)
- [Technology Stack](#-technology-stack)
- [Project Structure](#-project-structure)
- [Features](#-features)
- [API Reference](#-api-reference)
- [Frontend Pages](#-frontend-pages)
- [Quick Start](#-quick-start)
- [Testing](#-testing)
- [Documentation](#-documentation)

---

## 📋 Project Overview

This project is part of the **Web Programming** course (Fall 1404, Faculty of Computer Engineering). The system digitizes police workflows: user registration and role-based access, complaint and case creation, evidence and forensics, detective board, suspect interrogation, Most Wanted ranking, rewards, trials, and optional bail payment via gateway.

### Design Principles

- **RESTful** APIs with Django REST Framework
- **Dynamic RBAC**: roles manageable without code changes (add/remove/change roles)
- **Multi-field login**: username, email, phone, or national ID
- **Maintainable & extensible** structure with separate apps per domain

---

## 🏗️ Technology Stack

| Layer | Stack |
|-------|--------|
| **Backend** | Django, Django REST Framework (DRF) |
| **Database** | PostgreSQL (SQLite for local dev) |
| **Auth** | JWT (djangorestframework-simplejwt) |
| **State Machine** | django-fsm (complaints, cases) |
| **API Docs** | drf-spectacular (Swagger / ReDoc) |
| **Frontend** | React 18+, React Router, Redux Toolkit |
| **HTTP** | Axios |
| **DevOps** | Docker, Docker Compose |

---

## 📁 Project Structure

```
.
├── backend/
│   ├── apps/
│   │   ├── accounts/       # Users, roles, auth (register, login, profile)
│   │   ├── complaints/     # Complaint workflow (DRAFT → APPROVED / INVALIDATED)
│   │   ├── cases/          # Case management, crime scene, detective board
│   │   ├── evidence/       # Evidence types, attachments, verification
│   │   ├── suspects/       # Suspects, interrogations, Most Wanted
│   │   ├── judiciary/      # Trials, verdicts, sentences, case reports
│   │   ├── rewards/        # Tips, officer/detective review, reward codes
│   │   ├── bail/           # Bail/bond creation, Zibal payment, callback
│   │   ├── stats/          # Dashboard & aggregated statistics
│   │   └── common/         # Shared models (e.g. CrimeSeverity)
│   ├── config/             # Django settings, main urls
│   ├── manage.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── docker-compose.yml
├── frontend/
│   └── src/
│       ├── pages/          # Route-level pages
│       ├── components/     # Navigation, PrivateRoute, Skeleton
│       ├── store/          # Redux (auth, etc.)
│       └── services/       # API clients
├── Doc.md                  # Checkpoint & full specs (Persian)
└── README.md               # This file
```

---

## ✨ Features

### 1. User & Auth

- **Registration**: username, password, email, phone, first/last name, national ID (all unique where required)
- **Login**: by username, email, phone, or national ID + password
- **JWT**: access + refresh tokens
- **Profile**: GET/PUT current user
- **Roles**: Dynamic RBAC; admin can assign/remove roles per user (`assign_roles`, `add_role`, `remove_role`)
- **Default roles**: Administrator, Chief, Captain, Sergeant, Detective, Police Officer, Patrol Officer, Cadet, Complainant, Witness, Suspect, Criminal, Judge, Coronary, Base User

### 2. Complaints

- **Create** (Complainant only), **Submit**, **Resubmit**
- **Cadet**: assign, review, return to complainant (with message) or escalate to officer
- **Officer**: return to cadet or approve
- **3-strike rule**: invalidate after 3 incomplete submissions
- **Multiple complainants**: add and approve via workflow
- **Status flow**: DRAFT → SUBMITTED → CADET_REVIEW / OFFICER_REVIEW → APPROVED / RETURNED_* / INVALIDATED

### 3. Cases

- **Create** (admin) or **from_crime_scene** (police roles except Cadet); optional witnesses
- **Approval**: one superior approves (Chief self-approves)
- **Workflow**: CREATED → PENDING_APPROVAL → INVESTIGATION → SUSPECT_IDENTIFIED → INTERROGATION → PENDING_CAPTAIN → (optional PENDING_CHIEF) → TRIAL → CLOSED_SOLVED / CLOSED_UNSOLVED
- **Actions**: assign_detective, start_investigation, identify_suspect, approve_suspects, reject_suspects, start_interrogation, submit_to_captain, captain_approve, escalate_to_chief, chief_approve, send_to_trial, close_solved, close_unsolved
- **Detective board**: GET/PUT/PATCH board state (drag-and-drop, links); detective_board_cases list
- **Extras**: add_witness, add_suspect, suspects list

### 4. Evidence

- **Types**: Testimony, Biological, Vehicle, ID Document, Other (polymorphic)
- **CRUD** + filters; **create_testimony** for full testimony payload
- **Attachments**: upload_attachment (file), attachments list
- **Verification**: verify (e.g. Coronary for biological), add_lab_result
- **Sub-resource**: `/evidence/attachments/` for evidence attachments

### 5. Suspects & Interrogation

- **Suspects**: CRUD, link_to_case
- **Status**: UNDER_PURSUIT, MOST_WANTED, ARRESTED, CLEARED
- **Actions**: start_investigation, mark_wanted, mark_most_wanted, arrest, clear
- **Scores**: detective_score, sergeant_score; captain_decision; chief_decision (critical level)
- **Interrogations**: separate ViewSet for interrogation records
- **Most Wanted**: public list `GET /suspects/most_wanted/` (AllowAny), ranking by `max(days_wanted) × max(crime_severity)`, reward = rank × 20,000,000 Rials

### 6. Judiciary

- **Trials**: CRUD; start, issue_verdict (guilty/not guilty), add_sentence
- **Case reports**: full_report (for Judge), generate (create report)

### 7. Rewards (Tips)

- **Tips**: submit (base user), officer_review (reject or send to detective), detective_review (approve → unique reward code)
- **Codes**: lookup (national_id + code, police only), claim (mark as claimed in person, police only)

### 8. Bail

- **Bail**: create (for suspects; level 2/3 crimes, etc.), initiate_payment (Zibal gateway), confirm_payment
- **Callback**: `POST /api/v1/bail/zibal-callback/` for payment return

### 9. Statistics

- **Dashboard**: `GET /api/v1/stats/dashboard/` — active_cases, total_solved_cases, total_staff, wanted_suspects, pending_complaints (AllowAny)
- **Cases / Suspects / Complaints**: stats endpoints for aggregated counts

---

## 🔌 API Reference

Base URL: `/api/v1/`

### Authentication — `/api/v1/auth/`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register/` | Register new user |
| POST | `/login/` | Login (username/email/phone/national_id + password) |
| POST | `/token/refresh/` | Refresh JWT |
| GET / PUT | `/profile/` | Current user profile |
| GET / POST | `/users/` | List / create users (admin) |
| GET / PUT / PATCH / DELETE | `/users/{id}/` | User detail |
| POST | `/users/{id}/assign_roles/` | Set user roles |
| POST | `/users/{id}/add_role/` | Add role |
| POST | `/users/{id}/remove_role/` | Remove role |
| GET / POST | `/roles/` | List / create roles |

### Complaints — `/api/v1/complaints/`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET / POST | `/` | List / create complaints |
| GET / PUT / PATCH / DELETE | `/{id}/` | Complaint detail |
| POST | `/{id}/submit/` | Submit complaint |
| POST | `/{id}/assign_cadet/` | Assign cadet |
| POST | `/{id}/return_to_complainant/` | Return with message |
| POST | `/{id}/resubmit/` | Complainant resubmit |
| POST | `/{id}/escalate/` | Cadet → officer |
| POST | `/{id}/return_to_cadet/` | Officer → cadet |
| POST | `/{id}/approve/` | Approve complaint |
| POST | `/{id}/reject/` | Reject |
| POST | `/{id}/add_complainant/` | Add complainant |

### Cases — `/api/v1/cases/`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET / POST | `/` | List / create (admin) |
| GET / PUT / PATCH / DELETE | `/{id}/` | Case detail |
| POST | `/from_crime_scene/` | Create from crime scene |
| POST | `/{id}/approve/` | Approve case |
| POST | `/{id}/assign_detective/` | Assign lead detective |
| POST | `/{id}/start_investigation/` | Start investigation |
| POST | `/{id}/identify_suspect/` | Identify suspects |
| POST | `/{id}/approve_suspects/` | Sergeant approve |
| POST | `/{id}/reject_suspects/` | Sergeant reject |
| POST | `/{id}/start_interrogation/` | Start interrogation |
| POST | `/{id}/submit_to_captain/` | Send to captain |
| POST | `/{id}/captain_approve/` | Captain approve |
| POST | `/{id}/escalate_to_chief/` | Escalate (critical) |
| POST | `/{id}/chief_approve/` | Chief approve |
| POST | `/{id}/send_to_trial/` | Send to trial |
| POST | `/{id}/close_solved/` | Close solved |
| POST | `/{id}/close_unsolved/` | Close unsolved |
| GET / PUT / PATCH | `/{id}/detective_board/` | Detective board state |
| POST | `/{id}/add_witness/` | Add witness |
| POST | `/{id}/add_suspect/` | Add suspect |
| GET | `/{id}/suspects/` | List suspects of case |
| GET | `/detective-board-cases/` | Cases for detective board |

### Evidence — `/api/v1/evidence/`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET / POST | `/` | List / create evidence |
| GET / PUT / PATCH / DELETE | `/{id}/` | Evidence detail |
| POST | `/create_testimony/` | Create testimony evidence |
| POST | `/{id}/upload_attachment/` | Upload file |
| GET | `/{id}/attachments/` | List attachments |
| POST | `/{id}/verify/` | Verify (e.g. Coronary) |
| POST | `/{id}/add_lab_result/` | Add lab result |
| GET / POST | `/attachments/` | List / create attachments (sub-resource) |

### Suspects — `/api/v1/suspects/`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/most_wanted/` | Public Most Wanted list |
| GET / POST | `/` | List / create suspects |
| GET / PUT / PATCH / DELETE | `/{id}/` | Suspect detail |
| POST | `/{id}/start_investigation/` | Start investigation |
| POST | `/{id}/mark_wanted/` | Mark wanted |
| POST | `/{id}/mark_most_wanted/` | Mark most wanted |
| POST | `/{id}/arrest/` | Arrest |
| POST | `/{id}/clear/` | Clear |
| POST | `/{id}/detective_score/` | Detective guilt score |
| POST | `/{id}/sergeant_score/` | Sergeant guilt score |
| POST | `/{id}/captain_decision/` | Captain decision |
| POST | `/{id}/chief_decision/` | Chief decision (critical) |
| POST | `/{id}/link_to_case/` | Link to case |
| GET / POST | `/interrogations/` | List / create interrogations |

### Judiciary — `/api/v1/judiciary/`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET / POST | `/trials/` | List / create trials |
| GET / PUT / PATCH / DELETE | `/trials/{id}/` | Trial detail |
| POST | `/trials/{id}/start/` | Start trial |
| POST | `/trials/{id}/issue_verdict/` | Issue verdict |
| POST | `/trials/{id}/add_sentence/` | Add sentence |
| GET | `/trials/{id}/full_report/` | Full report (Judge) |
| GET / POST | `/reports/` | List / generate case reports |
| POST | `/reports/generate/` | Generate report |

### Rewards — `/api/v1/rewards/`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET / POST | `/tips/` | List / submit tips |
| GET / PUT / PATCH / DELETE | `/tips/{id}/` | Tip detail |
| POST | `/tips/{id}/officer_review/` | Officer review |
| POST | `/tips/{id}/detective_review/` | Detective approve → unique code |
| GET / POST | `/codes/` | List / (internal) reward codes |
| POST | `/codes/lookup/` | Lookup by national_id + code (police) |
| POST | `/codes/claim/` | Mark reward claimed (police) |

### Bail — `/api/v1/bail/`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET / POST | `/bails/` | List / create bail |
| GET / PUT / PATCH / DELETE | `/bails/{id}/` | Bail detail |
| POST | `/bails/{id}/initiate_payment/` | Redirect to Zibal |
| GET | `/bails/{id}/confirm_payment/` | Confirm after payment |
| POST | `/zibal-callback/` | Payment gateway callback |

### Stats — `/api/v1/stats/`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard/` | Dashboard stats (public) |
| GET | `/cases/` | Case stats |
| GET | `/suspects/` | Suspect stats |
| GET | `/complaints/` | Complaint stats (authenticated) |

### API Documentation (Swagger / ReDoc)

- **Swagger UI**: `http://localhost:8000/api/docs/`
- **ReDoc**: `http://localhost:8000/api/redoc/`
- **OpenAPI schema**: `http://localhost:8000/api/schema/`

---

## 📄 Frontend Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | HomePage | Intro, stats (e.g. solved cases, staff, active cases) |
| `/login` | LoginPage | Login |
| `/register` | RegisterPage | Registration |
| `/most-wanted` | MostWantedPage | Public Most Wanted list |
| `/bail` | BailPage | Bail info / create |
| `/bail/return` | BailReturnPage | Return from payment gateway |
| `/dashboard` | DashboardPage | Role-based dashboard |
| `/cases` | CasesPage | Case list |
| `/cases/new` | CaseCreatePage | Create case (crime scene) |
| `/cases/:caseId` | CaseDetailPage | Case detail & actions |
| `/detective-board` | DetectiveBoardPage | Detective board (case list) |
| `/detective-board/:caseId` | DetectiveBoardPage | Board for one case (drag-drop, links) |
| `/complaints` | ComplaintsPage | Complaint list |
| `/complaints/new` | ComplaintCreatePage | Create complaint |
| `/complaints/:complaintId` | ComplaintDetailPage | Complaint detail & workflow |
| `/suspects` | SuspectPage | Suspect list |
| `/suspects/:suspectId` | SuspectDetailPage | Suspect detail & actions |
| `/evidence` | EvidencePage | Evidence list / create |
| `/evidence/:id` | EvidenceDetailPage | Evidence detail |
| `/judiciary` | TrialsListPage | Trials list (Judge/staff) |
| `/trials/:trialId` | TrialDetailPage | Trial detail, verdict, sentence |
| `/admin` | AdminPage | Front admin (users, roles) |
| `/tips` | TipsPage | Tips list |
| `/tips/new` | TipSubmitPage | Submit tip |
| `/tips/:tipId` | TipDetailPage | Tip detail & review |
| `/reward-lookup` | RewardLookupPage | Lookup reward by national_id + code (police) |

All protected routes use `PrivateRoute`; navigation is role-aware (e.g. Judiciary for Judge/staff).

---

## 🚀 Quick Start

### Prerequisites

- Python 3.9+
- Node.js 18+
- PostgreSQL (or SQLite for backend-only dev)
- Docker & Docker Compose (optional)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env       # Edit if needed
python manage.py migrate
python manage.py setup_roles   # Load default roles
python manage.py createsuperuser
python manage.py runserver
```

- **API**: `http://localhost:8000/api/v1/`
- **Admin**: `http://localhost:8000/admin/`
- **Swagger**: `http://localhost:8000/api/docs/`

### Frontend

```bash
cd frontend
npm install
npm start
```

- **App**: `http://localhost:3000`

### Docker

```bash
docker-compose up -d
# Then run migrations and setup_roles as above in exec.
```

---

## 🧪 Testing

### Backend

```bash
cd backend
python manage.py test
# Or per app:
python manage.py test apps.accounts apps.complaints apps.cases
```

- **Minimum**: 10 tests (5 in two different apps) — project has 120+ tests across apps.
- See **[TESTING_GUIDE.md](TESTING_GUIDE.md)** if present.

### Frontend

```bash
cd frontend
npm test
```

---

## 📚 Documentation

| File | Description |
|------|-------------|
| **[Doc.md](Doc.md)** | Project checkpoint & full requirements (Persian): roles, crime levels, flows (complaint, case, evidence, detective board, interrogation, trial, Most Wanted, reward, bail), pages, backend/frontend checklists. |
| **README.md** | This file — overview, structure, features, API summary, frontend routes, quick start. |
| **ARCHITECTURE.md** | Optional — architecture and design. |
| **API_DOCUMENTATION.md** | Optional — detailed API reference. |
| **backend/API_CONTRACT.md** | Optional — API contract. |

---

## 🔒 Security & Conventions

- JWT for API auth; role-based permissions on endpoints
- Unique constraints: email, phone, national_id
- CSRF, validation, and secure file upload handling
- Audit/history where required (e.g. complaint/case transitions)

---

## 📄 License

This project is part of the **Web Programming** course (Faculty of Computer Engineering).  

---

**Last Updated**: February 2026  
**Status**: Full implementation (Backend + Frontend).
