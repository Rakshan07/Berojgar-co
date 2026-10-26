> Update: backend integration is now implemented for the core workspace flows. See [BACKEND_CONNECTION.md](BACKEND_CONNECTION.md) for the current startup instructions and remaining feature work. The notes below describe the earlier UI-only stage.

# Workspace interface integration

Implemented on `website-interface`. No commit or push was made.

## Run locally

From this project directory:

```powershell
npm.cmd run dev
```

Use the URL printed by Vite, then open:
- `/dashboard` — participant overview
- `/profile` — primary details, contributions, XP and history layout
- `/events` — server-backed event search/category filters and pagination
- `/organizer` — organizer overview
- `/organizer/events` — owned events, filtered using the authenticated server user ID
- `/organizer/create` — four-step event brief and draft creation

The API defaults to `http://localhost:8000/api/v1`. Override only the public API URL with `VITE_API_BASE_URL` if needed. Never add database credentials to VITE variables.

## What changed

The authenticated workspace now uses the approved preview's Wine + Garnet styling, responsive sidebar, panels and typography. New modules live under `src/workspace`; the router loads the workspace separately. The previous public landing animation, login and organizer authentication files are unchanged. Legacy demo page files are retained but are no longer routed into the workspace. The new pages never read seeded event/team/profile collections from AppContext.

API operations use the existing `teamweave_token` bearer token. Failed requests show errors, not fake data or success toasts. Event creation saves a server draft only; no fake local publication or AI responses are generated. Search and category filters use server queries and reset pagination. The organizer list is filtered by server-authenticated ownership, with counts labelled as page-local because the current API does not provide an owner-scoped aggregate endpoint.

## Integration still required before production

This is the UI integration, not completion of the backend:
- The existing backend ORM expects different names from the installed hackloop database. Align them before expecting live requests to succeed. Do not run bootstrap.sql over the existing database.
- Existing login reads `data.tokens.access_token`, but the backend contract returns `data.access_token`. It also has local demo fallback behavior. Authentication is your teammate's area and was not changed here. The new workspace will not treat those local profiles as a server session.
- Account and profile reads use `/auth/me` and `/profiles/me`. The existing profile PATCH supports bio; the Edit profile form saves that supported field only. Primary contact/education edits need the corresponding authenticated backend fields/endpoints before enabling them. Missing data is labelled unavailable.
- XP reads `/challenges/xp/me`. Level thresholds, personal registrations, team lists, contribution summaries, feedback, and event history lack suitable authenticated endpoints. These areas deliberately show unavailable values rather than zeros or fake completed events. Add these endpoints and connect them in the workspace.
- The server category catalog is used in event creation. All requested fields are available in the browsing filters, but matching category IDs must also be supported by the backend catalog.
- Organizer verification must be enforced server-side. This frontend does not treat account email verification or a local role switch as organizer approval. Draft saves require a server organizer/admin role. Publishing and AI generation are not enabled until verification and review integration is complete.
- Personalized question generation, moderation, performance scoring and XP award policy still need implementation and end-to-end tests. No AI provider was called in this change.
- Existing legacy roster/team/matching pages performed local/demo operations. Their routes now display activity placeholders rather than executing misleading fake actions.

## Validation

- Production build passed. The pre-existing public bundle remains large and Vite emits a chunk-size warning.
- Changed files pass oxlint without warnings; whole-repository lint completes with warnings in existing files.
- Six workspace routes rendered in server-side smoke tests; checked for seeded demo names/IDs.
- API adapter checks passed for bearer token use, empty server results, and 401/403 failures. No real API writes were performed for tests.
- Browser visual testing could not complete: the sandboxed Edge launch failed and the in-app browser could not reach the local preview. Please review desktop and mobile layouts locally before committing.
