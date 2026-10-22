# Unified App (one Worker, TanStack Start + server functions)

## Overview

This repo moves from **two Cloudflare Workers** (a Hono API under `apps/backend` and a TanStack
Start app under `apps/frontend`, talking to each other cross-origin) to **one TanStack Start app**
that renders the UI *and* serves the API from the same origin. The UI talks to the server through
TanStack **server functions**; a small `@hono/zod-openapi` app stays mounted under `/api/*` so the
public HTTP API (index, health, OpenAPI doc, Scalar reference) is still there. The load-bearing
consequence: cookies become `SameSite=Lax`, CORS disappears, and there is no `VITE_BACKEND_URL` to
get wrong. The old two-app architecture is preserved on the `split-fe-be` branch (created from
`a22cf5d`); `main` gets the unified app.

Status: the decisions below are **approved and final** (user-approved 2026-10-22). The code changes
are **not built yet** — every file in the "Proposed code layout" section is marked ⬜ planned. See
[Migration path](#migration-path).

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Branch layout | `split-fe-be` (from `a22cf5d`) keeps the two-app architecture; `main` gets the unified app | Keeps the old topology recoverable and reviewable instead of deleting it outright. |
| Package layout | ONE package at the repo root, no bun workspaces. FE `src/` → root `src/`; backend code → `src/server/` | A single Worker with a single `wrangler.jsonc` and a single `package.json` removes the cross-package build/type dance and the `@repo/backend` workspace dependency. |
| Auth transport | Same-origin. better-auth stays mounted over HTTP at `/api/auth/*`; sign-in stays client-side through `authClient` | better-auth's browser client needs a real HTTP endpoint. Same-origin keeps that endpoint while removing every cross-origin cookie workaround. |
| Session cookie | `SameSite=Lax` (was `None`) | Same-origin requests do not need `None`; `Lax` is the browser default and blocks cross-site sends. `Secure` and the `__Secure-` prefix stay on for HTTPS origins (see [Auth § Architecture Decisions](./auth.md#architecture-decisions)). |
| CORS | Removed | Same-origin means there is no second origin to allow. `CORS_ORIGINS` and `CORS_MAX_AGE` are deleted from the env surface. |
| `trustedOrigins` | The app's own origin only | better-auth's CSRF boundary must match the app's real origin now that CORS is gone. |
| Google OAuth redirect URI | `<app-origin>/api/auth/callback/google` | The callback must land on the same origin that owns the session cookie. |
| `BETTER_AUTH_URL` | The app origin | better-auth derives its cookie prefix and trusted origins from it. |
| Public HTTP API | Kept: a small `@hono/zod-openapi` app mounted through ONE TanStack server route at `/api/*`, serving `/api` (index), `/api/health`, `/api/test`, `/api/doc` (OpenAPI JSON), `/api/reference` (Scalar) | The template is meant to be deployed on Cloudflare and to serve its own API. One mount point keeps the Hono surface reachable and documented without a second Worker. |
| Server-function return shape | Plain data — no `{ data }` envelope | Server functions are internal RPC; the envelope is noise. The Hono public routes keep their existing `{ data }` envelope (see [Shared Types](./shared-types.md)). |
| Rate limiting | Cloudflare Rate Limiting **binding**, inside server-function middleware, **OFF by default**. Opt in with an in-code constant (like `CACHE_ENABLED`) plus a commented `ratelimits` block in `wrangler.jsonc`. When off, or when the binding is missing, the middleware does nothing | Replaces `hono-rate-limiter` (in-memory store + per-Worker-instance state) with a real edge-side limiter — but off by default so a missing binding never breaks the app. |
| Unwired backend code | Event emitter, `CronManager`, Stripe plans, KV `CacheService`, `purgeCacheTags`, validation middleware, `public/_logs` dashboard — kept ONLY on `split-fe-be`, removed from `main` | None of it is wired to a route today. Carrying it into the unified app would mean porting dead weight plus its deps (Stripe, KV, cron bindings). |
| Data store | One Worker, one `wrangler.jsonc`, **same D1 database id** — no data migration | The D1 id is deployment config, not code. Reusing it avoids a migration and keeps existing rows. |
| Bindings | Read with `import { env } from 'cloudflare:workers'` in server code | Removes the per-request `c.env` plumbing through Hono/TanStack layers. |
| Pre-existing type errors | Fixed as part of the port | The unified app must typecheck cleanly; carrying known errors forward makes the port unverifiable. |

Removed env vars: `CORS_ORIGINS`, `CORS_MAX_AGE` (P3), `VITE_BACKEND_URL` (P2).

## Proposed code layout

⬜ Everything in this tree is **planned** — not built yet. Existing files that the port keeps are
noted in parentheses.

```
/
├── package.json                  # single package, no workspaces
├── wrangler.jsonc                # one Worker: D1 (same id), optional ratelimits (assets are served by the Vite/TanStack plugin)
├── vite.config.ts
└── src/
    ├── router.tsx
    ├── start.ts                  # ⬜ createStart(): request middleware (request log, error contract, CSRF) + function middleware (auth requireUser, optional rate limit)
    ├── server.ts                 # ⬜ custom Worker entry: fetch (server-entry + security headers) + queue
    ├── routes/
    │   ├── __root.tsx
    │   ├── index.tsx
    │   ├── login.tsx
    │   ├── signup.tsx
    │   ├── template.tsx
    │   ├── health-demo.tsx
    │   └── api/$.ts              # ⬜ THE single mount point for the Hono app at /api/*
    ├── features/                 # ⬜ one folder per feature
    │   └── health/
    │       ├── health.functions.ts   # ⬜ createServerFn — the UI-facing entry
    │       └── health.server.ts      # ⬜ the logic both the server fn and the Hono route call
    └── server/                   # ⬜ server-only code (never imported by client code)
        ├── app.ts                # (existing src/server/app.ts) Hono app factory
        ├── auth/index.ts         # (existing) better-auth instance
        ├── features/…            # (existing) auth / health / session Hono routers
        ├── infrastructure/…      # (existing) db, queue, events
        ├── lib/…                 # (existing) create-app, cache-control, resolve-origins, …
        ├── middleware/…          # (existing) request-log, error-handler, auth
        └── shared/…              # (existing) schemas, types
```

Naming rules for the new code:

- `*.functions.ts` — TanStack `createServerFn` wrappers. This is the only thing the UI imports.
- `*.server.ts` — the actual logic. Imported by server functions AND by the Hono routes, so both
  paths return identical data.
- `src/server/**` — server-only modules. TanStack Start's import protection denies `*.server.*` files
  by default; a `src/server/**` folder rule must be configured explicitly ⬜ (planned in P5).

## Key Files

| File | Purpose |
|------|---------|
| `src/server/app.ts` | Hono app factory. `buildApp` chains the auth/session/health routers and exposes `AppType` for RPC typing. |
| `src/server/lib/create-app.ts` | Hono middleware chain — cache-control, request id, CORS, auth context, rate limiter, request log (`createApp`). CORS and the `hono-rate-limiter` block are removed in the port. |
| `src/server/index.ts` | Current backend Worker entry: exports `fetch` + `queue` (default export). Becomes `src/server.ts` with the TanStack server entry wrapped in. |
| `src/server/auth/index.ts` | better-auth instance (`createAuth`): plugins, `trustedOrigins`, cookie attributes, `useSecureCookies`. Cookie `sameSite` becomes `"lax"`. |
| `src/lib/api-client.ts` | Frontend Hono RPC client (`createApiClient`). Today it builds a cross-origin `hc<AppType>` from `VITE_BACKEND_URL`. After the port the UI uses server functions instead; this file shrinks to the `/api/*` public client only, if anything still needs it. |
| `src/routes/api/$.ts` | ⬜ TanStack server route that mounts the Hono app under `/api/*`. The only place Hono and TanStack meet. |
| `src/start.ts` | ⬜ `createStart()`. Request middleware: request log, error contract, CSRF. Function middleware: auth (`requireUser`) + optional rate limit. Modelled on the reference project (`/Volumes/ssd/sam/Developer/national-match/src/start.ts`). |
| `src/server.ts` | ⬜ Custom Worker entry: TanStack server entry + security headers, plus the existing `queue` handler. Modelled on `/Volumes/ssd/sam/Developer/national-match/src/server.ts`. |
| `src/features/<feature>/<feature>.functions.ts` | ⬜ Server functions for that feature. |
| `src/features/<feature>/<feature>.server.ts` | ⬜ Shared server logic for that feature (used by both the server functions and the Hono route). |
| `wrangler.jsonc` | ⬜ Single Worker config: same D1 id, `compatibility_flags: ["nodejs_compat"]`, commented-out `ratelimits` block. No `assets` block — assets are served by the TanStack/Cloudflare Vite plugin. |

## Data Flow

**UI → server function → shared logic → D1** (the primary path after the port):

```
React component
  → calls health.functions.ts createServerFn
  → TanStack Start server-side handler (src/start.ts request middleware runs here)
  → health.server.ts  (the same module the Hono route calls)
  → D1 (only for /api/test; health itself does not query D1)
  → plain data returned to the component (no { data } envelope)
```

**Public HTTP API path** (kept, same origin):

```
GET /api/health
  → TanStack route src/routes/api/$.ts
  → Hono app (src/server/app.ts) mounted at /api/*
  → Hono route src/server/features/health/routes.ts
  → health.server.ts (shared logic)
  → D1 (only for /api/test; health itself does not query D1)
  → { data: ... } envelope (public API keeps the envelope)
```

**Auth path** (unchanged in shape, changed in origin):

```
Browser → POST /api/auth/sign-in/email   (same origin now)
  → TanStack route src/routes/api/$.ts → Hono authRouter → better-auth handler
  → Set-Cookie: session_token=...; HttpOnly; SameSite=Lax; Secure (prod)
```

Full auth mechanics (plugins, session cache, OAuth linking, passkeys) stay where they are
documented — see [Auth § Data Flow](./auth.md#data-flow) and
[Auth § Security Considerations](./auth.md#security-considerations).

## Security Considerations

- **Same-origin is the boundary.** Removing CORS and setting `SameSite=Lax` means the browser only
  ever sends the session cookie to this origin. That removes the whole class of cross-site cookie
  leaks that `SameSite=None` allowed.
- **better-auth `trustedOrigins`** must list the app's own origin and nothing else. It is the
  server-side CSRF boundary — see [Auth § Security Considerations](./auth.md#security-considerations).
- **CSRF for server functions.** `src/start.ts` installs CSRF middleware for server functions.
  The reference project states that TanStack Start only installs its own CSRF automatically when
  `src/start.ts` is absent, so defining the file opts out and the middleware must be re-added
  explicitly — that claim comes from the reference project's comment
  (`/Volumes/ssd/sam/Developer/national-match/src/start.ts`), not from this repo's installed
  `@tanstack/react-start` version. Verify in P5 before relying on it.
- **Security headers** (`X-Content-Type-Options`, `Referrer-Policy`, HSTS, CSP `frame-ancestors`)
  are applied in the `src/server.ts` Worker wrapper, so they cover HTML pages, server-function
  responses, and Hono routes alike.
- **Rate limiting is off by default** and the function middleware no-ops when the binding is absent,
  so the limiter can never be the cause of an outage. Turning it on is a deliberate code change.
- **Server-only module boundary.** `src/server/**` must never be imported from client code; the
  `*.server.ts` / `*.functions.ts` naming split exists to make that boundary greppable. TanStack
  Start's import protection denies `*.server.*` by default; a `src/server/**` folder rule must be
  configured explicitly ⬜ (planned in P5).
- **Public `/api/*` routes are deliberately public** (index, health, DB-liveness probe, OpenAPI
  doc). `/api/test` confirms the D1 binding answers a trivial query — it returns reachability, not
  data.

## Migration path

⬜ All phases are planned. Nothing below is done.

| Phase | Content | Status |
|-------|---------|--------|
| P2 | Flatten to one root package; move FE `src/` to root `src/` and backend code to `src/server/`; drop bun workspaces. Mount the Hono app at `/api` via `src/routes/api/$.ts` and point the frontend client at the same origin — `VITE_BACKEND_URL` is removed here | ⬜ |
| P3 | Same-origin auth: cookie `SameSite=Lax`, CORS removed, `trustedOrigins` = app origin, `BETTER_AUTH_URL` = app origin, Google redirect URI updated. The session read moves to a server function | ⬜ |
| P4 | Extract shared health logic into `*.server.ts` so the server function and the Hono route call the same code | ⬜ |
| P5 | Middleware: request log, error contract, CSRF (request middleware); auth `requireUser` + optional rate limit on the Cloudflare binding, off by default (function middleware); security headers; `src/server/**` import-protection rule | ⬜ |
| P6 | Custom Worker entry `src/server.ts` (fetch + queue) with the TanStack server entry wrapped in | ⬜ |
| P7 | Tests: server functions, shared logic, middleware behaviour | ⬜ |
| P8 | Docs: update `auth.md`, `response-caching.md`, `observability-logging.md`, `shared-types.md` for the new paths and same-origin model | ⬜ |
| P9 | Cutover — user actions: deploy the unified Worker and point DNS at it; update the Google Cloud Console redirect URI to `<app-origin>/api/auth/callback/google`; set the prod secrets on the new Worker (`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, Google client id/secret); disable the old API Worker only after the new one is verified | ⬜ |

## Risks

- **Passkeys are bound to the RP ID / origin.** Credentials registered on the old domain do not
  work on the new one — users must re-register their passkey.
- **Everyone signs in once again.** The session cookie's domain moves with the app, so existing
  sessions do not carry over.
- **Local D1 state is not carried over.** The dev database under `apps/backend/.wrangler/state` is
  not moved to the new root-level state directory; local dev starts from a fresh database and needs
  migrations re-applied.
- **The `split-fe-be` branch will drift from `main`.** It is a snapshot of the old architecture,
  not a maintained fork. Unwired code that only exists there is effectively frozen.
- **Cutover needs user-side steps that cannot be done from the repo.** The Google Cloud Console
  redirect URI must be updated to `<app-origin>/api/auth/callback/google`, the prod secrets
  (`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, Google client id/secret) must be set on the new
  Worker, and the old API Worker must stay up until the new one is verified — then be disabled.
  Miss any of these and Google sign-in breaks or the app silently falls back to the old Worker.

## STOP Rules

The following need explicit user approval before they change:

- Changing cookie attributes (`SameSite`, `Secure`, the `__Secure-` prefix, `useSecureCookies`).
- Changing better-auth `trustedOrigins`.
- Changing the CSRF middleware behaviour for server functions.
- Turning rate limiting ON by default (or changing its limit/window).
- Exposing a server-only module (`src/server/**`) to the client bundle, or importing `*.server.ts`
  from client code.

## Out of Scope

- Rewiring the unwired backend code (event emitter, cron, Stripe, KV cache, `_logs` dashboard) —
  it stays on `split-fe-be`.
- Moving to a different auth provider, database, or hosting target.
- Changing the public `/api/*` response envelope (it keeps `{ data }`).
- Changing the D1 database id or running a data migration.
