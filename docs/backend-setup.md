# Backend Setup

The app now has a local repository and sync queue under `src/data`. The current UI still works offline-first; cloud sync stays disabled until the backend variables are configured.

## Phase 1 Backend

This first backend pass uses:

- Vercel API routes in `api/sync`
- Supabase Postgres as durable storage
- A generic `sync_records` table for queued record snapshots

This is a migration layer, not the final domain model. It lets us back up and sync the current app safely before splitting high-value areas like finance and habits into richer relational tables.

## What You Need To Do

1. Create a Supabase project.
2. Open the Supabase SQL editor and run `supabase/migrations/001_sync_records.sql`.
3. Copy `.env.example` into your local `.env.local` values without deleting your existing variables.
4. Add these variables locally and in Vercel:

```bash
VITE_SYNC_ENABLED=true
VITE_SYNC_WRITE_TOKEN=<temporary-random-token>
SUPABASE_URL=<your-supabase-project-url>
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-secret-key>
SYNC_WRITE_TOKEN=<same-temporary-random-token>
SYNC_USER_ID=liam
```

Use Supabase's backend-only `sb_secret_...` key here. Older projects may call the equivalent key `service_role`. Do not use the `sb_publishable_...` key for `SUPABASE_SERVICE_ROLE_KEY`.

`SYNC_WRITE_TOKEN` is a temporary personal-app gate so the endpoint does not accept public writes. It is not a replacement for real user auth because the matching `VITE_` value is visible in the browser. The next backend phase should replace this with Supabase Auth and per-user row-level security.

## Current Sync Behavior

- `useStore` writes still update local storage immediately.
- Syncable store writes are queued in `let_syncQueue`.
- If `VITE_SYNC_ENABLED=true`, the client pushes queued mutations to `/api/sync/push`.
- `/api/sync/pull` can fetch the remote snapshot, but automatic hydration is intentionally not enabled yet.

Plain `vite` development serves the React app only. The `/api/sync/*` functions run on Vercel, or locally through `vercel dev` if the Vercel CLI is installed.

## Next Phase

After the Supabase project is configured, the next build step should be:

1. Add a Settings sync status panel.
2. Add manual "Push now" and "Pull backup" actions.
3. Add proper auth.
4. Graduate finance transactions, habit completions, and budgets from sync snapshots into relational tables.
