# Feature-Based Architecture

## Overview

Restructure the codebase from a routes/controllers pattern to a feature-based architecture aligned with the Unified Step Model (Trigger -> Subscribe -> Handler -> Emit) defined in `.claude/rules/backend-organization.md`. Each business domain gets its own directory under `src/features/` containing co-located routes, schemas, and services. Cross-cutting infrastructure moves to dedicated directories (`middleware/`, `shared/`, `infrastructure/`).

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Organization | **Feature-based** (`src/features/`) | Co-locate route/schema/service per domain for high cohesion, low coupling |
| Controllers | **Eliminated** (inline handlers) | Routes are thin: validate input, call service, return response. No separate controller layer |
| Schemas | **Separate file per feature** (`schemas.ts`) | Single source of truth via Zod, co-located with domain. Shared schemas in `shared/schemas.ts` |
| Services | **Framework-agnostic** | No Hono context (`c`) in services. Accept typed data, return typed data |
| Events/Queue | **`infrastructure/`** | Cross-cutting concerns, not feature-specific. Events and queue are platform-level |
| Middleware dir | **Singular** (`middleware/`) | Convention alignment with `backend-organization.md` (was `middlewares/`) |
| Shared types | **`shared/`** directory | `AppBindings`, `AppRouteHandler`, common schemas, error types extracted from `lib/types.ts` |
| Auth config | **Stays at `src/auth/`** | Better Auth config is app-level infrastructure, not a feature |
| `lib/` | **Slimmed** | Only app-level utilities remain: `create-app.ts`, `configure-open-api.ts`, `stripe-plans.ts`, etc. |

## Key Files

### Before (Current Structure)

```
src/
├── app.ts                          # buildApp(), mounts routes
├── index.ts                        # Worker entry (fetch + queue)
├── auth/index.ts                   # Better Auth config (createAuth)
├── db/
│   ├── index.ts                    # createDb, Env type
│   └── schema.ts                   # Drizzle schema (apiLogs, auth tables)
├── events/
│   ├── types.ts                    # AppEvents discriminated union
│   └── listeners.ts                # onUserCreated, onSubscriptionChanged, etc.
├── queue/
│   ├── types.ts                    # QueueMessage discriminated union
│   ├── handler.ts                  # handleQueue (batch processor)
│   └── handlers/                   # email.ts, stripe.ts, webhook.ts, logs.ts
├── lib/
│   ├── types.ts                    # AppBindings, AppOpenAPI, AppRouteHandler
│   ├── create-app.ts               # createApp(), createRouter(), createTestApp()
│   ├── configure-open-api.ts       # OpenAPI/Scalar docs config
│   ├── cache.ts                    # CacheService interface + KV implementation
│   ├── api-logger.ts               # ApiLogger utility class
│   ├── cloudflare-rate-limit-store.ts  # Durable Objects rate limit store
│   ├── commonApiSchema.ts          # Shared Zod schemas (pagination, bulk ops)
│   ├── cookie-utils.ts             # Cookie helpers
│   ├── pii-anonymizer.ts           # PII redaction
│   ├── stripe-plans.ts             # Stripe plan config
│   └── cron/                       # Cron manager
├── middlewares/                     # (plural, to be renamed)
│   ├── auth.ts                     # authMiddleware, optionalAuth, requireEmailVerified
│   ├── api-logger.ts               # apiLoggingMiddleware
│   ├── error-handler.ts            # Global error handler
│   └── validation.ts               # Body/query/params validators, common schemas
├── routes/
│   ├── auth.route.ts               # Better Auth catch-all (/api/auth/*)
│   ├── index.route.ts              # Health, index, test, _logs dashboard
│   └── v1/logs/
│       ├── logs.routes.ts          # Route definitions + Zod schemas (mixed)
│       ├── logs.controller.ts      # Handler functions (validateApiKey + delegate)
│       ├── logs.service.ts         # Business logic (createLogsService factory)
│       ├── logs-batch.ts           # Batch insert helpers
│       ├── logs-cache.ts           # In-memory LogsCache class
│       └── logs-transformers.ts    # LogData type + toInsertPayload
└── types/                          # Generated API types
```

### After (Target Structure)

```
src/
├── app.ts                          # buildApp(), mounts feature routes
├── index.ts                        # Worker entry (fetch + queue)
├── auth/index.ts                   # Better Auth config (stays as-is)
│
├── features/
│   ├── logs/
│   │   ├── routes.ts               # Route defs + inline handlers (no controller)
│   │   ├── schemas.ts              # Zod schemas extracted from logs.routes.ts
│   │   └── service.ts              # createLogsService (absorbs batch/cache/transformers)
│   ├── auth/
│   │   └── routes.ts               # Better Auth catch-all route (/api/auth/*)
│   └── health/
│       └── routes.ts               # Health check, index, test, _logs dashboard
│
├── middleware/                      # Singular (renamed from middlewares/)
│   ├── auth.ts                     # authMiddleware, optionalAuth, requireEmailVerified
│   ├── api-logger.ts               # apiLoggingMiddleware
│   ├── error-handler.ts            # Global error handling
│   └── validation.ts               # Request validation utilities
│
├── shared/
│   ├── types.ts                    # AppBindings, AppOpenAPI, AppRouteHandler
│   ├── schemas.ts                  # Pagination, error response, bulk operation schemas
│   └── errors.ts                   # ErrorResponse type, createErrorResponse helper
│
├── infrastructure/
│   ├── db/
│   │   ├── index.ts                # createDb, Env type, CloudflareD1Database type
│   │   └── schema.ts               # Drizzle schema definitions
│   ├── cache/
│   │   └── index.ts                # CacheService interface + KV/InMemory implementations
│   ├── events/
│   │   ├── types.ts                # AppEvents, AppEmitter types
│   │   └── listeners.ts            # Event listener functions + safeQueue
│   └── queue/
│       ├── types.ts                # QueueMessage discriminated union
│       ├── handler.ts              # handleQueue batch processor with retry/DLQ
│       └── handlers/               # email.ts, stripe.ts, webhook.ts, logs.ts
│
├── lib/                            # Slimmed - app-level utilities only
│   ├── create-app.ts               # createApp(), createRouter(), createTestApp()
│   ├── configure-open-api.ts       # OpenAPI/Scalar docs config
│   ├── api-logger.ts               # ApiLogger utility class
│   ├── cloudflare-rate-limit-store.ts  # Durable Objects rate limit store
│   ├── cookie-utils.ts             # Cookie helpers
│   ├── pii-anonymizer.ts           # PII redaction
│   ├── stripe-plans.ts             # Stripe plan config
│   └── cron/                       # Cron manager
│
└── types/                          # Generated API types
```

## File-Level Key Files

| File | Purpose |
|------|---------|
| `src/features/logs/routes.ts` | Logs API routes with inline handlers. Validates API key, calls service, returns response |
| `src/features/logs/schemas.ts` | All Zod schemas for logs: base, response, query params, route definitions |
| `src/features/logs/service.ts` | `createLogsService()` factory. Absorbs `logs-batch.ts`, `logs-cache.ts`, `logs-transformers.ts` |
| `src/features/auth/routes.ts` | Better Auth catch-all handler (`/api/auth/*`) |
| `src/features/health/routes.ts` | Health check, API index, test endpoint, `/_logs` dashboard |
| `src/middleware/auth.ts` | `authMiddleware`, `optionalAuthMiddleware`, `requireEmailVerified`, `getCurrentUser` |
| `src/middleware/api-logger.ts` | `apiLoggingMiddleware()` - request/response logging |
| `src/middleware/error-handler.ts` | Global error handler middleware |
| `src/middleware/validation.ts` | Generic body/query/params validators, common validation schemas |
| `src/shared/types.ts` | `AppBindings`, `AppOpenAPI`, `AppRouteHandler` (from `lib/types.ts`) |
| `src/shared/schemas.ts` | Pagination, bulk ops, success/error response schemas (from `lib/commonApiSchema.ts`) |
| `src/infrastructure/db/` | D1 database connection + Drizzle schema (from `src/db/`) |
| `src/infrastructure/cache/index.ts` | `CacheService` interface + `KVCacheService` + `InMemoryCacheService` (from `lib/cache.ts`) |
| `src/infrastructure/events/` | Event emitter types + listeners (from `src/events/`) |
| `src/infrastructure/queue/` | Queue handler + message type handlers (from `src/queue/`) |
| `src/lib/create-app.ts` | App factory with middleware stack |
| `src/app.ts` | Route composition and `AppType` export |
| `src/index.ts` | Worker entry point (`fetch` + `queue` handlers) |

## Data Flow

### HTTP Request (Trigger -> Handler -> Emit)

```
HTTP Request
    │
    ▼
index.ts (fetch)
    │
    ▼
app.ts (buildApp)
    │
    ├── lib/create-app.ts middleware stack:
    │   ├── requestId()
    │   ├── CORS (dynamic from env)
    │   ├── Auth init (sets auth + emitter on context)
    │   ├── Rate limiting (Durable Objects store)
    │   ├── Favicon
    │   └── apiLoggingMiddleware
    │
    ▼
features/{domain}/routes.ts       ← TRIGGER (validate input, thin handler)
    │
    ▼
features/{domain}/service.ts      ← HANDLER (business logic, no HTTP context)
    │
    ├── infrastructure/db/         ← Data access (Drizzle + D1)
    ├── infrastructure/cache/      ← KV caching layer
    │
    ▼
routes.ts returns c.json(...)     ← Response (inline, no controller)
    │
    ▼ (optional, fire-and-forget via waitUntil)
infrastructure/events/listeners   ← EMIT (side-effects via @hono/event-emitter)
    │
    └── safeQueue() → Cloudflare Queue
```

### Queue Processing (Subscribe -> Handler)

```
Cloudflare Queue batch
    │
    ▼
index.ts (queue export)
    │
    ▼
infrastructure/queue/handler.ts   ← SUBSCRIBE (batch processor, retry + DLQ)
    │
    ▼
infrastructure/queue/handlers/    ← Per-type handlers:
    ├── email.ts                     email:send
    ├── stripe.ts                    stripe:sync
    ├── webhook.ts                   webhook:process
    └── logs.ts                      logs:cleanup
```

### Event System (Dual Architecture)

The project uses two event mechanisms (documented in `docs/DECISIONS/event-driven-architecture.md`):

1. **Synchronous**: `@hono/event-emitter` - in-process events for immediate side-effects
2. **Asynchronous**: Cloudflare Queues - durable, cross-worker message processing

Event listeners in `infrastructure/events/listeners.ts` bridge the two: they handle synchronous events and optionally queue async work via `safeQueue()`.

## Migration Map

| Before | After |
|--------|-------|
| `src/routes/v1/logs/logs.routes.ts` (schemas + route defs) | `src/features/logs/schemas.ts` + `src/features/logs/routes.ts` |
| `src/routes/v1/logs/logs.controller.ts` | Merged into `src/features/logs/routes.ts` (inline handlers) |
| `src/routes/v1/logs/logs.service.ts` | `src/features/logs/service.ts` |
| `src/routes/v1/logs/logs-batch.ts` | Absorbed into `src/features/logs/service.ts` |
| `src/routes/v1/logs/logs-cache.ts` | Absorbed into `src/features/logs/service.ts` |
| `src/routes/v1/logs/logs-transformers.ts` | Absorbed into `src/features/logs/service.ts` |
| `src/routes/auth.route.ts` | `src/features/auth/routes.ts` |
| `src/routes/index.route.ts` | `src/features/health/routes.ts` |
| `src/middlewares/*` | `src/middleware/*` (rename only) |
| `src/lib/types.ts` | `src/shared/types.ts` |
| `src/lib/commonApiSchema.ts` | `src/shared/schemas.ts` |
| `src/db/*` | `src/infrastructure/db/*` |
| `src/lib/cache.ts` | `src/infrastructure/cache/index.ts` |
| `src/events/*` | `src/infrastructure/events/*` |
| `src/queue/*` | `src/infrastructure/queue/*` |

## Migration Steps

1. **Create `src/features/logs/`** - Split schemas from route defs, inline controller handlers into routes, keep service
2. **Create `src/features/auth/`** - Move auth route
3. **Create `src/features/health/`** - Move health/index/test/_logs routes
4. **Rename `src/middlewares/` to `src/middleware/`** - Update all imports
5. **Create `src/shared/`** - Move types and common schemas
6. **Create `src/infrastructure/`** - Move db, cache, events, queue
7. **Update `src/app.ts` and `src/lib/create-app.ts`** - Fix all import paths
8. **Clean up old directories** - Remove empty dirs, verify build passes

## Security Considerations

No changes to security patterns:

- API key validation for logs endpoints remains in route handlers
- `authMiddleware` / `optionalAuthMiddleware` unchanged in behavior
- Rate limiting via Durable Objects unchanged
- CORS dynamic configuration unchanged
- PII anonymizer stays in `lib/`
- No new external integrations introduced
- Error messages continue to avoid leaking internal details

## What Does NOT Change

- **Auth config** (`src/auth/`) stays at app level
- **Database schema** and migrations untouched
- **Worker entry point** (`src/index.ts`) - only import paths change
- **Better Auth handler** - just moves to `features/auth/routes.ts`
- **Business logic** in logs service - no behavioral changes
- **Queue handler** and message types - only directory location changes
- **Test files** - paths updated to match new locations
- **OpenAPI spec** and documentation endpoints unchanged

## Post-Migration Refinements

Completed after initial migration to close remaining gaps vs `backend-organization.md`:

| Refinement | Detail |
|---|---|
| **Cache directory** | `infrastructure/cache.ts` → `infrastructure/cache/index.ts` with co-located tests |
| **Centralized `env.ts`** | Created `src/env.ts` with `AppEnv` type (Bindings + Variables). `shared/types.ts` re-exports as `AppBindings`. `db/index.ts` uses `Pick<AppEnv["Bindings"], ...>` |
| **Route chaining** | `app.ts` uses chained `.route()` calls instead of forEach for proper RPC type inference |
| **`validateApiKey` typed** | Changed from `(c: any)` to `(c: Context<AppBindings>)` for type-safe env access |
| **Hono version fixed** | Resolved duplicate hono versions (4.8.5 vs 4.11.7) and bumped to `^4.11.7` |
| **tsconfig** | Excluded `mini-test-fe/` from typecheck |
