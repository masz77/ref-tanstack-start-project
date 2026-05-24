# Canonical Frontend Type Source

> **2026-05-24:** `packages/shared` folded into `apps/backend/src/shared/`; package deleted (shipped `86c975b`). Frontend derives all types from the RPC `AppType` (`@repo/backend`, type-only) and no longer depends on a shared package. The envelope convention now lives with the backend shared module; the FE side stays types-only (no runtime cross-package import).

## Overview

The frontend derives ALL backend response and request types from one file, `apps/frontend/src/lib/contracts.ts` (✅ created, `bb38424`). It indexes into the Hono RPC `AppType` (via the `ApiClient` type from `apps/frontend/src/lib/api-client.ts:ApiClient`) using `InferResponseType` / `InferRequestType`, so no component ever hand-writes or re-derives a backend type. To make this clean, every backend typed JSON success response uses a uniform `{ data: T }` envelope (the `ApiResponse<T>` / `PaginatedResponse<T>` shapes in `apps/backend/src/shared/types.ts`), so `contracts.ts` can peel `.data` everywhere. This doc owns the shared envelope substrate, the DTO/derivation rules, and the envelope convention.

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Single type source | `contracts.ts` derives every response/request type from `AppType`; components import only from `@/lib/contracts` | One place to change, no drift, no hand-written backend types in the UI |
| Derive, don't duplicate | Use `InferResponseType` / `InferRequestType` from `hono/client` against `apps/frontend/src/lib/api-client.ts:ApiClient` | Types follow the backend automatically with zero codegen |
| Uniform success envelope | Every typed JSON success response is `{ data: T }`; lists are `{ data: T[], pagination }` | Lets `contracts.ts` peel `.data` the same way for every endpoint |
| Envelope shapes live in the backend | `2026-05-24:` `ApiResponse<T>` / `PaginatedResponse<T>` now live in `apps/backend/src/shared/types.ts` (folded from the deleted `packages/shared`) | The envelope is a backend-output convention; co-locating it with the routes that produce it removes the standalone package and its dist build |
| FE has no runtime cross-package dependency | `2026-05-24:` Frontend imports backend types ONLY via the RPC `AppType` from `@repo/backend` (type-only); it takes no runtime import from any backend/shared package | Importing a runtime value from `@repo/backend` risks pulling the worker entry into the FE bundle; type-only imports are erased at build time |
| No shared runtime home post-fold | `2026-05-24:` After the fold, runtime values genuinely shared by FE + BE have no home. If a future FE form needs a backend Zod schema, reintroduce a SOURCE-ONLY shared package (no dist build) rather than importing runtime from `@repo/backend` | Keeps the fold types-only on the FE side and avoids bundle bloat; a thin source-only package is the sanctioned escape hatch |
| Components never import `AppType` | Components import named types from `@/lib/contracts` only | Keeps the derivation funnel single and reviewable |

## Key Files

> **2026-05-24:** `packages/shared` removed from this table — its envelope types fold into `apps/backend/src/shared/types.ts`; the FE has no shared-package row because it depends on backend types only via `@repo/backend` (type-only).

| File | Purpose |
|------|---------|
| `apps/frontend/src/lib/contracts.ts` | ✅ Canonical surface: the single source of derived FE types and the only place `InferResponseType`/`InferRequestType` is used |
| `apps/frontend/src/lib/api-client.ts:createApiClient` | Wraps `hc<AppType>` in `createApiClient(accessToken?)`; exports `apps/frontend/src/lib/api-client.ts:ApiClient` — the bridge type `contracts.ts` indexes into |
| `apps/backend/src/app.ts:buildApp` | Chains routers and exports `apps/backend/src/app.ts:AppType` (`= ReturnType<typeof buildApp>`) |
| `apps/backend/src/index.ts` | Re-exports `AppType` (`apps/backend/src/index.ts:7`) for the `@repo/backend` entry — the FE's only cross-package handle, consumed type-only |
| `apps/backend/package.json` | Points `main`/`types` at `./src/index.ts` (`apps/backend/package.json:6`–`apps/backend/package.json:7`) so FE resolves `AppType` from TS source, no build step |
| `apps/backend/src/shared/types.ts` | `2026-05-24:` Home for the envelope shapes (`ApiResponse<T>` single, `PaginatedResponse<T>` list), folded in from the deleted `packages/shared` (`86c975b`) |
| `apps/backend/src/shared/schemas.ts:paginationSchema` | Backend RESPONSE-side pagination metadata schema (`{ page, limit, total, pages }`) — consumed by `apps/backend/src/features/logs/schemas.ts`. NOTE the name collision with the deleted `packages/shared` REQUEST-side `paginationSchema` (`{ page, limit }`); only this backend one is real code |
| `apps/backend/src/features/health/routes.ts` | Reference enveloped endpoints — `healthCheckSchema` and `indexResponseSchema` both wrap `{ data }` |
| `apps/backend/src/features/logs/schemas.ts:logsByPathResponseSchema` | Reference enveloped list response (`{ data: T[], pagination }`); `getLogByIdRoute` wraps `{ data: logDetailResponseSchema }` |

## Data Flow

```
backend Zod response schema (z.object({ data }))
  -> chained into AppType (apps/backend/src/app.ts:buildApp, line 12)
  -> re-exported from @repo/backend (apps/backend/src/index.ts:7; TS source, main/types = ./src/index.ts, no build step)
  -> hc<AppType> in api-client.ts produces ApiClient (apps/frontend/src/lib/api-client.ts:ApiClient)
  -> contracts.ts derives named types by indexing ApiClient and peeling .data
  -> consumed by TanStack Query options / hooks / components
```

Because `@repo/backend` points `main`/`types` at `./src/index.ts` (`apps/backend/package.json:6`–`apps/backend/package.json:7`), the frontend resolves `AppType` straight from TypeScript source. No backend build step is needed for types to flow.

### Derivation mechanics

`contracts.ts` uses `InferResponseType` / `InferRequestType` from `hono/client`, indexed against `ApiClient`:

```ts
import type { InferRequestType, InferResponseType } from 'hono/client'
import type { ApiClient } from '@/lib/api-client'

// peel the { data } envelope on a 200 response
export type HealthResponse = InferResponseType<ApiClient['health']['$get']>['data']

// status-narrowing for non-200 success (e.g. 201 Created)
export type CreateThingResponse = InferResponseType<ApiClient['v1']['things']['$post'], 201>['data']

// list item = element of the list
export type ThingListItem = ThingListResponse[number]

// strip a nullable nested field
export type ThingDetail = NonNullable<ThingDetailResponse>
```

- `InferResponseType<E>` / `InferRequestType<E>` read the endpoint's declared response / request shape off `ApiClient`.
- `InferResponseType<E, 201>` narrows to a specific success status (use when the success code is not 200).
- `['data']` peels the uniform envelope; `[number]` takes the element type of a `{ data: T[] }` list; `NonNullable<...>` strips a nullable field.

### Naming conventions

| Type | Convention | Definition |
|------|------------|------------|
| Full response | `<Entity>Response` | `InferResponseType<E>['data']` |
| List item | `<Entity>ListItem` | `<Entity>ListResponse[number]` |
| Single detail | `<Entity>Detail` | derived from the detail endpoint's `.data` |
| Create input | `Create<Entity>Input` | `InferRequestType<E>['json']` |

`2026-05-24:` Runtime Zod schemas are NOT shared with the FE after the fold. `@repo/shared` is gone and the FE must not take a runtime import from `@repo/backend` (bundle-bloat risk — see [§ Architecture Decisions](#architecture-decisions)). If a future FE form genuinely needs a backend Zod schema for client-side validation, reintroduce a SOURCE-ONLY shared package (no dist build) and import the schema from there; do not import a runtime value from `@repo/backend`. The request-side `{ page, limit }` `paginationSchema` that `packages/shared` exported was dead code (only re-exported speculatively by `contracts.ts`, not consumed by any handler or form), so it was dropped in the fold (`86c975b`) rather than carried over.

## Security Considerations

- These contracts are compile-time only. They carry NO runtime trust — a derived type does not validate any actual payload at runtime.
- Runtime validation still happens at the backend boundary via Zod schemas. The envelope convention does not replace input validation.
- Schema/runtime drift is NOT caught: types are derived from the declared response schema, so if a handler returns more (or fewer) fields than its schema declares, the difference is invisible to the FE types and to any consumer relying on them. Keep handler output and its response schema in sync.
- No secrets or auth tokens are encoded in contracts; the auth token flows through `createApiClient(accessToken?)` headers (`apps/frontend/src/lib/api-client.ts:createApiClient`), not through any derived type.

## STOP Rules (for future sessions)

- Do NOT hand-write or inline a backend response type in a component. Derive it in `contracts.ts` and import it.
- Do NOT add an endpoint that returns an un-enveloped typed JSON response. Every success response MUST be `{ data: T }` (single) or `{ data: T[], pagination }` (list). (Static-asset/HTML routes via `Response`/`c.text` are exempt.)
- Do NOT bypass `contracts.ts` by importing `AppType` (or `ApiClient`) directly into a component to derive types ad hoc.
- `2026-05-24:` Do NOT add a runtime import from `@repo/backend` (or any backend module) into the frontend. The FE consumes `@repo/backend` type-only (the RPC `AppType`); a runtime import risks pulling the worker entry into the FE bundle. For a genuinely shared runtime value, reintroduce a source-only shared package — do not reach into the backend package.
- `2026-05-24:` Do NOT recreate `packages/shared`. Envelope types now live in `apps/backend/src/shared/types.ts`; if you need a runtime value shared across FE+BE, use the source-only-package escape hatch above.

If a change conflicts with any of these (e.g. a new endpoint cannot fit the `{ data: T }` envelope), STOP and ask the user before proceeding.

## Gaps — "not wired"

| Piece | Status | Note |
|-------|--------|------|
| `apps/frontend/src/lib/contracts.ts` | ✅ | Canonical surface created (`bb38424`) |
| Backend `{ data: T }` envelope | ✅ | Health (`apps/backend/src/features/health/routes.ts`) and logs (`apps/backend/src/features/logs/schemas.ts`) responses normalized to the envelope |
| ~~Fold `packages/shared` → `apps/backend/src/shared/`~~ | ✅ | Shipped `86c975b`. Envelope types moved to `apps/backend/src/shared/types.ts`, package deleted, workspace + `@repo/shared` deps removed from root/`apps/*` `package.json` |
| ~~Drop request-side `paginationSchema`/`PaginationInput`~~ | ✅ | Shipped `86c975b`. Dead re-export removed from `contracts.ts`; not carried into the backend |
