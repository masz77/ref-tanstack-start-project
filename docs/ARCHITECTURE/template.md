# Template Page (FE↔BE Integration Demo)

## Overview
A new frontend route at `/template` proves the project's end-to-end typed integration between the TanStack Start frontend and the Hono Cloudflare Workers backend. It is a card-grid dashboard that calls five primitive backend endpoints (`/health`, `/` index, `/test`, `/v1/logs/recent`, `/v1/logs/stats`) and renders each card with its own loading, error, and data state. The page exercises the project's canonical FE contracts (response types derived in `contracts.ts`) and, in doing so, introduces TanStack Query v5 as the frontend data-fetching layer — the repo previously had none (existing pages used raw `fetch` + `useEffect`).

## Architecture Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Data-fetching layer | Introduce TanStack Query v5 (`@tanstack/react-query`) | Gives caching, retries, request dedup. It is the pattern the project's `optimistic-ui.md` rule already prescribes. Replicates the proven setup from the sibling `newgrad-nurse-demo` project. |
| QueryClient wiring | Plain manual wiring — module-level singleton + `<QueryClientProvider>` | Avoids the `@tanstack/react-router-ssr-query` integration (the dep is present but unused). A singleton exported from `router.tsx` is placed on the router `context` and provided via a plain provider in `__root.tsx`. Loaders fire-and-forget prefetch via `context.queryClient.prefetchQuery` (not `ensureQueryData`) and components can call `useQuery`/`useSuspenseQuery` against the same instance. |
| Root route type | Switch `createRootRoute` → `createRootRouteWithContext<{ queryClient }>()` | Makes the `queryClient` typed and available to every loader via `context`. |
| queryFn data source | Use the existing Hono RPC client (`createApiClient()`) and peel the `{ data }` envelope | RPC end-to-end is the project convention. We do NOT copy the reference project's hand-rolled fetch wrapper. Return types are sourced from `contracts.ts`, never by indexing `AppType`/`ApiClient` directly (STOP rule from `shared-types.md`). |
| Query definition location | Feature folder `src/lib/template/queries.ts` as `queryOptions` factories | Co-locates query key + queryFn per `optimistic-ui.md`. Keys are hierarchical string tuples, e.g. `['template','health']`, `['template','logs','recent', apiKey]`. |
| Logs auth | Runtime `x-api-key` text input held in component state | The logs endpoints are gated by a static `LOGS_API_KEY` (backend env), not better-auth. Entering the key at runtime keeps it out of the client bundle — no `VITE_` env var. Logs query options take an `apiKey` arg and set `enabled: !!apiKey`. |
| QueryClient defaults | `staleTime: 30_000`, `retry: 1` | Matches the reference project; reasonable caching plus a single retry. |

## Key Files
| File | Purpose |
|------|---------|
| `apps/frontend/src/router.tsx` | (modified) Exports the module-level `queryClient` singleton and places it on the router `context`. |
| `apps/frontend/src/routes/__root.tsx` | (modified) Switches to `createRootRouteWithContext<{ queryClient }>()`, wraps the app in `<QueryClientProvider>`, and mounts the React Query devtools. |
| `apps/frontend/src/lib/template/queries.ts` | (new) `queryOptions` factories for the five endpoints, with hierarchical query keys. Logs factories take `apiKey` and set `enabled`. |
| `apps/frontend/src/routes/template.tsx` | (new) The `/template` dashboard page — card grid, per-card states, and the `x-api-key` input. |
| `apps/frontend/src/lib/contracts.ts` | (unchanged) Canonical response types consumed by the queryFns: `HealthResponse`, `ApiIndexResponse`, `TestResponse`, `RecentLogsResponse`, `LogsStatsResponse`. |
| `apps/frontend/src/lib/api-client.ts` | (unchanged) The `hc<AppType>` RPC client used inside the queryFns. |
| `apps/frontend/package.json` | (modified) Adds the `@tanstack/react-query` dependency. |

## Data Flow
Open endpoints (`/health`, `/` index, `/test`) are prefetched in the route loader: the loader fire-and-forget calls `context.queryClient.prefetchQuery(...)` (it does not use `ensureQueryData`) with the `queryOptions` factories, warming the shared QueryClient cache before the page renders. Each card component then calls `useQuery` against the same factory, so it reads from the warm cache instead of re-fetching. Inside every `queryFn`, the Hono RPC client (`createApiClient()`) makes the call, the `{ data }` envelope is peeled, and the value is returned typed as the matching `contracts.ts` type. The card renders that typed data, and per the api-response-handling rule it distinguishes an error state from an empty state.

The two logs endpoints (`/v1/logs/recent`, `/v1/logs/stats`) follow a gated flow: the user pastes the key into the runtime `x-api-key` input, which is held in component state. That key is passed to the logs `queryOptions` factories, which include it in the query key and send it as the `x-api-key` header; `enabled: !!apiKey` keeps the queries idle until a key is present. Entering or changing the key produces a new query key, so the logs cards fetch independently of the open cards.

## Security Considerations
- `LOGS_API_KEY` is never bundled. It is entered at runtime into a text input and sent only as the `x-api-key` request header; no `VITE_`-prefixed env var is used, so the secret cannot leak into the client bundle.
- Only the open endpoints (`/health`, `/` index, `/test`) are prefetched in the loader. The logs queries stay disabled until the user supplies a key.
- `GET /test` has a write side-effect — it inserts a row into the D1 `apiLogs` table on every call (returns 201). To avoid noisy writes it is not refetched aggressively: it relies on the `staleTime: 30_000` default plus a manual refetch button rather than automatic background revalidation.

---

# Backend Auth Integration Models (Reference)

The template ships unauthenticated. When wiring auth, the FE↔BE story splits into two proven models — both observed in production projects derived from this template. The **routing/guard layer is the same in both** (the `AuthSync` + synchronous `beforeLoad` + `context.auth` pattern below); only the **storage layer** differs.

## Shared routing/guard layer (use in both models)

Whichever model you pick, wire these three pieces — they are identical across both reference projects.

**1. Root route carries `auth` in context.** In `apps/frontend/src/routes/__root.tsx`:

```ts
createRootRouteWithContext<{ queryClient: QueryClient; auth: AuthContextValue }>()
```

The `auth` field is `undefined!` at boot and gets injected at runtime by `AuthSync`. Initial declaration in `router.tsx`:
```ts
context: { queryClient, auth: undefined! as AuthContextValue }
```

**2. `AuthSync` mirrors the provider value into router context.** Place at the top of `RootComponent`, inside the provider:

```ts
function AuthSync() {
  const auth = useAuth()                    // useUser() or useSession() — whichever model
  const router = useRouter()
  useEffect(() => {
    router.update({ context: { ...router.options.context, auth } })
    if (!auth.isLoading) router.invalidate()  // re-run beforeLoad guards once auth settles
  }, [auth, router])
  return null
}
```

This is verbatim from both reference projects — nurse-demo `apps/frontend/src/routes/__root.tsx:148-160`, whatmd `apps/frontend/src/lib/session-context.tsx:58-70`.

**3. Synchronous `beforeLoad` guards read `context.auth` with early-return-while-loading.** Never `await` in `beforeLoad`; never call `ensureQueryData(session)` server-side (it stalls SSR and a 401 throws into the 500 boundary):

```ts
beforeLoad: ({ context }) => {
  if (!context.auth || context.auth.isLoading) return     // SSR + first paint
  if (!context.auth.user) throw redirect({ to: '/login' })
  if (context.auth.role !== 'expected') throw redirect({ to: '/elsewhere' })
}
```

The SSR pass early-returns, renders the shell, then on client hydration `AuthSync` calls `router.invalidate()` and the guard re-evaluates with resolved auth. Render a `FullscreenLoader` (or similar) in the layout component while `auth.isLoading` so the user sees a buffer instead of a flash of unauthenticated content.

## Model A — Supabase JWT (Bearer header)

Used by: `newgrad-nurse-demo`. Source: `apps/frontend/src/lib/user-context.tsx`.

### Storage model
- **Source of truth**: `useState` inside `UserProvider` — `user`, `session`, `isLoading`, `extendedInfo` (whatever the backend `/me` returns: `is_admin`, subscription, etc.) — `user-context.tsx:51-54`.
- **What feeds it**: Supabase's `auth.onAuthStateChange` subscription — switches on `SIGNED_IN` / `SIGNED_OUT` / `TOKEN_REFRESHED` / `USER_UPDATED` and calls the corresponding setState. Initial boot reads `supabase.auth.getSession()` once — `user-context.tsx:110-174`.
- **Cross-tab sync**: free — Supabase's client uses its own storage events to broadcast auth changes across tabs, and `onAuthStateChange` fires in every tab. No custom code.
- **Sign-out**: `supabase.auth.signOut()` directly; the `SIGNED_OUT` event clears local state in every tab.

### Transport
- Backend calls send `Authorization: Bearer <access_token>` — pulled from the in-memory session each call.
- No cookies involved → **no SSR cookie-forwarding shim needed**.
- Extended/app-specific user fields (admin flag, subscription) come from a **separate** authenticated `GET /api/auth/me` call after sign-in — `user-context.tsx:56-105`. Refetched on `SIGNED_IN` (new login only — diff the user id to skip refetch on tab refocus), skipped on `TOKEN_REFRESHED` (those fields don't change on token rotation).
- 401 from `/me` → call `supabase.auth.signOut()` to force a logged-out state; guards redirect to `/login`.

### When to pick this model
- You're already using Supabase Auth (or another JWT-based provider with cross-tab broadcasting built in).
- You're comfortable with Bearer-header transport and don't need cookies (no SSR cookie complications, but also no automatic credentials on a bare `<img>` / cross-origin asset request).
- Extended user fields can live in a separate endpoint without latency anxiety — one extra round-trip per sign-in is fine.

### What you write
- `UserProvider` + `useUser()` — feeds from Supabase events.
- A typed `/api/auth/me` route on the backend returning `{ is_admin, subscription, ... }`.
- The shared routing/guard layer above.

## Model B — better-auth cookie + react-query cache

Used by: `whatmd`. Source: `apps/frontend/src/lib/session-context.tsx`, `apps/frontend/src/lib/queries/session.ts`.

### Storage model
- **Source of truth**: a single react-query cache entry at `['session']`, populated by `sessionQueryOptions` — `queries/session.ts:23-28`. **Every read and every write goes through this one key.**
- **What feeds it**: `useSessionQuery()` fetches `GET /api/session` (the backend's enriched session endpoint). The `SessionProvider` is a thin adapter over `useQuery` — `session-context.tsx:24-44`.
- **Cross-tab sync**: hand-rolled. `BroadcastChannel('<app>-session')` — sign-out posts `{ type: 'signed-out' }` → other tabs `setQueryData(['session'], null)`; sign-in posts `{ type: 'signed-in' }` → other tabs `invalidateQueries(['session'])` to refetch authoritative data. Listener mounted once in `RootComponent`. better-auth does not broadcast on its own.
- **Sign-out**: centralized hook — `betterAuthSignOut()` → `setQueryData(['session'], null)` → `invalidateQueries(['session'])` → `postSessionEvent('signed-out')`. Every sign-out callsite must go through this hook or the local cache stays stale and `/login`'s guard bounces the user back.

### Transport
- Backend calls send the session cookie via `credentials: 'include'` — the cookie is `HttpOnly`, `SameSite=None`, `Secure`.
- Cookie attributes are **env-aware**: `useSecureCookies` must be `false` in dev because browsers hard-reject `__Secure-` prefix over `http://localhost`.
- **SSR cookie forwarding is required**: TanStack Start runs data loaders server-side on hard refresh. Server-side `fetch` has no browser cookie jar, so `credentials: 'include'` is a no-op. The api-client wrapper must read the inbound `Cookie` header (`getRequestHeader('cookie')` via `createIsomorphicFn`) and forward it on outbound RPC calls.
- Extended/app-specific user fields (role, tenant id, profile flags) come back **on the same `/api/session` response** via a `customSession` plugin that runs a single JOIN inside `auth.api.getSession()` — collapses what would otherwise be 2-3 round-trips into 1 query (or 0 if you enable better-auth's `session.cookieCache`).

### When to pick this model
- You're using better-auth (or any cookie-session library) and want `HttpOnly` cookie security.
- You need signed assets / cross-origin `<img>` requests to flow without bearer headers (cookies + a signed-URL route work; bearer headers don't).
- You want enrichment (role/tenant/etc.) to ship on every authenticated request without a separate round-trip — `customSession` is the lever.
- You can absorb the extra wiring: env-aware cookie flags, SSR cookie-forwarding shim, BroadcastChannel cross-tab sync, centralized sign-out hook.

### What you write
- `sessionQueryOptions` (the react-query primitive — **the** source of truth).
- `SessionProvider` + `useSession()` — thin adapter over `useSessionQuery()`.
- `useSignOut` hook — the only sanctioned sign-out path.
- `session-channel.ts` + `use-session-channel.ts` for cross-tab sync.
- `api-client.ts` SSR cookie-forwarding shim via `createIsomorphicFn`.
- Backend `/api/session` route — a thin pass-through over `auth.api.getSession()` (enrichment happens inside the `customSession` plugin, not in the route).
- The shared routing/guard layer above.

## Choosing between the models

| Signal | Lean Model A (Supabase JWT) | Lean Model B (better-auth cookie) |
|---|---|---|
| Backend auth lib already chosen | Supabase | better-auth |
| Need cookie-protected `<img>` / asset routes? | Hard (need signed URLs anyway) | Natural fit |
| SSR hard-refresh fetches in data loaders? | Works out of the box (token in component state attaches client-side) | Requires explicit cookie-forwarding shim |
| Cross-tab sync | Free (Supabase broadcasts) | Hand-roll BroadcastChannel |
| Want enriched user on every request without extra round-trip? | Separate `/me` call (cached in state) | `customSession` JOIN in one query |
| Bundle/storage anxiety about JWTs in localStorage? | Supabase stores tokens in localStorage by default | Cookie is `HttpOnly`, no JS access |

The routing/guard layer is identical, so swapping models later means rewriting the provider + queries layer, not the routes. Both reference projects can be cherry-picked: `newgrad-nurse-demo/apps/frontend/src/lib/user-context.tsx` for Model A, `whatmd/apps/frontend/src/lib/{session-context.tsx,queries/session.ts,session-channel.ts,hooks/use-sign-out.ts,hooks/use-session-channel.ts}` for Model B.
