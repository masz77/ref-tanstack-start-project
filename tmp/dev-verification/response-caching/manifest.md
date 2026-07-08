# Response-Caching Verification Harness — Manifest

Objective, RED-first verification for the response-caching feature. Every case is
written to **FAIL before implementation** (RED baseline). A PASS on any case before
the feature exists means that case is broken and must be fixed.

- Repo: `ref-tanstack-start-project` (bun monorepo)
- Backend: Hono on Cloudflare Workers, dev port **8787** (`cd apps/backend && bun run dev`)
- Frontend: TanStack Start SSR, dev port **3000** (`cd apps/frontend && bun run dev`)
- Baseline commit: `26c30be`, date `2026-07-07` (see `data/provenance.md`)

## The contract (exact expected values)

### Backend cache-control (`cache-control` response header)

| ID | Requirement | Real input | How to run | Expected outcome | Pass rule |
|----|-------------|------------|------------|------------------|-----------|
| BE-1 | Cacheable index | `GET http://localhost:8787/` | vitest `app.request("/")` + `live-check.sh` | header `public, max-age=300, s-maxage=3600, stale-while-revalidate=86400` | exact string match |
| BE-2 | Cacheable OpenAPI JSON | `GET /doc` | same | same value as BE-1 | exact string match |
| BE-3 | Cacheable API reference | `GET /reference` | same | same value as BE-1 | exact string match |
| BE-4 | Non-cacheable health | `GET /health` | same | `private, no-store` | exact string match |
| BE-5 | Non-cacheable DB probe | `GET /test` | same | `private, no-store` | header only (route may 500 without D1 locally — assert header, not status) |
| BE-6 | Non-cacheable session | `GET /api/session` | same | `private, no-store` | exact string match |
| BE-7 | Non-cacheable auth | `GET /api/auth/ok` | same | `private, no-store` | exact string match |
| BE-8 | Cache tags on cacheable routes | `GET /`, `/doc`, `/reference`, `/health` | vitest + `live-check.sh` | `cache-tag` header non-empty on `/`, `/doc`, `/reference`; absent on `/health` | **single combined case**: passes only if non-empty on all three cacheable routes AND absent on `/health`. Fails if any part fails (the `/health`-absent sub-part alone is a negative control and never fails on its own). |
| BE-11 | CORS preflight not shared-cacheable | `curl -sI -X OPTIONS localhost:8787/ -H "Origin: http://localhost:3000" -H "Access-Control-Request-Method: GET"` | `live-check.sh` + vitest (`cache-control.test.ts`, builder-owned) | preflight response must NOT carry the public cacheable header | **differential**: preflight `cache-control` has no `public,` value AND the plain `GET /` control DOES carry `public,` (proves the guard suppresses caching on preflight, not that caching is globally absent). RED until the feature ships. |
| BE-12 | Origin-tainted GET never shared-cached | `curl -sI localhost:8787/ -H "Origin: http://localhost:3000"` | `live-check.sh` + vitest (`cache-control.test.ts`, builder-owned) | `cache-control: private, no-store` | exact string match (Origin-tainted responses never enter shared caches). |

### Backend config / module (file assertions)

| ID | Requirement | Real input | How to run | Expected outcome | Pass rule |
|----|-------------|------------|------------|------------------|-----------|
| BE-9 | Workers cache enabled | `apps/backend/wrangler.jsonc` | `config-check.sh` | contains `"cache": { "enabled": true }` | block present. (compat-date floor DROPPED — see Revision log R2.) |
| BE-10 | Central toggle constant | `apps/backend/src/**` | `config-check.sh` | a module exports `CACHE_ENABLED` | `export const CACHE_ENABLED` found in `apps/backend/src`. NOTE: full toggle-OFF behavior (no cache-control emitted when `CACHE_ENABLED=false`) is verified in code review + a unit test the implementer writes — this harness only asserts the constant exists. |

### Frontend cache-control (`cache-control` response header)

| ID | Requirement | Real input | How to run | Expected outcome | Pass rule |
|----|-------------|------------|------------|------------------|-----------|
| FE-1 | Cacheable home | `GET http://localhost:3000/` | `live-check.sh` | `public, max-age=0, s-maxage=600` | exact string match |
| FE-2 | Cacheable login | `GET /login` | same | same value as FE-1 | exact string match |
| FE-3 | Cacheable signup | `GET /signup` | same | same value as FE-1 | exact string match |
| FE-4 | Non-cacheable template | `GET /template` | same | NO `cache-control` header | **differential**: `/template` lacks `cache-control` AND control route `/` carries the cacheable header. Absence alone is not enough — pre-feature the whole app lacks caching, so a bare absent-check would falsely pass. Tying it to the cacheable sibling keeps it RED until the feature ships. |
| FE-5 | Non-cacheable health-demo | `GET /health-demo` | same | NO `cache-control` header | **differential**: same rule as FE-4, control route `/`. |
| FE-6 | Frontend cache config | `apps/frontend/wrangler.jsonc` | `config-check.sh` | contains `"cache": { "enabled": true }` | block present. (compat-date floor DROPPED — see Revision log R2.) |

### Purge helper (unit)

| ID | Requirement | Real input | How to run | Expected outcome | Pass rule |
|----|-------------|------------|------------|------------------|-----------|
| P-1 | Purge helper is runtime-guarded | central cache module `@/lib/cache` | vitest | `purgeCacheTags(tags)` (single arg) invoked in the vitest (non-Cloudflare) environment resolves without throwing — no static `import "cloudflare:workers"` that would crash other hosts | helper is a function AND the call resolves (no-op or error-return, not crash). The vitest contract file is owned by the backend builder. |

## Central module contract (defines where the implementer must put things)

RED harness IS the contract. The implementer MUST satisfy:

- **`apps/backend/src/lib/cache.ts`** — the central cache module. Exports:
  - `export const CACHE_ENABLED: boolean` (BE-10, the master toggle)
  - `export async function purgeCacheTags(tags: string[], env: unknown): Promise<...>` — guarded so it does NOT statically `import "cloudflare:workers"` (P-1). Dynamic import / capability check only.
- Cache-control + cache-tag emission (BE-1..BE-8) is expected via a Hono middleware that reads `CACHE_ENABLED`. Exact middleware file is the implementer's choice; the header values above are the contract.

## Runnable artifacts

| File | Cases | Notes |
|------|-------|-------|
| `apps/backend/src/lib/cache-control.verification.test.ts` | BE-1..BE-8, P-1 | In-process vitest against `buildApp()`. Lives under `apps/backend/src` because vitest (`bun run test`) only discovers tests there and needs the `@` alias. **Doubles as the promoted permanent test** — it fails now (RED), passes after implementation. A copy is kept in `tests/be-headers.test.ts` for the harness record. |
| `tests/live-check.sh` | BE-1..BE-8, BE-11, BE-12, FE-1..FE-5 | curl against already-running dev servers. Starts nothing. PASS/FAIL table, exit 1 on any FAIL. |
| `tests/config-check.sh` | BE-9, BE-10, FE-6 | Static file assertions. Exit 1 on any FAIL. |

## Deviations from the brief

- The brief warned "CORS_ORIGINS is required or CORS middleware throws". The real
  `apps/backend/src/lib/resolve-origins.ts` falls back to `DEFAULT_DEV_ORIGINS` when
  unset, so the app boots without it. The vitest still passes a `CORS_ORIGINS` env to
  mirror production.
- P-1 uses a **dynamic** `import("@/lib/cache")` inside the test so a missing module
  fails only P-1, not the whole file — keeping BE-1..BE-8 failing on the *header*
  assertion (proving they test the header, not a load error).
- **Negative assertions were made differential.** FE-4/FE-5 (require no header) and the
  `/health` part of BE-8 (require no tag) are satisfied by the null pre-feature state and
  would falsely PASS. FE-4/FE-5 in `live-check.sh` now also require the cacheable control
  route to carry its header (RED until the feature ships). BE-8 is one combined case that
  fails unless the positive parts hold. The vitest BE-8 was already combined this way.

## Revision log (evidence-driven contract changes — 2026-07-08)

Final review confirmed these with cited evidence. They tighten/correct the contract; they
do not weaken it.

- **R1 — FE HTML drops `stale-while-revalidate`.** FE-1..FE-3 expected value changed from
  `public, max-age=0, s-maxage=600, stale-while-revalidate=86400` to exactly
  `public, max-age=0, s-maxage=600`. Reason: browsers honor SWR too (Chrome 75+/FF 68+),
  so a stale HTML doc would be served client-side while referencing hashed asset URLs that
  404 — Workers static assets serve only the current deploy's manifest, not old hashes.
- **R2 — Compat-date floor dropped (BE-9/FE-6).** Removed the `compatibility_date >= 2026-05-01`
  assertion. Reason: Cloudflare docs state no minimum compatibility date for Workers Cache;
  the dates are being reverted to `2025-10-08` (backend) / `2025-09-27` (frontend). The
  `"cache": { "enabled": true }` block assertion stays for both wrangler.jsonc files.
- **R3 — Added BE-11, BE-12.** CORS-interaction guards the code now enforces (preflight and
  Origin-tainted GETs must not become shared-cacheable). Live-check + builder-owned vitest
  in `apps/backend/src/lib/cache-control.test.ts`. BE-11 is differential (see its row).
- **R4 — P-1 helper signature is `purgeCacheTags(tags)`** (single arg, dropped the `env`
  param). Manifest wording synced; the vitest contract file is owned by the backend builder.
  NOTE: the promoted RED test `cache-control.verification.test.ts` still calls
  `purgeCacheTags(["…"], {})`; the extra second arg is harmless (ignored by a single-arg
  impl), so it stays GREEN-compatible without an edit from this harness.
