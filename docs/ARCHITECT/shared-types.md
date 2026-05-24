# Canonical Frontend Type Source

## Overview

The frontend derives ALL backend response and request types from one file, the planned `apps/frontend/src/lib/contracts.ts` (⬜ not yet created). It indexes into the Hono RPC `AppType` (via the `ApiClient` type from `apps/frontend/src/lib/api-client.ts:ApiClient`) using `InferResponseType` / `InferRequestType`, so no component ever hand-writes or re-derives a backend type. To make this clean, every backend typed JSON success response uses a uniform `{ data: T }` envelope (the `@repo/shared` `packages/shared/src/types.ts:ApiResponse` / `packages/shared/src/types.ts:PaginatedResponse` shapes), so `contracts.ts` can peel `.data` everywhere. This doc owns the `@repo/shared` substrate, the DTO/derivation rules, and the envelope convention.

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Single type source | `contracts.ts` derives every response/request type from `AppType`; components import only from `@/lib/contracts` | One place to change, no drift, no hand-written backend types in the UI |
| Derive, don't duplicate | Use `InferResponseType` / `InferRequestType` from `hono/client` against `apps/frontend/src/lib/api-client.ts:ApiClient` | Types follow the backend automatically with zero codegen |
| Uniform success envelope | Every typed JSON success response is `{ data: T }`; lists are `{ data: T[], pagination }` | Lets `contracts.ts` peel `.data` the same way for every endpoint |
| Reuse shared shapes | Envelope uses `packages/shared/src/types.ts:ApiResponse` and `packages/shared/src/types.ts:PaginatedResponse` | These shapes already exist; this gives them a real convention to enforce |
| Co-locate runtime schemas | Re-export the matching Zod schema from `@repo/shared` in the same entity block | Forms get validation + types from one import |
| Components never import `AppType` | Components import named types from `@/lib/contracts` only | Keeps the derivation funnel single and reviewable |

## Key Files

| File | Purpose |
|------|---------|
| `apps/frontend/src/lib/contracts.ts` | ⬜ Planned canonical surface (to be created): the single source of derived FE types and the only place `InferResponseType`/`InferRequestType` is used |
| `apps/frontend/src/lib/api-client.ts:createApiClient` | Wraps `hc<AppType>` in `createApiClient(accessToken?)`; exports `apps/frontend/src/lib/api-client.ts:ApiClient` — the bridge type `contracts.ts` indexes into |
| `apps/backend/src/app.ts:buildApp` | Chains routers and exports `apps/backend/src/app.ts:AppType` (`= ReturnType<typeof buildApp>`) |
| `apps/backend/src/index.ts` | Re-exports `AppType` (`apps/backend/src/index.ts:7`) for the `@repo/backend` entry |
| `apps/backend/package.json` | Points `main`/`types` at `./src/index.ts` (`apps/backend/package.json:6`–`apps/backend/package.json:7`) so FE resolves `AppType` from TS source, no build step |
| `packages/shared/src/types.ts:ApiResponse` | The single (`{ data: T }`) and list (`packages/shared/src/types.ts:PaginatedResponse`, `{ data: T[], pagination }`) envelope shapes contracts conform to |
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

Runtime Zod schemas are re-exported from `@repo/shared` in the same entity block so a form gets both validation and types from one import.

## Security Considerations

- These contracts are compile-time only. They carry NO runtime trust — a derived type does not validate any actual payload at runtime.
- Runtime validation still happens at the backend boundary via Zod schemas. The envelope convention does not replace input validation.
- Schema/runtime drift is NOT caught: types are derived from the declared response schema, so if a handler returns more (or fewer) fields than its schema declares, the difference is invisible to the FE types and to any consumer relying on them. Keep handler output and its response schema in sync.
- No secrets or auth tokens are encoded in contracts; the auth token flows through `createApiClient(accessToken?)` headers (`apps/frontend/src/lib/api-client.ts:createApiClient`), not through any derived type.

## STOP Rules (for future sessions)

- Do NOT hand-write or inline a backend response type in a component. Derive it in `contracts.ts` and import it.
- Do NOT add an endpoint that returns an un-enveloped typed JSON response. Every success response MUST be `{ data: T }` (single) or `{ data: T[], pagination }` (list). (Static-asset/HTML routes via `Response`/`c.text` are exempt.)
- Do NOT bypass `contracts.ts` by importing `AppType` (or `ApiClient`) directly into a component to derive types ad hoc.
- Do NOT reach into `@repo/shared` for response types in components — `@repo/shared` provides envelope shapes and runtime schemas only; derived response types come from `contracts.ts`.

If a change conflicts with any of these (e.g. a new endpoint cannot fit the `{ data: T }` envelope), STOP and ask the user before proceeding.

## Gaps — "not wired"

| Piece | Status | Note |
|-------|--------|------|
| `apps/frontend/src/lib/contracts.ts` | ⬜ | Canonical surface not yet created; this doc precedes implementation |
| Backend `{ data: T }` envelope | ✅ | Health (`apps/backend/src/features/health/routes.ts`) and logs (`apps/backend/src/features/logs/schemas.ts`) responses normalized to the envelope |
