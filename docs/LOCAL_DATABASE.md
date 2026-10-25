# Local PostgreSQL connection

This repository was frontend-only. The added Node API provides a connection/schema check and a read-only endpoint for published events. It does not replace the existing demo authentication or dashboard/localStorage workflows.

## Configure

Open `.env` in the project root. Replace `REPLACE_LOCALLY` on the `PGPASSWORD` line with your PostgreSQL account password. Keep it private. For passwords containing `#` or spaces, use a quoted value supported by Node's env-file format. Do not put credentials in variables prefixed `VITE_`.

The defaults are localhost:5432, database `hackloop`, and user `postgres`. This is a local setup only. Use a dedicated least-privilege database role before deploying. No role changes, migrations, seed inserts, or destructive statements are run by these commands.

## Verify

```powershell
npm run db:check
```

This checks authentication, the `hackloop` schema, and core tables. It prints table names but never passwords or database rows. Missing tables cause a nonzero exit. Reconcile the earlier schema SQL with the app before implementing write APIs.

## Run

Terminal 1:

```powershell
npm run dev:api
```

Terminal 2:

```powershell
npm run dev
```

Open the Local URL printed by Vite and append `/database-connection`. Press **Check database connection**. This page is registered only during development. It queries PostgreSQL through the Vite `/api` proxy and displays real published events (or an empty list).

- `GET /api/health`: backend process status.
- `GET /api/health/database`: actual connection and schema readiness.
- `GET /api/events`: up to 100 published database events. It never substitutes fictional records.

The API binds only to 127.0.0.1. The default API port is 3001. If changed, also update the Vite proxy target. `vite preview` does not supply this development proxy; this is not a production deployment configuration.

## Remaining implementation

The existing signup/login, profile editing, event registration/creation, team management, and progression still use demo/localStorage code. They must be migrated to authenticated backend endpoints with authorization and transaction rules before real use. No connection check can make those existing actions database-backed automatically. Do not deploy the demo account picker or trust browser-selected organizer/admin roles.
