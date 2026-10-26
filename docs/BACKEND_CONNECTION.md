# Connected workspace — website-interface

## Start locally (two terminals, from the repository root)

Backend:
```powershell
.\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

Frontend:
```powershell
npm.cmd run dev
```

Use the Vite URL (normally http://localhost:5173). Sign up/sign in through the existing animated login pages. Existing fake demo identities cannot authenticate; create a real account or use an existing database account with a valid password. Session tokens from the old JWT backend are invalid; sign in again.

For a new machine, install Python 3.12+, create `.venv`, and install `backend/requirements-live.txt`. This machine's environment is already installed. Create the original database schema and apply the dashboard additions migration; do not use the incompatible legacy bootstrap against the existing database.

The runtime reads the root `.env` PGHOST/PGPORT/PGDATABASE/PGUSER/PGPASSWORD. Those PG values take precedence when PGPASSWORD is present. Database passwords never enter the browser. `VITE_API_BASE_URL` optionally changes the public API endpoint only. If Vite chooses a different port, add its exact origin to CORS_ORIGINS.

## Completed and tested
- The mounted API now queries the installed schema in `backend/app/live`, without running seed or bootstrap SQL.
- Real registration, password verification, hashed random session tokens, session expiry and logout revocation.
- No demo authentication fallback; public registration cannot request administrator privileges; X-User-Id is not accepted.
- Owner-only profile details and edits, including phone/address and college/course/year.
- Public event discovery with filtering/pagination; drafts are private to their owner.
- Organizer-owned event list and server-enforced organization approval for creating/publishing.
- Draft creation, publishing, idempotent registration and capacity/deadline checks under an event row lock.
- Personal registrations, teams, assessments list, verified history, XP/levels and contribution/feedback counts from database records.
- Suggested events use actual overlapping skills, not invented matching percentages.
- Organizer participant/team/outcome lists are scoped to owned events.
- Organizer verification submission and admin review API. No automatic approval on registration.
- Preserved opening animation and Wine + Garnet auth appearance. Removed the demo shortcuts and corrected form payload/session handling.

## Still separate feature work
These fixes connect the current screens; they do not implement the entire platform:
- Document upload/review UI for organizer approval. `/organizer/verification` accepts an already-stored evidence key; this is not an upload service. Approved records require an administrator decision through the authenticated review API or your team's admin tooling. No account was promoted or approved in your actual database.
- AI question generation, assessment answering/evaluation screens, automatic matching, team collaboration, result-entry/moderation and awarding/reversing XP remain feature work. Existing records can now be read; no invented AI results or automatic XP are produced.
- The old ORM/services and their tests are retained for reference but are not mounted by this schema-compatible entry point. Their incompatible schema, mock AI and impersonation behavior must be reconciled before reuse. Legacy routes not explicitly supported return 404 instead of running against the wrong tables.
- Event skill requirements are stored against roles using the original schema's importance field. More detailed proficiency/target constraints need a future schema/contract decision.
- Email verification, password reset, distributed login rate limiting, secure file upload and deployment hardening need implementation before public production launch. CORS is restricted to configured local origins.

## Verification
Integration tests in `backend/tests_live` use a separate disposable PostgreSQL instance on port 55439, containing the original schema plus the dashboard migration. They never target hackloop. They cover successful account/profile/event flows, forbidden admin signup and impersonation, private profile isolation, organizer approval, private draft access, publication ownership, registration idempotency/capacity, workspace reads, and session revocation. Never point this test suite at a real database.

The frontend build and changed-file lint are checked separately. Browser visual review still needs local verification because the browser automation environment could not load the preview.

## Credential cleanup
The repository had a hard-coded remote database password and a tracked backend/.env. The hard-coded default was removed. The old .env content was preserved locally in gitignored backend/.env.local, and the tracked file now contains only instructions. This does not erase secrets from Git history: rotate previously committed credentials before sharing/pushing.

No commit, push, production migration, or real user/event test inserts were performed for this integration.

## Schema files for new developer databases
Use `backend/sql/installed_base_schema.sql` followed by `backend/sql/dashboard_additions.sql` on an EMPTY database with PostgreSQL 18 and psql. These are a schema-only snapshot plus the applied migration; no users, passwords, events, or rewards are included. Your existing hackloop database already has both and needs neither rerun. Level/XP policy records must be agreed by the team; the app will not invent thresholds.

### Local port handling
The frontend now defaults to the relative `/api/v1` URL. Vite forwards `/api` to `http://127.0.0.1:8000` in development and preview, so a fallback frontend port such as 5174 does not require a CORS change. Restart Vite after updating its configuration. For production, configure the host/reverse proxy to forward `/api` to the backend, or explicitly set `VITE_API_BASE_URL` and the corresponding backend CORS origin. An explicit VITE_API_BASE_URL bypasses the local proxy.

## Required primary details after signup
New accounts go from signup to `/complete-profile`, save primary details, then enter the participant or organizer workspace. Sign-in and direct workspace navigation also send incomplete accounts to this form. Completion is recorded in `profiles.onboarding_completed_at` only after all required details pass server validation and are saved in the same transaction.

`profiles.academic_year` stores a calendar year (1900–2200, such as 2026). The earlier `study_year` column is retained solely for legacy data; it is no longer used by the profile UI. Existing values were not reinterpreted or deleted.

The migration `backend/sql/profile_onboarding.sql` has already been applied to this machine's hackloop database after a backup. Other developers should apply it after the base schema and dashboard migration. Restart the backend to load the new endpoint and account-completion flag. Existing accounts without a completion marker will be asked to complete their details once.

Tests verify required/blank input rejection, acceptance and persistence of 2026/2027, rejection of 12 as a calendar year, the completion flag, and separation between users' profiles. Build and changed-file lint pass; browser visual testing remains a local review step.

## Password recovery and intro cleanup

The intro photo rotation/reveal remains; its progress bar and phase counters are removed.
Participant and organizer sign-in link to /forgot-password. Emails link to /reset-password
with a fragment token. Links expire after 15 minutes, are single use, and only the latest
link works. Resetting revokes existing sessions. Requests are rate limited per email and
client, and known/unknown accounts receive the same response text. SMTP failures revoke
the issued link and are logged without secrets.

Apply backend/sql/password_reset.sql once to an existing database; it adds only the
password_reset_requests rate-limit table and indexes. This was applied to the local
hackloop database. Teammates should apply this migration too.

Root .env (ignored by Git) requires SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD,
SMTP_FROM, SMTP_USE_SSL and PUBLIC_APP_URL. For Gmail use smtp.gmail.com, port 587,
SMTP_USE_SSL=false and a Google App Password. Never use VITE_ for these secrets.
PUBLIC_APP_URL must match the frontend; currently http://localhost:5174. Local reset
links work on the machine running the website. Deployment needs the public HTTPS URL.
Restart the backend after configuration/code changes.

Validation: frontend production build and changed-file lint pass. Account/event and
password-reset integration tests pass in a disposable database with mail delivery
mocked. Gmail TLS authentication was verified without sending email. Inbox delivery
and browser visual verification still require a manual check.
