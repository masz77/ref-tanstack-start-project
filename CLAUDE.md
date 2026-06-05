# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

White-label monorepo template — bun workspaces with a TanStack Start frontend and a Hono Cloudflare Workers backend. Clone and customize for new projects.

## Commands

### Root
```bash
bun install                              # Install all workspace deps
bun run dev:fe                           # Start frontend dev server (port 3000)
bun run dev:be                           # Start backend dev server (port 8787)
bun run typecheck                        # Type-check workspaces (frontend -> backend)
bun run test                             # Run backend tests
bun run build                            # Build frontend -> backend
```

### Frontend (`apps/frontend`)
```bash
cd apps/frontend
bun run dev                              # Vite dev server
bun run build                            # Production build
bun run build:deploy                     # Build + deploy to Cloudflare Workers
bun run test                             # vitest run
bun run lint                             # Biome check
bun run check                            # Biome check + auto-fix
```

### Backend (`apps/backend`)
```bash
cd apps/backend
bun run dev                              # wrangler dev (port 8787)
bun run test                             # vitest run
bun run test:watch                       # vitest watch mode
bun run d1:migrate:local                 # Apply D1 migrations locally
bun run d1:migrate:remote                # Apply D1 migrations to Cloudflare
bun run db:generate                      # Generate Drizzle migrations from schema
bun run deploy                           # wrangler deploy
```

## Architecture

```
apps/
  frontend/          # TanStack Start (React 19 + TanStack Router + Vite)
                     # Deployed to Cloudflare Workers via @cloudflare/vite-plugin
  backend/           # Hono + D1 + better-auth (Cloudflare Workers)
                     # Port: 8787 (local dev)
                     # Envelope types (ApiResponse<T>, etc.) live in src/shared/types.ts
```

### Frontend
- **Framework**: TanStack Start (React 19 + TanStack Router + Vite)
- **Deployment**: Cloudflare Workers (`@cloudflare/vite-plugin`, config in `wrangler.jsonc`)
- **Routing**: File-based via `src/routes/` — routeTree auto-generated to `src/routeTree.gen.ts` (never edit manually)
- **Styling**: Tailwind CSS v4 (CSS-first config in `src/styles.css`, oklch color space)
- **UI Components**: shadcn (base-nova style) with Base UI primitives (`@base-ui/react`) — `src/components/ui/`
- **Icons**: `@phosphor-icons/react` exclusively
- **Linter/Formatter**: Biome — no semicolons, single quotes, trailing commas
- **API Client**: `src/lib/api-client.ts` — typed Hono RPC client via `hc<AppType>`
- **Auth Client**: `src/lib/auth-client.ts` — better-auth browser client
- **Testing**: Vitest + Testing Library

### Backend
- **Framework**: Hono v4 with `@hono/zod-openapi`
- **Auth**: better-auth + better-auth-cloudflare (D1 + KV session store)
- **Database**: Cloudflare D1 (SQLite) via Drizzle ORM
- **Schema**: `src/db/schema.ts` — user, session, account, verification, passkey
- **Migrations**: `src/db/migrations/` — run via `wrangler d1 migrations apply`
- **Rate Limiting**: `hono-rate-limiter` with Cloudflare KV store
- **Logging**: **Cloudflare Workers Logs** only — `requestLogMiddleware` emits one structured `console.log` per request; no DB log table. See `docs/ARCHITECT/observability-logging.md`.
- **API Docs**: Scalar at `/reference`, OpenAPI JSON at `/doc`
- **Queue**: Cloudflare Queue support with typed message handling (`src/infrastructure/queue/`)

### Shared types
- The envelope types (`ApiResponse<T>`, `ApiError`, `PaginatedResponse<T>`) live in `apps/backend/src/shared/types.ts` — there is no separate `packages/shared` package.
- The frontend derives all request/response types from the backend RPC `AppType` (type-only import via `@repo/backend`); it does not import these types directly.

## Key Conventions

### Frontend
- **Path aliases**: Use `@/` for all imports (maps to `src/`)
- **Icons**: `@phosphor-icons/react` only — no lucide, heroicons, etc.
- **shadcn config**: `components.json` — uses `base-nova` style, Phosphor icons, no RSC
- **Biome rules**: `noConsole: warn`, `noExplicitAny: off`

### Backend
- **Path aliases**: Use `@/` for all imports (maps to `src/`)
- **Bindings**: Access via `c.env` — never `process.env` in Workers
- **Feature-based structure**: `src/features/<feature>/routes.ts` with services, schemas co-located
- **CORS**: Configured via `CORS_ORIGINS` env var (comma-separated); set in `.dev.vars` locally
- **Auth routes**: all under `/api/auth/*` (better-auth handles routing)
- **RPC types**: Routes must be chained in `app.ts` (`app.route().route()`) for `AppType` to carry typed methods
- **Entry point**: `src/index.ts` exports module worker with `fetch` and `queue` handlers

## Type-Safe RPC Flow

The frontend consumes backend types end-to-end without code generation:

1. Backend chains routes in `apps/backend/src/app.ts` and exports `AppType`
2. `apps/backend/src/index.ts` re-exports `AppType`
3. Frontend imports `AppType` from `@repo/backend` (workspace dependency) in `src/lib/api-client.ts`
4. `hc<AppType>` creates a fully typed client — route paths, request params, and response shapes are all inferred

## Adding Routes

### Frontend
Create a new file in `apps/frontend/src/routes/`:
```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/path')({ component: MyPage })

function MyPage() {
  return <div>...</div>
}
```

The route tree regenerates automatically on dev server restart.

### Backend
Create feature files in `apps/backend/src/features/<feature>/`:
- `routes.ts` — route definitions + handlers (inline, not separate controllers)
- `schemas.ts` — Zod validation schemas (optional)
- `service.ts` — business logic, no HTTP context (optional)
- Register in `apps/backend/src/app.ts` by chaining: `.route('/', yourNewRouter)`

## Adding UI Components

```bash
bunx shadcn@latest add <component-name>
```

Components use Base UI (`@base-ui/react`) under the hood, not Radix. Check existing components in `src/components/ui/` for patterns.

## Customizing for a New Project

1. Update `name` in root `package.json` and both `wrangler.jsonc` files
2. Configure D1, KV, and Queue bindings in backend `wrangler.jsonc`
3. Modify `src/db/schema.ts` for your domain models
4. Add features under `src/features/` in the backend
5. Set secrets in `.dev.vars` locally: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `CORS_ORIGINS`
