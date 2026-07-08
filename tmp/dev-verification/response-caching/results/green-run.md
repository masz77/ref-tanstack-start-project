# GREEN Run — Response Caching

- Date: 2026-07-08
- Branch: `feat/response-caching` (working-tree changes + committed doc `6b55d2e`)
- Judge: independent re-run of the full manifest. Builder claims not trusted.

## Summary

| Layer | Cases | PASS | FAIL |
|-------|-------|------|------|
| Backend headers (vitest, in-process) | BE-1..BE-8 | 8 | 0 |
| Purge guard (vitest) | P-1 | 1 | 0 |
| Backend headers (live curl :8787) | BE-1..BE-8 | 8 | 0 |
| Frontend headers (live curl :3299) | FE-1..FE-5 | 5 | 0 |
| Config/module (file assertions) | BE-9, BE-10, FE-6 | 3 | 0 |
| Full backend suite (`bun run test`) | 84 tests | 84 | 0 |
| **Total** | | **all PASS** | **0** |

## 1. vitest — cache-control.verification.test.ts
`cd apps/backend && bunx vitest run src/lib/cache-control.verification.test.ts`
Result: **Test Files 1 passed · Tests 9 passed (9)**.

| ID | Case | Result |
|----|------|--------|
| BE-1 | `GET /` cacheable | PASS |
| BE-2 | `GET /doc` cacheable | PASS |
| BE-3 | `GET /reference` cacheable | PASS |
| BE-4 | `GET /health` no-store | PASS |
| BE-5 | `GET /test` no-store (header only, route 500 w/o D1) | PASS |
| BE-6 | `GET /api/session` no-store | PASS |
| BE-7 | `GET /api/auth/ok` no-store | PASS |
| BE-8 | cache-tag on cacheables, absent on `/health` | PASS |
| P-1 | purge helper guarded (resolves, no throw) | PASS |

## 2. config-check.sh
`bash tmp/dev-verification/response-caching/tests/config-check.sh` → exit 0.

| ID | Result | Detail |
|----|--------|--------|
| BE-9 | PASS | cache block present, compatibility_date=2026-05-01 (>= 2026-05-01) |
| BE-10 | PASS | `export const CACHE_ENABLED` in apps/backend/src/lib/cache-control.ts |
| FE-6 | PASS | cache block present, compatibility_date=2026-05-01 (>= 2026-05-01) |

## 3. Live curl — backend (:8787, server started+killed by judge)

| ID | URL | cache-control | cache-tag | Result |
|----|-----|---------------|-----------|--------|
| BE-1 | `/` | public, max-age=300, s-maxage=3600, stale-while-revalidate=86400 | static,api-index | PASS |
| BE-2 | `/doc` | (same cacheable) | static,openapi | PASS |
| BE-3 | `/reference` | (same cacheable) | static,reference | PASS |
| BE-4 | `/health` | private, no-store | (absent) | PASS |
| BE-5 | `/test` | private, no-store | (absent) | PASS |
| BE-6 | `/api/session` | private, no-store | (absent) | PASS |
| BE-7 | `/api/auth/ok` | private, no-store | (absent) | PASS |
| BE-8 | tags on cacheables, none on /health | — | — | PASS |

## 4. Live curl — frontend (:3299, judge's own server; pre-existing :3000 served stale HMR headers so a fresh server was used and killed)

| ID | URL | cache-control | Result |
|----|-----|---------------|--------|
| FE-1 | `/` | public, max-age=0, s-maxage=600, stale-while-revalidate=86400 | PASS |
| FE-2 | `/login` | (same) | PASS |
| FE-3 | `/signup` | (same) | PASS |
| FE-4 | `/template` | (absent) + control `/` cacheable | PASS |
| FE-5 | `/health-demo` | (absent) + control `/` cacheable | PASS |

## 5. Full backend suite
`cd apps/backend && bun run test` → **Test Files 7 passed · Tests 84 passed (84)**, 0 fail. Includes the new toggle unit test (`cache-control.test.ts`: stamps NO headers when disabled).

## Notes
- All servers started by the judge were killed; pre-existing frontend :3000 was left untouched.
- FE wrangler compat date 2026-05-01 exceeds the locally installed Workers runtime (2026-03-05); wrangler falls back locally but the value meets the spec (>= 2026-05-01) and is honored on deploy with an updated runtime.

RESULT: GREEN — every case flipped from the RED baseline to PASS with no test edits.
