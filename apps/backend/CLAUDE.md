# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## White-Label Template Project (Cloudflare Workers)

This is a **white-label starter template** designed to be cloned and customized for new projects deployed on Cloudflare Workers. It includes:

- **Authentication**: Better Auth with email/password and anonymous-user plugins (a `passkey` table exists in the schema, but the passkey/2FA/admin/organization plugins are not currently wired)
- **Rate Limiting**: `hono-rate-limiter` with an in-memory per-isolate store (`src/lib/cloudflare-rate-limit-store.ts`)
- **API Documentation**: Auto-generated OpenAPI specs (Scalar at `/reference`, JSON at `/doc`)
- **Edge Storage**: Cloudflare KV binding available (optional; commented out in `wrangler.jsonc` until configured)
- **Database**: Cloudflare D1 (serverless SQLite) with Drizzle ORM and migrations

Stripe scaffolding exists but is NOT wired: a `subscription` table, a `user.stripeCustomerId` column, a placeholder `src/lib/stripe-plans.ts`, and an optional `STRIPE_SECRET_KEY` binding. There is no `stripe` dependency, no Stripe SDK calls, and no webhook handling.

### Customizing for a New Project

When adapting this template for a new project:

1. **Update Project Name**: Edit `package.json` and `wrangler.jsonc` - change the `name` field
2. **Configure Bindings**: Set up D1, KV, and Queue in `wrangler.jsonc`
3. **Customize Schema**: Modify `src/infrastructure/db/schema.ts` for your domain models
4. **Add Routes**: Create new feature modules under `src/features/<feature>/`
5. **Update Auth Config**: Adjust `src/auth/index.ts` for your auth requirements
6. **Branding**: Update API metadata in `src/lib/configure-open-api.ts`
7. **Deploy**: Configure Cloudflare secrets and deploy with `wrangler deploy`

## Development Commands

### Core Development
- `bun run dev` - Start the Wrangler dev server (port 8787)
- `bun run build` - Type-check the build (`tsc --noEmit`)
- `bun run typecheck` - Run TypeScript type checking (`tsc --noEmit`)
- `bun run deploy` - Deploy to Cloudflare with Wrangler

### Database Operations
- `bun run db:generate` - Generate Drizzle migrations from schema changes
- `bun run db:push` - Push schema directly to the database (development only)
- `bun run db:pull` - Pull schema from the database
- `bun run d1:migrate:local` - Apply D1 migrations locally
- `bun run d1:migrate:remote` - Apply D1 migrations to Cloudflare

### Testing
- `bun run test` - Run tests with Vitest (single run)
- `bun run test:watch` - Run tests in watch mode

## Architecture Overview

### Framework Stack
- **Hono.js** - Ultrafast web framework optimized for edge computing
- **Cloudflare Workers** - Deploy globally on Cloudflare's edge network
- **Better Auth** - Modern authentication with session management
  - Currently wired with the `anonymous` and `openAPI` plugins (see `src/auth/index.ts`); email/password is configured. The schema also has `passkey`/`account` tables for future plugins.
- **Cloudflare D1** - Serverless SQLite database at the edge
- **Drizzle ORM** - Type-safe database operations
- **Cloudflare KV** - Key-value storage binding (optional)
- **Cloudflare Queue** - Async message handling (`src/infrastructure/queue/`), wired via the `queue` handler in `src/index.ts`
- **`hono-rate-limiter`** - Rate limiting with an in-memory per-isolate store (no Durable Objects)
- **Zod** - Runtime validation and OpenAPI schema generation
- **TypeScript** - Full type safety with path aliases (`@/*` maps to `./src/*`)

### Application Structure

#### Core App Setup (`src/app.ts`)
- Main application configuration and route registration
- Better Auth handler mounted at `/api/auth/*` (must come before other routes)
- Centralized route mounting with type inference for `AppType`

#### App Factory (`src/lib/create-app.ts`)
- Hono app factory with pre-configured middleware stack:
  - Request ID, dynamic CORS, auth/emitter setup, rate limiter, emoji favicon, API logging
- Global error handling and 404 responses via Stoker middleware (`notFound`, `onError`)
- `createTestApp()` helper for testing scenarios

#### Environment & Configuration
- Bindings typed in `src/env.ts` (`AppEnv`); configured in `wrangler.jsonc`: D1 (`DB`), optional KV, Queue (`EVENTS_QUEUE`), `ASSETS`
- Secrets in `.dev.vars` for local, Cloudflare secrets for production
- Secrets/env referenced by the code: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `CORS_ORIGINS` (and optional `CORS_MAX_AGE`), `LOGS_API_KEY`. `STRIPE_SECRET_KEY` is declared as optional but unused (see the Stripe scaffolding note above).

#### Database Layer
- Schema definitions in `src/infrastructure/db/schema.ts` optimized for D1 (SQLite)
- Better Auth tables: `user`, `session`, `account`, `verification`, `passkey`
- Additional tables: `subscription` (Stripe scaffolding, unwired) and `apiLogs` (request/response logging)
- Migrations applied via `wrangler d1 migrations apply` (`bun run d1:migrate:local` / `d1:migrate:remote`)

#### Authentication System
- Better Auth configuration in `src/auth/index.ts` with the `anonymous` and `openAPI` plugins; email/password enabled
- Authentication middleware in `src/middleware/auth.ts`
- Auth routes mounted under `/api/auth/*` (`src/features/auth/routes.ts`)

#### API Documentation
- OpenAPI auto-generation with `@hono/zod-openapi`
- Configuration in `src/lib/configure-open-api.ts`
- OpenAPI JSON served at `/doc`; interactive reference (Scalar) at `/reference`

#### Route Organization
- Feature-based structure under `src/features/<feature>/` (`routes.ts` + co-located `schemas.ts`/`service.ts`)
- Routers are chained in `src/app.ts` (`buildApp`) so their methods carry into `AppType`
- Built-in routes: API info (`/`), health check (`/health`), logs API (`/v1/logs/*`)

#### Middleware Stack
- **API Logging** - Request/response logging to the `apiLogs` table via `apiLoggingMiddleware`
- **Rate Limiting** - `hono-rate-limiter` with the in-memory `CloudflareRateLimitStore`
- **Error Handler** - Global error handling via Stoker `onError` (consistent response format)
- **Validation** - Request validation using Zod schemas

### Development Patterns

#### Path Aliases
- Use `@/*` imports for all internal modules (configured in `tsconfig.json`)
- Example: `import { createRouter } from "@/lib/create-app"`

#### Route Creation
- Use `createRouter()` from `@/lib/create-app` for new route modules
- Define routes with OpenAPI schemas using `createRoute` from `@hono/zod-openapi`
- Import and mount routes in `src/app.ts`

#### Database Schema Changes
1. Modify `src/infrastructure/db/schema.ts`
2. Run `bun run db:generate` to create migration
3. Apply to D1: `wrangler d1 migrations apply your-db-name`
4. For local dev: `wrangler d1 migrations apply your-db-name --local`

#### Authentication Integration
- Use `authMiddleware` for protected routes
- Access authenticated user via `c.get("user")` in route handlers
- Use `getCurrentUser(c)` helper for type-safe user access

#### Response Envelope Convention
Every typed JSON success response MUST be wrapped in a uniform `{ data: T }` envelope (the `ApiResponse<T>` / `PaginatedResponse<T>` shapes in `src/shared/types.ts`): a single resource returns `{ data: T }`, a list returns `{ data: T[], pagination }`. This applies to both the Zod response schema and the matching `c.json(...)` return. The frontend's canonical type source `apps/frontend/src/lib/contracts.ts` derives all response types from `AppType` and peels `.data`, so an un-enveloped response breaks the convention. See `docs/ARCHITECT/shared-types.md`.

```ts
// schema: z.object({ data: <entity schema> })
// handler:
return c.json({ data: result }, 200);
```

(Static-asset/HTML routes served via `Response`/`c.text` are exempt — the convention covers typed JSON only.)

#### Code Quality Rules
- Biome for linting and formatting (configured in `biome.json`)
- Style: 2-space indent, double quotes, semicolons always
- Kebab-case filenames enforced
- No `process.env` usage (use `env` from `@/env` instead)

### Testing
- Vitest configuration with path alias support
- Use `createTestApp()` helper for integration tests
- Test environment loads `.env.test` file

### Build Targets
- **Cloudflare Workers**: Primary deployment target with global edge network
- **Wrangler**: Use `wrangler dev` for local development
- **Deployment**: Use `wrangler deploy` to publish to Cloudflare
- **Secrets**: Set via `wrangler secret put SECRET_NAME` for production