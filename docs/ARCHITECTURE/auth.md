# Auth (email/password + Google OAuth + Passkey)

## Overview

The template ships with a fully wired better-auth integration on the backend, plus the canonical FE auth pattern (one react-query cache as source of truth, `SessionProvider` adapter, `AuthSync` mirroring into router context, synchronous `beforeLoad` guards). Three sign-in methods are enabled: email/password, Google OAuth, and passkey (WebAuthn). Cookie attributes are env-aware so dev on `http://localhost` and prod on HTTPS both work without code changes.

The server-side wiring mirrors the [whatmd auth-session model](../../../whatmd/docs/ARCHITECT/auth-session.md) ("Model B" in [template.md](./template.md)) — minus the `customSession` enrichment plugin, since this template has no role/tenant fields to JOIN. `/api/session` is therefore a thin pass-through over `auth.api.getSession()`.

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Auth provider | better-auth + `better-auth-cloudflare` + Drizzle on D1 | Already in the template; supports cookie sessions, OAuth, passkey out of the box. |
| Plugins | `anonymous`, `openAPI`, `passkey` (server) + `passkeyClient` (FE) | `passkey` writes to the existing `passkey` table in `infrastructure/db/schema.ts`. Anonymous + openAPI are kept from the original template. |
| OAuth provider | Google via `socialProviders.google` | Only Google for now — Apple/GitHub/etc. are one-line additions. Account rows land in the existing `account` table. |
| `customSession` plugin | **Not used** | The template has no role/tenant/membership fields to JOIN. If you add them later, copy the whatmd pattern: a single LEFT JOIN inside `customSession(async ({ user, session }) => …)` so `auth.api.getSession()` returns the enriched user in one round-trip. |
| Cookie name prefix | `useSecureCookies` set from `env.BETTER_AUTH_URL.startsWith("https://")` | Browsers hard-reject `__Secure-` over `http://localhost` — keeping it on in dev silently drops `session_token` and hard refresh always lands as logged-out. Toggle off in dev, on in prod. |
| Cookie cross-site attributes | `SameSite=None; Secure` (both envs) | FE (`:3000`) and BE (`:8787`) are different origins in dev, separate subdomains in prod. `SameSite=None` is required for cross-origin XHR; `Secure` is required by `SameSite=None` and is accepted by Chrome/Firefox/Safari over `http://localhost` as a secure-context exception. |
| `trustedOrigins` source | Derived from `CORS_ORIGINS` via `resolveCorsOrigins(env)` | better-auth's CSRF boundary must agree with Hono's CORS layer. Reuses the helper already in `lib/resolve-origins.ts`. |
| Session cookie cache | `session.cookieCache.maxAge = 5 * 60` | better-auth signs the session into the cookie itself. Cache hits = zero D1 round-trips. Trade-off: up to 5min stale window for revoked sessions. Acceptable for a template; shorten if your security model needs it tighter. |
| `/api/session` shape | Backend pass-through returning `{ data: { user, session } \| null }` | Mirrors the whatmd contract. 200 + `data: null` for unauthenticated (NOT 401) so the FE query treats "logged out" as a normal state, not an error. |
| FE session source of truth | **One react-query cache entry: `['session']`** (`sessionQueryOptions`) | Every read/write goes through this key — sign-in, sign-out, cross-tab sync, settings mutations all flow through one update path. `authClient.useSession()` is NOT used as a source (it hits `/api/auth/get-session` which doesn't include any enrichment we might add later). |
| FE auth gating | `SessionProvider` → `AuthSync` injects into router context → synchronous `beforeLoad` guards read `context.auth` with early-return while loading | Avoids blocking SSR. The SSR pass renders the shell instantly; client hydration resolves auth and re-runs the guard via `router.invalidate()`. |
| Cross-tab sync | Hand-rolled `BroadcastChannel('app-session')` | better-auth doesn't broadcast cross-tab on its own. Sign-out in tab A → other tabs flip cache to `null` within one frame; sign-in → other tabs invalidate and refetch (don't trust sender's user object). |
| Sign-out path | Centralized `useSignOut` hook | The cache-clear + cross-tab broadcast is load-bearing. Every sign-out callsite must go through this hook or `/login`'s guard reads a stale session and bounces the user back. |

## Key Files

### Backend

| File | Purpose |
|------|---------|
| `apps/backend/src/auth/index.ts` | `createAuth(env, cf)` factory. **Plugins: `anonymous()`, `openAPI()`, `passkey()`**. `socialProviders.google` reads `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` from env. Env-aware `useSecureCookies`; cookie defaults `sameSite: "none"`, `secure: true`. `session.cookieCache` 5min. `trustedOrigins` from `resolveCorsOrigins(env)`. |
| `apps/backend/src/features/session/routes.ts` | `GET /api/session` — thin pass-through over `auth.api.getSession()`. Returns `{ data: { user, session } }` or `{ data: null }` (200). |
| `apps/backend/src/app.ts` | Mounts `sessionRouter` alongside `authRouter`. |
| `apps/backend/src/env.ts` | Adds `DB` (real wrangler binding), `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`. |

### Frontend

| File | Purpose |
|------|---------|
| `apps/frontend/src/lib/queries/session.ts` | `sessionQueryOptions` (queryKey `['session']`) — **THE source of truth**. 401 → `null`, 60s `staleTime`, `retry: false`. |
| `apps/frontend/src/lib/session-context.tsx` | `SessionProvider` / `useSession()` — thin adapter over the `['session']` cache. Exposes `{ user, isLoading, isAuthenticated }`. Also exports `AuthSync` which mirrors the value into router context via `router.update({ context })` and calls `router.invalidate()` once auth settles. |
| `apps/frontend/src/lib/session-channel.ts` | BroadcastChannel cross-tab sync. SSR-safe no-ops. |
| `apps/frontend/src/lib/hooks/use-session-channel.ts` | Mounted once in `__root.tsx`. On `signed-out` → `setQueryData(['session'], null)`. On `signed-in` → `invalidateQueries(['session'])`. |
| `apps/frontend/src/lib/hooks/use-sign-out.ts` | Centralized sign-out: `betterAuthSignOut()` → cache clear → broadcast → navigate. |
| `apps/frontend/src/lib/auth-client.ts` | better-auth browser client with `passkeyClient()` plugin. Re-exports `signIn`, `signUp`, `signOut`, etc. |
| `apps/frontend/src/lib/api-client.ts` | Hono RPC client. Browser fetch uses `credentials: 'include'`. SSR fetch forwards the inbound `Cookie` header via `createIsomorphicFn` + `getRequestHeader('cookie')`. |
| `apps/frontend/src/router.tsx` | Router context carries `auth: SessionContextValue` alongside `queryClient`. |
| `apps/frontend/src/routes/__root.tsx` | Root context type switched to `{ queryClient, auth }`. `SessionProvider` wraps the tree; `AuthSync` + `useSessionChannel` mounted inside `RootComponent`. |
| `apps/frontend/src/routes/login.tsx` | Email/password + Google + passkey sign-in. Synchronous `beforeLoad` redirects already-signed-in users. |
| `apps/frontend/src/routes/signup.tsx` | Email/password + Google + passkey sign-up. Same redirect guard. |

## Data Flow

**Email/password sign-in:**
```
POST /api/auth/sign-in/email
  → better-auth verifies password
  → Set-Cookie: better-auth.session_token=...; HttpOnly; SameSite=None; Secure
    (or __Secure-... in prod)
  → 200 OK { user, token }

FE (login.tsx): await queryClient.fetchQuery(sessionQueryOptions)  →  GET /api/session
  → cache['session'] = { user, session }
  → postSessionEvent({ type: 'signed-in' })  (notify other tabs)
  → navigate('/')

SessionProvider value updates → AuthSync.invalidate() → guards re-run.
```

**Google OAuth:**
```
signIn.social({ provider: 'google', callbackURL: '/' })
  → better-auth redirects to Google
  → Google → redirect back to /api/auth/callback/google
  → better-auth upserts account row, creates session, sets cookie
  → redirects to callbackURL

On landing page, SessionProvider's useSessionQuery fetches /api/session → cache populated.
(For sibling tabs to notice, the OAuth-landing page must post 'signed-in' — handled in
the dedicated callback page if you add one, or accept that other tabs will refetch on
the next focus event / staleTime expiry.)
```

**Passkey sign-in:**
```
signIn.passkey()
  → browser WebAuthn prompt
  → better-auth verifies assertion against passkey table
  → sets cookie

FE: fetchQuery(sessionQueryOptions) → cache populated → broadcast → navigate.
```

**Passkey registration (post-signup, optional):**
```
authClient.passkey.addPasskey()  (must be called from a signed-in session)
  → browser WebAuthn registration
  → row written to passkey table
```

**Hard refresh of a guarded route:**
```
Browser reloads /protected
  → SSR worker receives request (with browser cookies)
  → /protected beforeLoad runs SERVER-SIDE
      → context.auth is undefined/loading → early-return (no blocking fetch)
      → SSR renders the shell
  → Client hydrates
      → SessionProvider's useSessionQuery() → GET /api/session
        (credentials:'include' attaches cookie in the browser)
      → cache['session'] populates
      → AuthSync: router.update({ context: { auth }}) + router.invalidate()
      → beforeLoad re-runs CLIENT-SIDE with resolved auth → pass / redirect
```

The SSR `getRequestHeader('cookie')` branch in `api-client.ts` is retained for any SSR *data* loaders you add later (e.g. a route that loads data in `loader`). Without it, server-side fetches on hard refresh send no cookie and see 401 despite a valid browser cookie.

## Required Env Vars

Add to `apps/backend/.dev.vars` for local development:

```
BETTER_AUTH_SECRET=<openssl rand -base64 32>
BETTER_AUTH_URL=http://localhost:8787
CORS_ORIGINS=http://localhost:3000
GOOGLE_CLIENT_ID=<google-cloud-console-oauth-client>
GOOGLE_CLIENT_SECRET=<google-cloud-console-secret>
```

For prod, set via `wrangler secret put GOOGLE_CLIENT_SECRET` etc. The Google OAuth client's authorized redirect URI must be `<BETTER_AUTH_URL>/api/auth/callback/google` (e.g. `https://your-api.workers.dev/api/auth/callback/google`).

Frontend reads `VITE_BACKEND_URL` (defaults to `http://localhost:8787`).

## Security Considerations

- **Cookie attributes**: `HttpOnly` (no JS access), `Secure` (TLS-only in prod, localhost-secure-context in dev), `SameSite=None` (cross-origin XHR required because FE and BE live on different origins). The `__Secure-` name prefix in prod adds belt-and-braces enforcement.
- **CORS / CSRF**: `Access-Control-Allow-Credentials: true` is required for cross-origin cookies. `CORS_ORIGINS` must list ONLY trusted FE domains, never `*`. better-auth's `trustedOrigins` is derived from the same env var so the two layers can't drift.
- **Session validation cost**: every authenticated request re-validates via `auth.api.getSession()`. The 5-min `cookieCache` means 0 D1 round-trips on hits; on miss it's better-auth's session lookup. Add `customSession` later if you need extra fields without an extra round-trip.
- **OAuth account linking**: better-auth links Google accounts to existing users by email by default. If you require strict separation (no auto-link), configure `account.accountLinking.enabled = false`.
- **Passkey origin binding**: WebAuthn ties credentials to the origin. Dev passkeys created on `http://localhost:3000` will NOT work in prod; users need to re-register on the prod origin.

## STOP rules

- **Adding a second FE session source** (using `authClient.useSession()` in components, mirroring to localStorage, deriving from URL) = STOP. The whole flow assumes the `['session']` react-query cache is the only source.
- **Bypassing `useSignOut`** by calling `betterAuthSignOut()` directly anywhere = STOP. The cache-clear + cross-tab broadcast is load-bearing.
- **Hardcoding `useSecureCookies: true` for all envs** = STOP. Breaks local dev silently.
- **Dropping `credentials: 'include'`** from the FE fetch wrapper = STOP. Cookie won't ride cross-origin → instant logged-out on hard refresh.
- **Dropping the SSR `getRequestHeader('cookie')` branch** = STOP. Required for any SSR data loaders.
- **Storing user/session in localStorage or a non-HttpOnly cookie** = STOP. better-auth's `HttpOnly` cookie is the only place the session token should live.
