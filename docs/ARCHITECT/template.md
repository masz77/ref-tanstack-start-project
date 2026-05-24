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
