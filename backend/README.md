# TeamWeave — Backend & Database Engine

Production-grade, asynchronous backend and relational database for **TeamWeave** — an intelligent, skill-based hackathon team formation and collaboration platform.

---

## 1. Technology Stack

- **Runtime & Web Framework:** Python 3.14+, [FastAPI](https://fastapi.tiangolo.com/) with asynchronous route handlers and lifespan management.
- **Relational Database:** PostgreSQL hosted on [Neon](https://neon.tech/) with connection-pooler compatibility.
- **ORM & Data Layer:** [SQLAlchemy 2.0](https://www.sqlalchemy.org/) with typed Mapped attributes, explicit `hackloop` schema qualification, and atomic transactions.
- **Migrations:** [Alembic](https://alembic.sqlalchemy.org/) versioned migrations targeting the `hackloop` schema.
- **Validation & Serialization:** [Pydantic v2](https://docs.pydantic.dev/latest/) with strict request schemas and domain responses.
- **Security & Authentication:** Argon2id password hashing via `argon2-cffi` and signed JWT bearer tokens (`pyjwt`).
- **AI Integrations:** Pluggable adapter architecture with deterministic mock generators and resilient OpenAI LLM clients with automated fallback.
- **Testing:** `pytest` test suite covering Auth, Profiles, Events, AI Event Setup, Deterministic Matching, and Member Replacements.

---

## 2. Directory Structure

```text
backend/
├── alembic/                      # Alembic migration scripts and env.py
│   └── versions/
│       └── 0001_initial_hackloop_schema.py
├── alembic.ini                   # Alembic configuration (schema: hackloop)
├── app/
│   ├── api/                      # REST endpoints and request dependencies
│   │   ├── dependencies.py       # Auth extraction (JWT + X-User-Id persona header)
│   │   └── routes/               # Modular route controllers (/api/v1/...)
│   │       ├── ai_setup.py
│   │       ├── assessments.py
│   │       ├── auth.py
│   │       ├── challenges.py
│   │       ├── events.py
│   │       ├── health.py
│   │       ├── matching.py
│   │       ├── profiles.py
│   │       └── teams.py
│   ├── core/                     # Application configuration, logging, security
│   │   ├── config.py
│   │   ├── logging.py
│   │   ├── permissions.py
│   │   └── security.py
│   ├── db/                       # Engine, session factory, base metadata
│   │   ├── base.py
│   │   └── session.py
│   ├── integrations/             # AI Providers and external services
│   │   └── ai/
│   │       ├── base.py           # Abstract Base Class (AIProvider)
│   │       ├── factory.py        # Provider factory (mock vs openai)
│   │       ├── mock_provider.py  # Deterministic test generator
│   │       └── openai_provider.py # Resilient OpenAI API client
│   ├── models/                   # SQLAlchemy 2.0 ORM domain entities (hackloop)
│   │   ├── ai_setup.py
│   │   ├── assessment.py
│   │   ├── auth.py
│   │   ├── event.py
│   │   ├── gamification.py
│   │   ├── matching.py
│   │   ├── notification.py
│   │   ├── organization.py
│   │   ├── profile.py
│   │   └── team.py
│   ├── schemas/                  # Pydantic v2 request/response transfer objects
│   │   ├── ai_setup.py
│   │   ├── assessment.py
│   │   ├── auth.py
│   │   ├── common.py
│   │   ├── event.py
│   │   ├── gamification.py
│   │   ├── matching.py
│   │   ├── notification.py
│   │   ├── profile.py
│   │   └── team.py
│   ├── services/                 # Domain business logic & algorithmic engines
│   │   ├── ai_event_setup_service.py
│   │   ├── auth_service.py
│   │   ├── challenge_service.py
│   │   ├── event_service.py
│   │   ├── matching_service.py   # Deterministic greedy complementary matcher
│   │   ├── profile_service.py
│   │   ├── registration_service.py
│   │   ├── replacement_service.py # Departure, gap analysis & candidate scoring
│   │   └── team_service.py
│   └── main.py                   # FastAPI ASGI entrypoint, CORS, OpenAPI setup
├── sql/
│   ├── bootstrap.sql             # Complete standalone DDL (44 tables, triggers, indexes)
│   ├── seed_demo.sql             # Idempotent seed script mirroring frontend demo personas
│   └── useful_queries.sql        # 14 parameterized production SQL queries
├── tests/                        # Pytest automated test suite
├── .env.example                  # Environment configuration template
└── requirements.txt              # Pinned Python package dependencies
```

---

## 3. Database Architecture (`hackloop` Schema)

The database isolates all platform tables within the `hackloop` PostgreSQL schema to prevent collision with public objects:

1. **Authentication & Identity:** `users`, `user_credentials`, `user_sessions`, `refresh_tokens`.
2. **Profiles & Skills:** `profiles`, `skills`, `profile_skills`, `skill_verifications`, `work_styles`.
3. **Organizations & Events:** `organizations`, `organization_members`, `events`, `event_categories`, `event_requirements`, `event_roles`, `event_registrations`.
4. **Skill Assessments:** `assessments`, `assessment_questions`, `submissions`, `submission_answers`, `submission_evaluations`.
5. **AI Event Setup Drafts:** `ai_setup_drafts`, `ai_generation_logs`.
6. **Matching Engine:** `matching_runs`, `proposed_teams`, `proposed_members`, `match_explanations`.
7. **Formed Teams & Governance:** `teams`, `team_members`, `team_blueprints`, `team_gaps`, `team_messages`, `team_checkins`.
8. **Departures & Replacements:** `member_departures`, `replacement_recommendations`, `replacement_actions`.
9. **Gamification & XP:** `daily_challenges`, `challenge_completions`, `xp_ledger`, `achievements`, `user_achievements`.
10. **Notifications & Auditing:** `notifications`, `audit_logs`.

### Proficiency Scale Mapping
All skill proficiencies are normalized to an integer scale `1..4`:
- **1 (`Exploring`):** Familiar with basics, learning foundations.
- **2 (`Developing`):** Can build standard features with documentation/guidance.
- **3 (`Independent`):** Autonomous, can design and deliver complete features.
- **4 (`Advanced / Can Mentor`):** Deep mastery, architectural leadership, can guide teammates.

---

## 4. Setup & Running Locally

### 4.1 Prerequisites
- Python 3.11+ (Python 3.14 verified)
- PostgreSQL database (or Neon cloud instance)

### 4.2 Installation
```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# Linux/macOS
source .venv/bin/activate

pip install -r requirements.txt
```

### 4.3 Configure Environment Variables
Create `.env` inside `backend/`:
```ini
ENVIRONMENT=development
PORT=8000
DATABASE_URL=postgresql://neondb_owner:npg_SKZfLsUm5g2u@ep-cold-meadow-b55av3de-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require
SECRET_KEY=teamweave-development-insecure-secret-key-32-chars-minimum
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
AI_PROVIDER=mock
OPENAI_API_KEY=
```

### 4.4 Run Database Migrations or Bootstrap
To run migrations via Alembic:
```bash
alembic upgrade head
```
Or execute the pure SQL scripts directly:
```bash
# Pure SQL DDL
psql "$DATABASE_URL" -f sql/bootstrap.sql
# Populate demo personas and teams
psql "$DATABASE_URL" -f sql/seed_demo.sql
```

### 4.5 Start API Server
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
- Interactive Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs)
- ReDoc Documentation: [http://localhost:8000/redoc](http://localhost:8000/redoc)
- Health Check: [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)

---

## 5. Seed Personas & Demo Data

The seed file `sql/seed_demo.sql` populates accounts matching the frontend's `demoData.js`. All demo users have the password `password123`:

| Handle | Name | Roles | Top Skills | Active Team |
| :--- | :--- | :--- | :--- | :--- |
| `asel` | Asel (Organizer) | Organizer, Full Stack | React (4), Python (4), System Design (3) | CivicPulse (`tm1`) |
| `marcus` | Marcus Vance | Backend, Data | Python (4), PostgreSQL (4), Docker (3) | CivicPulse (`tm1`) |
| `yuna` | Yuna Kim | UI/UX Designer | Figma (4), UI/UX (4), User Research (3) | CivicPulse (`tm1`) |
| `devraj` | Devraj Patel | Frontend Engineer | React (3), TypeScript (3), Tailwind (3) | CivicPulse (`tm1`) |
| `fatima` | Fatima Al-Zahra | ML Engineer | PyTorch (4), Python (4), NLP (3) | ClimateML (`tm2`, Gap: Frontend) |
| `leo` | Leo Brooks | Mobile / Fullstack | Flutter (4), Firebase (3), React Native (3) | ClimateML (`tm2`, Gap: Frontend) |

---

## 6. API Endpoints Overview (`/api/v1`)

### Authentication & Profiles
- `POST /api/v1/auth/register` — Register a new participant or organizer.
- `POST /api/v1/auth/login` — Authenticate and receive signed JWT.
- `GET /api/v1/auth/me` — Inspect current identity.
- `GET /api/v1/profiles/{user_id_or_handle}` — Full profile with skills, verified badges, and work style.
- `PUT /api/v1/profiles/me` — Update bio, timezone, links, work style.
- `POST /api/v1/profiles/me/skills` — Add or update skills with proficiency (1–4).

### Hackathon Events & Registrations
- `GET /api/v1/events` — List published hackathons.
- `POST /api/v1/events` — Create hackathon (Organizer only).
- `GET /api/v1/events/{id}` — Event details, skill requirements, roles.
- `POST /api/v1/events/{id}/register` — Concurrency-safe event registration with track selection.
- `GET /api/v1/events/{id}/participants` — List verified participants.

### AI Event Setup
- `POST /api/v1/ai-setup/generate` — Generate tracks, requirements, and assessment blueprints from plain English hackathon descriptions.
- `GET /api/v1/ai-setup/{draft_id}` — View and refine generated setup drafts.
- `POST /api/v1/ai-setup/{draft_id}/publish` — Convert draft into an active, published hackathon event.

### Skill Assessments & Verification
- `GET /api/v1/assessments/event/{event_id}` — Get active skill assessment questions for an event.
- `POST /api/v1/assessments/{assessment_id}/submit` — Submit answers for automated scoring and skill verification badges.

### Deterministic Team Matching Engine
- `POST /api/v1/matching/run` — Run explainable complementary matching algorithm.
- `GET /api/v1/matching/runs/{id}` — Retrieve proposed teams, synergy scores, and skill coverage rationale.
- `POST /api/v1/matching/runs/{id}/approve` — Organizer approval converting proposed teams into active platform teams.

### Teams & Blueprint Collaboration
- `GET /api/v1/teams/{team_id}` — Real-time team dashboard, member roles, and skill coverage.
- `GET /api/v1/teams/{team_id}/blueprint` — View the live Team Blueprint (architecture, API contracts, task assignments).
- `PUT /api/v1/teams/{team_id}/blueprint` — Collaborative updates to the team blueprint.
- `POST /api/v1/teams/{team_id}/messages` — Team chat messages.

### Member Departure & Dynamic Replacement
- `POST /api/v1/teams/{team_id}/depart` — Record member drop-out, recalculating team skill gaps.
- `GET /api/v1/teams/{team_id}/replacement-recommendations` — Algorithmic ranking of unassigned participants matching missing skills.
- `POST /api/v1/teams/{team_id}/apply-replacement` — Instant 1-click slot fill replacing the departed member.

### Gamification & XP
- `GET /api/v1/challenges/daily` — Get today's coding/collaboration challenge.
- `POST /api/v1/challenges/{id}/complete` — Submit challenge completion and earn verified XP.
- `GET /api/v1/challenges/ledger` — Audit trail of XP gains and level progression.

---

## 7. Frontend Integration (`Rakshan07/Berojgar-co`)

The backend is built to pair seamlessly with the existing React + Vite frontend:

1. **Base URL:** Point the frontend API client to `http://localhost:8000/api/v1`.
2. **Authentication:** Store the `access_token` from `/api/v1/auth/login` in `localStorage` and include it as `Authorization: Bearer <token>`.
3. **Demo Impersonation:** For quick testing or demo switching, use the `X-User-Id` header (e.g. `X-User-Id: usr_asel_001`), which bypasses login during development.
4. **Data Shapes:**
   - Skills retain `name` and integer `proficiency` (1..4) with matching level descriptions.
   - Team Blueprints follow the exact structure used in `TeamBlueprint.jsx`.
   - Matching Run outputs provide `synergy_score`, `skill_coverage`, and bulleted `explanations` matching `matchingService.js`.

---

## 8. Verification & Automated Tests

Run the full pytest suite:
```bash
python -m pytest backend/tests -v
```

All test suites execute against the live Neon PostgreSQL database in the isolated `hackloop` schema:
- `test_auth.py`: Registration, argon2 password verification, duplicate handling, JWT login.
- `test_events.py`: Event creation, draft states, registration with track selection, duplicate check.
- `test_ai_setup.py`: AI-assisted generation from prompt, draft publication into live event.
- `test_matching.py`: Deterministic complementary matching run, synergy computation, organizer approval.
- `test_replacement.py`: Member departure, automatic team gap identification, candidate scoring, slot fill.
