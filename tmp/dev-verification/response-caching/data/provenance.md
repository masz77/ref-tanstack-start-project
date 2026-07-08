# Provenance

All inputs are **live HTTP responses from the repo's own dev servers** plus static
files in this repo. No synthetic fixtures, no third-party data.

| Field | Value |
|-------|-------|
| Date recorded | 2026-07-07 |
| Repo | `ref-tanstack-start-project` |
| Baseline commit | `26c30be` (`feat(observability): enable native Workers tracing in both workers`) |
| Branch | `main` (clean working tree at capture) |
| Backend server | `cd apps/backend && bun run dev` → `wrangler dev` on `http://localhost:8787` |
| Frontend server | `cd apps/frontend && bun run dev` → `vite dev` (TanStack Start SSR) on `http://localhost:3000` |
| Backend env | `apps/backend/.dev.vars` present; `.env.test` present |
| Frontend env | no `.dev.vars` (vite dev serves SSR without it) |

## Input sources per case

- **BE-1..BE-8** — real HTTP responses from the backend Worker:
  - in-process: `buildApp()` from `apps/backend/src/app.ts`, driven via `app.request(path, {}, env)` with a real env (`CORS_ORIGINS`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`).
  - live: `curl` against `http://localhost:8787` while `bun run dev` runs.
- **FE-1..FE-5** — real HTTP responses from the frontend SSR server via `curl` against `http://localhost:3000`.
- **BE-9, BE-10, FE-6** — static files in the repo (`wrangler.jsonc` ×2, `apps/backend/src`).
- **P-1** — the central cache module `@/lib/cache` invoked in the vitest (non-Cloudflare) runtime.

## Route existence (verified at capture, commit `26c30be`)

- Backend routes: `/`, `/health`, `/test`, `/api/session`, `/api/auth/*` (better-auth, incl. `/api/auth/ok`), `/doc`, `/reference` — see `apps/backend/src/app.ts`, `features/health/routes.ts`, `features/session/routes.ts`, `features/auth/routes.ts`, `lib/configure-open-api.ts`.
- Frontend routes: `/` (`index.tsx`), `/login`, `/signup`, `/template`, `/health-demo` — see `apps/frontend/src/routes/`.

The RED baseline run output is captured in `../results/red-baseline.md`.
