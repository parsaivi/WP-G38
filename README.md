# Police Department Management System

A full-stack web application for automating police department workflows, inspired by L.A. Noire. Citizens submit complaints and tips; cadets, officers, detectives, sergeants, captains, and chiefs investigate cases, manage evidence, interrogate suspects, and pursue Most Wanted; judges run trials; and bail can be paid online via the Zibal gateway.

Built with **Django REST Framework** (backend) and **React 19** (frontend), packaged with **Docker Compose**, backed by **PostgreSQL** and **Redis**.

Full functional and process specification (Persian): **[Doc.md](Doc.md)**.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Features](#features)
- [API Reference](#api-reference)
- [Frontend Pages](#frontend-pages)
- [Quick Start](#quick-start)
- [Testing](#testing)
- [Documentation](#documentation)
- [Security & Conventions](#security--conventions)

---

## Project Overview

The system digitizes the end-to-end police workflow:

- **Auth & RBAC** — registration, multi-field login, dynamic role management
- **Complaints** — drafting, cadet/officer review, 3-strike invalidation
- **Cases** — creation from crime scene, detective board, suspect identification, captain/chief approval, trial
- **Evidence** — typed evidence (testimony, biological, vehicle, ID document, other), attachments, lab verification
- **Suspects** — pursuit, Most Wanted ranking, arrest/clear, scoring & decisions
- **Judiciary** — trials, verdicts, sentences, case reports
- **Rewards (Tips)** — public tip submission, two-stage review, unique reward codes
- **Bail** — bond creation and online payment via Zibal
- **Stats** — public dashboard plus per-domain aggregations

### Design Principles

- **RESTful** APIs with Django REST Framework
- **Dynamic RBAC** — roles add/remove/edit at runtime, no code change
- **Multi-field login** — username, email, phone, or national ID
- **Domain-separated apps** for maintainability and extensibility
- **Containerized** — single-command bring-up via Docker Compose

---

## Technology Stack

| Layer | Stack |
|-------|-------|
| **Backend** | Django 5, Django REST Framework |
| **Database** | PostgreSQL 15 |
| **Cache** | Redis 7 |
| **Auth** | JWT (djangorestframework-simplejwt) |
| **State Machine** | django-fsm (complaints, cases) |
| **API Docs** | drf-spectacular (Swagger / ReDoc) |
| **Filtering** | django-filter |
| **Frontend** | React 19, React Router 6, Redux Toolkit |
| **Styling** | Tailwind CSS 3 |
| **HTTP Client** | Axios |
| **Drag & Drop** | react-dnd (HTML5 backend) |
| **Server** | Gunicorn (production) |
| **DevOps** | Docker, Docker Compose |

---

## Project Structure

```
.
├── backend/
│   ├── apps/
│   │   ├── accounts/       # Users, roles, JWT auth, profile, RBAC
│   │   ├── complaints/     # Complaint workflow (FSM)
│   │   ├── cases/          # Cases, crime scene, detective board
│   │   ├── evidence/       # Polymorphic evidence + attachments
│   │   ├── suspects/       # Suspects, interrogations, Most Wanted
│   │   ├── judiciary/      # Trials, verdicts, sentences, reports
│   │   ├── rewards/        # Tips, reviews, reward codes
│   │   ├── bail/           # Bail bonds + Zibal gateway
│   │   ├── stats/          # Dashboard aggregations
│   │   └── common/         # Shared models (CrimeSeverity, etc.)
│   ├── config/             # Django settings + root URLs
│   ├── scripts/            # init-db.sql, load_default_roles.py
│   ├── manage.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── docker-entrypoint.sh
├── frontend/
│   ├── src/
│   │   ├── pages/          # 25 route-level pages
│   │   ├── components/     # Navigation, PrivateRoute, Skeleton
│   │   ├── store/          # Redux store (auth slice, etc.)
│   │   ├── services/       # API clients (axios)
│   │   ├── hooks/          # Custom hooks
│   │   ├── styles/         # Tailwind/global styles
│   │   └── utils/          # Helpers
│   ├── public/
│   ├── package.json
│   ├── tailwind.config.js
│   └── Dockerfile
├── docker-compose.yml      # db, backend, frontend, redis
├── run.sh                  # One-shot Docker bring-up script
└── README.md               # This file
```

---

## Features

### 1. Users & Auth
- Registration with `username`, `password`, `email`, `phone`, `first/last name`, `national_id` (uniques enforced)
- Login by **any** of: username, email, phone, national ID
- JWT access + refresh tokens
- `GET/PUT /auth/profile/` for current user
- **Dynamic RBAC** — admin can manage roles at runtime via `assign_roles`, `add_role`, `remove_role`
- Default roles: Administrator, Chief, Captain, Sergeant, Detective, Police Officer, Patrol Officer, Cadet, Complainant, Witness, Suspect, Criminal, Judge, Coronary, Base User

### 2. Complaints
- Create (Complainant) → Submit → Cadet review → escalate to Officer → Approve / Return / Invalidate
- `return_to_complainant` with message; complainant can `resubmit`
- **3-strike rule** — auto invalidate after 3 incomplete submissions
- Multiple complainants per complaint
- Status flow: `DRAFT → SUBMITTED → CADET_REVIEW / OFFICER_REVIEW → APPROVED / RETURNED_* / INVALIDATED`

### 3. Cases
- Created by admin, or `from_crime_scene` by police roles (except Cadet); optional witnesses
- One-superior approval (Chief self-approves)
- Workflow: `CREATED → PENDING_APPROVAL → INVESTIGATION → SUSPECT_IDENTIFIED → INTERROGATION → PENDING_CAPTAIN → (PENDING_CHIEF) → TRIAL → CLOSED_SOLVED / CLOSED_UNSOLVED`
- Actions: `assign_detective`, `start_investigation`, `identify_suspect`, `approve_suspects`, `reject_suspects`, `start_interrogation`, `submit_to_captain`, `captain_approve`, `escalate_to_chief`, `chief_approve`, `send_to_trial`, `close_solved`, `close_unsolved`
- **Detective board** with drag-and-drop nodes and links (`GET/PUT/PATCH /cases/{id}/detective_board/`)
- `add_witness`, `add_suspect`, `suspects` listing

### 4. Evidence
- Polymorphic types: **Testimony**, **Biological**, **Vehicle**, **ID Document**, **Other**
- CRUD + filters; `create_testimony` for full testimony payload
- File `upload_attachment` and per-evidence `attachments` listing
- `verify` (e.g. by Coronary for biological) and `add_lab_result`
- `/evidence/attachments/` sub-resource

### 5. Suspects & Interrogation
- CRUD + `link_to_case`
- Status: `UNDER_PURSUIT`, `MOST_WANTED`, `ARRESTED`, `CLEARED`
- Actions: `start_investigation`, `mark_wanted`, `mark_most_wanted`, `arrest`, `clear`
- Guilt scoring: `detective_score`, `sergeant_score`, `captain_decision`, `chief_decision` (critical level)
- Separate ViewSet for **interrogations**
- **Most Wanted** — `GET /suspects/most_wanted/` is **public**; ranking by `max(days_wanted) × max(crime_severity)`; reward = `rank × 20,000,000` Rials

### 6. Judiciary
- Trials CRUD + `start`, `issue_verdict` (guilty / not guilty), `add_sentence`
- `full_report` for Judge view
- Case reports — `generate` and list

### 7. Rewards (Tips)
- Public `submit` (base user) → Officer `officer_review` (reject or send to detective) → Detective `detective_review` (approve → unique reward code)
- `codes/lookup` (national_id + code, police only) and `codes/claim` (in-person redemption)

### 8. Bail
- Bail/bond creation for eligible suspects (e.g. crime level 2/3)
- `initiate_payment` → redirect to Zibal
- `confirm_payment` and gateway `POST /bail/zibal-callback/`

### 9. Statistics
- `GET /stats/dashboard/` — public — `active_cases`, `total_solved_cases`, `total_staff`, `wanted_suspects`, `pending_complaints`
- Per-domain: `/stats/cases/`, `/stats/suspects/`, `/stats/complaints/`

---

## API Reference

Base URL: `/api/v1/`

### Authentication — `/api/v1/auth/`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register/` | Register a new user |
| POST | `/login/` | Login (username / email / phone / national_id + password) |
| POST | `/token/refresh/` | Refresh JWT |
| GET / PUT | `/profile/` | Current user profile |
| GET / POST | `/users/` | List / create users (admin) |
| GET / PUT / PATCH / DELETE | `/users/{id}/` | User detail |
| POST | `/users/{id}/assign_roles/` | Set user roles |
| POST | `/users/{id}/add_role/` | Add a role |
| POST | `/users/{id}/remove_role/` | Remove a role |
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
| POST | `/{id}/approve/` | Approve |
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
| POST | `/{id}/approve_suspects/` | Sergeant approve suspects |
| POST | `/{id}/reject_suspects/` | Sergeant reject suspects |
| POST | `/{id}/start_interrogation/` | Start interrogation |
| POST | `/{id}/submit_to_captain/` | Submit to captain |
| POST | `/{id}/captain_approve/` | Captain approve |
| POST | `/{id}/escalate_to_chief/` | Escalate (critical) |
| POST | `/{id}/chief_approve/` | Chief approve |
| POST | `/{id}/send_to_trial/` | Send to trial |
| POST | `/{id}/close_solved/` | Close as solved |
| POST | `/{id}/close_unsolved/` | Close as unsolved |
| GET / PUT / PATCH | `/{id}/detective_board/` | Detective board state |
| POST | `/{id}/add_witness/` | Add witness |
| POST | `/{id}/add_suspect/` | Add suspect |
| GET | `/{id}/suspects/` | Suspects on this case |
| GET | `/detective-board-cases/` | Cases for detective board |

### Evidence — `/api/v1/evidence/`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET / POST | `/` | List / create evidence |
| GET / PUT / PATCH / DELETE | `/{id}/` | Evidence detail |
| POST | `/create_testimony/` | Create testimony |
| POST | `/{id}/upload_attachment/` | Upload file |
| GET | `/{id}/attachments/` | List attachments |
| POST | `/{id}/verify/` | Verify (e.g. Coronary) |
| POST | `/{id}/add_lab_result/` | Add lab result |
| GET / POST | `/attachments/` | Attachments sub-resource |

### Suspects — `/api/v1/suspects/`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/most_wanted/` | **Public** Most Wanted list |
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
| POST | `/{id}/link_to_case/` | Link to a case |
| GET / POST | `/interrogations/` | Interrogations |

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
| GET / POST | `/codes/` | Reward codes (internal) |
| POST | `/codes/lookup/` | Lookup by national_id + code (police) |
| POST | `/codes/claim/` | Mark as claimed in person (police) |

### Bail — `/api/v1/bail/`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET / POST | `/bails/` | List / create bail |
| GET / PUT / PATCH / DELETE | `/bails/{id}/` | Bail detail |
| POST | `/bails/{id}/initiate_payment/` | Redirect to Zibal |
| GET | `/bails/{id}/confirm_payment/` | Confirm payment |
| POST | `/zibal-callback/` | Zibal gateway callback |

### Stats — `/api/v1/stats/`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard/` | Public dashboard counters |
| GET | `/cases/` | Case stats |
| GET | `/suspects/` | Suspect stats |
| GET | `/complaints/` | Complaint stats (auth) |

### API Documentation

- **Swagger UI** — `http://localhost:8001/api/schema/swagger/`
- **ReDoc** — `http://localhost:8001/api/redoc/`
- **OpenAPI schema** — `http://localhost:8001/api/schema/`

---

## Frontend Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | HomePage | Public landing — intro and dashboard stats |
| `/login` | LoginPage | Login (multi-field) |
| `/register` | RegisterPage | Registration |
| `/most-wanted` | MostWantedPage | Public Most Wanted list with rewards |
| `/bail` | BailPage | Bail info / create / pay |
| `/bail/return` | BailReturnPage | Return from Zibal payment |
| `/dashboard` | DashboardPage | Role-aware dashboard |
| `/cases` | CasesPage | Case list |
| `/cases/new` | CaseCreatePage | Create case from crime scene |
| `/cases/:caseId` | CaseDetailPage | Case detail + workflow actions |
| `/detective-board` | DetectiveBoardPage | List of cases for the board |
| `/detective-board/:caseId` | DetectiveBoardPage | Per-case board (drag & drop, links) |
| `/complaints` | ComplaintsPage | Complaint list |
| `/complaints/new` | ComplaintCreatePage | Create complaint |
| `/complaints/:complaintId` | ComplaintDetailPage | Complaint detail + workflow |
| `/suspects` | SuspectPage | Suspect list |
| `/suspects/:suspectId` | SuspectDetailPage | Suspect detail + actions/scoring |
| `/evidence` | EvidencePage | Evidence list / create |
| `/evidence/new` | EvidencePage | Create evidence |
| `/evidence/:id` | EvidenceDetailPage | Evidence detail + attachments |
| `/judiciary` | TrialsListPage | Trials list (Judge / staff) |
| `/trials/:trialId` | TrialDetailPage | Trial detail, verdict, sentence |
| `/admin` | AdminPage | Frontend admin (users / roles) |
| `/tips` | TipsPage | Tips list |
| `/tips/new` | TipSubmitPage | Submit a tip |
| `/tips/:tipId` | TipDetailPage | Tip detail + officer/detective review |
| `/reward-lookup` | RewardLookupPage | Lookup reward by national_id + code (police) |

All non-public routes are wrapped in `PrivateRoute`. Navigation is **role-aware** — links such as Judiciary, Admin, and Detective Board only appear for the appropriate roles.

---

## Quick Start

### Prerequisites

- Docker & Docker Compose
- (Or, for local-only dev) Python 3.9+ and Node.js 18+

### One-Command Bring-Up (Docker)

```bash
./run.sh
```

This will:
1. Copy `.env.docker` → `.env` if missing
2. Stop any existing containers
3. Build and start `db`, `backend`, `frontend`, and `redis`
4. Run migrations and load default roles
5. Print URLs and useful commands

After bring-up:

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3001 |
| Backend API | http://localhost:8001 |
| Swagger | http://localhost:8001/api/schema/swagger/ |
| Django Admin | http://localhost:8001/admin/ |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

**Default credentials**: `admin` / `admin123456`

### Manual Docker Compose

```bash
docker-compose up -d --build
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py setup_roles
docker-compose exec backend python manage.py createsuperuser
```

### Local Development (no Docker)

**Backend**

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py setup_roles
python manage.py createsuperuser
python manage.py runserver
```

**Frontend**

```bash
cd frontend
npm install
npm start
```

---

## Testing

### Backend

```bash
# Inside Docker
docker-compose exec backend python manage.py test

# Or locally
cd backend && python manage.py test
# Per-app:
python manage.py test apps.accounts apps.complaints apps.cases
```

The backend ships with 120+ unit tests across the apps.

### Frontend

```bash
docker-compose exec frontend npm test
# or locally:
cd frontend && npm test
```

### End-to-End

- `e2e-test.sh` — shell script driving HTTP flows through the API
- `comprehensive_workflow_test.py` — Python workflow test (full lifecycle)

---

## Documentation

| File | Description |
|------|-------------|
| **[Doc.md](Doc.md)** | Full functional spec & checkpoint (Persian) — roles, crime levels, every flow (complaint, case, evidence, detective board, interrogation, trial, Most Wanted, reward, bail), pages, backend/frontend checklists |
| **[DOCKER_SETUP.md](DOCKER_SETUP.md)** | Docker setup details |
| **[SETUP_GUIDE.md](SETUP_GUIDE.md)** | Manual setup walkthrough |
| **[PROJECT_RUNNING.md](PROJECT_RUNNING.md)** | Operational notes for a running deployment |
| **[FRONTEND_IMPLEMENTATION.md](FRONTEND_IMPLEMENTATION.md)** | Frontend implementation notes |
| **[FRONTEND_DELIVERABLES.md](FRONTEND_DELIVERABLES.md)** | Frontend deliverables list |
| **[FRONTEND_COMPLETION_REPORT.md](FRONTEND_COMPLETION_REPORT.md)** | Frontend completion report |
| **[WORKFLOW_TEST_REPORT.md](WORKFLOW_TEST_REPORT.md)** | E2E workflow test report |
| **[FINAL_SUMMARY.md](FINAL_SUMMARY.md)** | Final project summary |
| **[Missed.md](Missed.md)** | Items / edge cases tracked during implementation |
| **[Proj_Report.pdf](Proj_Report.pdf)** | Project report (PDF) |

---

## Security & Conventions

- **JWT** for API authentication; role-based permissions per endpoint
- Unique constraints on `email`, `phone`, `national_id`
- CORS configured for the frontend; CSRF-aware where applicable
- Validation and secure file upload handling for attachments and evidence
- Audit / history on key transitions (complaint and case state changes)
- Externalized configuration via `.env` (`SECRET_KEY`, DB creds, `CORS_ALLOWED_ORIGINS`, `REACT_APP_API_BASE_URL`, …)

---

## License

This project is part of the **Web Programming** course (Fall 1404, Faculty of Computer Engineering).
