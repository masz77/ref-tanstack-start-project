# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Fitality Clubs monorepo — bun workspaces with a TanStack Start frontend and a Hono Cloudflare Workers backend.

## Commands

### Root
```bash
bun install                              # Install all workspace deps
bun run dev:fe                           # Start frontend dev server (port 3000)
bun run dev:be                           # Start backend dev server (port 8787)
bun run typecheck                        # Type-check all workspaces (shared → frontend → backend)
bun run test                             # Run backend tests
bun run build                            # Build shared → frontend → backend
```

### Frontend (`apps/frontend`)
```bash
cd apps/frontend
bun run dev                              # Vite dev server
bun run build                            # Production build
bun run build:deploy                     # Build + deploy to Cloudflare Workers
bun run test                             # vitest
bun run lint                             # Biome check
bun run check                            # Biome check + auto-fix
```

### Backend (`apps/backend`)
```bash
cd apps/backend
bun run dev                              # wrangler dev (port 8787)
bun run test                             # vitest run
bun run d1:migrate:local                 # Apply D1 migrations locally
bun run d1:migrate:remote                # Apply D1 migrations to Cloudflare
bun run deploy                           # wrangler deploy
```

### Shared package (`packages/shared`)
```bash
cd packages/shared
bun run build                            # Compile to dist/
```

## Architecture

```
apps/
  frontend/          # TanStack Start (React 19 + TanStack Router + Vite)
                     # Deployed to Cloudflare Workers via @cloudflare/vite-plugin
                     # wrangler.jsonc name: fitality-clubs
  backend/           # Hono + D1 + better-auth (Cloudflare Workers)
                     # wrangler.json name: fitality-clubs-api
                     # Port: 8787 (local dev)
packages/
  shared/            # Compiled TypeScript: ApiResponse<T>, paginationSchema, etc.
```

## Tech Stack

### Frontend
- **Framework**: TanStack Start (React 19 + TanStack Router + Vite)
- **Deployment**: Cloudflare Workers (`@cloudflare/vite-plugin`, config in `wrangler.jsonc`)
- **Routing**: File-based via `src/routes/` — routeTree auto-generated to `src/routeTree.gen.ts` (never edit manually)
- **Styling**: Tailwind CSS v4 (CSS-first config in `src/styles.css`)
- **UI Components**: shadcn (base-nova style) with Base UI primitives — `src/components/ui/`
- **Icons**: `@phosphor-icons/react` exclusively
- **Linter/Formatter**: Biome (not ESLint/Prettier) — config in `biome.json`
- **API Client**: `src/lib/api-client.ts` — typed Hono RPC client via `hc<AppType>`
- **Auth Client**: `src/lib/auth-client.ts` — better-auth browser client
- **Package manager**: bun (lockfile: `bun.lock`)
- **Testing**: Vitest + Testing Library

### Backend
- **Framework**: Hono v4 with `@hono/zod-openapi`
- **Auth**: better-auth + better-auth-cloudflare (D1 + KV session store)
- **Database**: Cloudflare D1 (SQLite) via Drizzle ORM
- **Schema**: `src/db/schema.ts` — user, session, account, verification, passkey, apiLogs
- **Migrations**: `src/db/migrations/` — run via `wrangler d1 migrations apply`
- **Rate Limiting**: `hono-rate-limiter` with Cloudflare KV store
- **Logging**: API logger middleware stores to D1 `apiLogs` table
- **API Docs**: Scalar at `/reference`, OpenAPI JSON at `/doc`
- **Linter**: ESLint with `@antfu/eslint-config`

### Shared
- **Package**: `@repo/shared` — compiled to `dist/` with `.d.ts` declarations
- **Exports**: `ApiResponse<T>`, `ApiError`, `PaginatedResponse<T>`, `paginationSchema`

## Key Conventions

### Frontend
- **Path aliases**: Use `@/` for all imports (maps to `src/`)
- **Icons**: `@phosphor-icons/react` only — no lucide, heroicons, etc.
- **shadcn config**: `components.json` — uses `base-nova` style, Phosphor icons, no RSC
- **CSS variables**: oklch color space with light/dark theme tokens in `src/styles.css`
- **Biome rules**: No semicolons, single quotes, trailing commas. `noConsole: warn`, `noExplicitAny: off`
- **Reference design**: `ref.html` contains the target Fitality Clubs HTML design to replicate

### Backend
- **Path aliases**: Use `@/` for all imports (maps to `src/`)
- **Bindings**: Access via `c.env` — never `process.env` in Workers
- **D1 binding**: `DB` (renamed from template's long binding name)
- **KV binding**: `KV_BINDING`
- **CORS**: Configured via `CORS_ORIGINS` env var (comma-separated); set in `.dev.vars` locally
- **Auth routes**: all under `/api/auth/*` (better-auth handles routing)
- **RPC types**: Routes must be chained in `app.ts` (`app.route().route()`) for `AppType` to carry typed methods

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
Create feature files in `apps/backend/src/routes/v1/<feature>/`:
- `<feature>.routes.ts` — route definitions + router assembly
- `<feature>.controller.ts` — handlers
- Register in `apps/backend/src/app.ts` by chaining: `.route('/', yourNewRouter)`

## Adding UI Components

```bash
bunx shadcn@latest add <component-name>
```

Components use Base UI (`@base-ui/react`) under the hood, not Radix. Check existing components in `src/components/ui/` for patterns.
