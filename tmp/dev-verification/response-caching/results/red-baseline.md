# RED Baseline — Response Caching

- Date: 2026-07-07
- Commit: `26c30be` (clean tree)
- Feature: NOT implemented. Every case is expected to FAIL (or be a runtime-guarded
  failure). Zero PASS rows — a PASS here would mean a broken test.

## Summary

| Layer | Cases | FAIL | PASS | BLOCKED |
|-------|-------|------|------|---------|
| Backend headers (vitest, in-process) | BE-1..BE-8 (8 tests) | 8 | 0 | 0 |
| Purge guard (vitest) | P-1 | 1 | 0 | 0 |
| Backend headers (live curl :8787) | BE-1..BE-8 | 8 | 0 | 0 |
| Frontend headers (live curl :3000) | FE-1..FE-5 | 5 | 0 | 0 |
| Config/module (file assertions) | BE-9, BE-10, FE-6 | 3 | 0 | 0 |
| **Total** | | **all FAIL** | **0** | **0** |

No PASS rows. RED baseline confirmed.

## 1. vitest — `apps/backend/src/lib/cache-control.verification.test.ts`

Command: `cd apps/backend && bunx vitest run src/lib/cache-control.verification.test.ts`
Result: **Test Files 1 failed (1) · Tests 9 failed (9)** in 936ms.

| ID | Case | Result | Reason |
|----|------|--------|--------|
| BE-1 | `GET /` cacheable | FAIL | `cache-control` is `null`, want `public, max-age=300, s-maxage=3600, stale-while-revalidate=86400` |
| BE-2 | `GET /doc` cacheable | FAIL | header `null` |
| BE-3 | `GET /reference` cacheable | FAIL | header `null` |
| BE-4 | `GET /health` no-store | FAIL | header `null`, want `private, no-store` |
| BE-5 | `GET /test` no-store | FAIL | header `null` |
| BE-6 | `GET /api/session` no-store | FAIL | header `null` |
| BE-7 | `GET /api/auth/ok` no-store | FAIL | header `null` |
| BE-8 | cache-tag on cacheable, absent on `/health` | FAIL | `cache-tag` on `/` is `null` (expected truthy) |
| P-1 | purge helper guarded | FAIL | `Cannot find module '@/lib/cache'` (module not created yet) |

## 2. config-check.sh — file assertions

Command: `bash tests/config-check.sh`
Result: **exit 1**, all FAIL.

| ID | Result | Detail |
|----|--------|--------|
| BE-9 | FAIL | no `{"cache":{"enabled":true}}` block; `compatibility_date=2025-10-08 < 2026-05-01` |
| BE-10 | FAIL | no `export const CACHE_ENABLED` in `apps/backend/src` |
| FE-6 | FAIL | no `{"cache":{"enabled":true}}` block; `compatibility_date=2025-09-27 < 2026-05-01` |

## 3. live-check.sh — live curl against dev servers

Servers: backend `bun run dev` on :8787 (started + stopped by harness);
frontend already serving the repo on :3000 (pre-existing dev server, all repo routes
respond — not started or stopped by the harness).
Command: `bash tests/live-check.sh`
Result: **exit 1**, all FAIL.

| ID | URL | Result | Detail |
|----|-----|--------|--------|
| BE-1 | `:8787/` | FAIL | cache-control absent |
| BE-2 | `:8787/doc` | FAIL | cache-control absent |
| BE-3 | `:8787/reference` | FAIL | cache-control absent |
| BE-4 | `:8787/health` | FAIL | cache-control absent |
| BE-5 | `:8787/test` | FAIL | cache-control absent |
| BE-6 | `:8787/api/session` | FAIL | cache-control absent |
| BE-7 | `:8787/api/auth/ok` | FAIL | cache-control absent |
| BE-8 | `:8787/{,doc,reference,health}` | FAIL | cache-tag absent on all cacheable routes |
| FE-1 | `:3000/` | FAIL | got `no-cache, must-revalidate`, want cacheable value |
| FE-2 | `:3000/login` | FAIL | cache-control absent |
| FE-3 | `:3000/signup` | FAIL | cache-control absent |
| FE-4 | `:3000/template` | FAIL | absent here, but control `/` not yet cacheable (differential) |
| FE-5 | `:3000/health-demo` | FAIL | absent here, but control `/` not yet cacheable (differential) |

## Notes / provenance of the run

- Backend booted cleanly with `apps/backend/.dev.vars`; `resolve-origins.ts` falls back
  to `DEFAULT_DEV_ORIGINS`, so `CORS_ORIGINS` is not strictly required (brief's warning
  was stale). Backend `/health` currently returns headers: `Vary`, `Access-Control-*`,
  `RateLimit-*`, `X-Request-Id` — no `cache-control`, confirming the RED state.
- Frontend `/` currently returns `cache-control: no-cache, must-revalidate` (TanStack
  Start SSR default) — not the target cacheable value, so FE-1 is RED.
- The harness left no server running that it started: the backend on :8787 was killed
  (verified `backend down confirmed`); the :3000 frontend was pre-existing and untouched.
- Re-run to GREEN after implementation: rerun all three commands above; every row must
  flip to PASS with no test edits.
