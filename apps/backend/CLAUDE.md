# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## White-Label Template Project (Cloudflare Workers)

This is a **white-label starter template** designed to be cloned and customized for new projects deployed on Cloudflare Workers. It includes:

- **Authentication**: Email/password, passkeys, 2FA, anonymous users, admin roles
- **Multi-tenant Support**: Organization plugin for SaaS applications
- **Payment Integration**: Stripe subscriptions and webhook handling
- **Rate Limiting**: Cloudflare Durable Objects for global rate limiting
- **API Documentation**: Auto-generated OpenAPI specs with type generation
- **Edge Storage**: Cloudflare KV for caching and sessions
- **Database**: Cloudflare D1 (serverless SQLite) with Drizzle ORM and migrations

### Customizing for a New Project

When adapting this template for a new project:

1. **Update Project Name**: Edit `package.json` and `wrangler.toml` - change the `name` field
2. **Configure Bindings**: Set up D1, KV, and Durable Objects in `wrangler.toml`
3. **Customize Schema**: Modify `src/db/schema.ts` for your domain models
4. **Add Routes**: Create new route modules under `src/routes/v1/`
5. **Update Auth Config**: Adjust `src/lib/auth.ts` for your auth requirements
6. **Branding**: Update API metadata in `src/lib/configure-open-api.ts`
7. **Deploy**: Configure Cloudflare secrets and deploy with `wrangler deploy`

## Development Commands

### Core Development
- `bun run dev` - Start development server with hot reload
- `bun run dev:node` - Start development server using Node.js with tsx
- `bun run build` - Build for production (Bun target)
- `bun run build:node` - Build for Node.js with TypeScript compilation
- `bun run start` - Start production server (Bun)
- `bun run start:node` - Start production server (Node.js)

### Database Operations
- `bun run db:generate` - Generate database migrations from schema changes
- `bun run db:migrate` - Run pending database migrations
- `bun run db:push` - Push schema directly to database (development only)
- `bun run db:pull` - Pull schema from database

### Code Quality
- `bun run typecheck` - Run TypeScript type checking
- `bun run lint` - Run Biome linting and formatting checks
- `bun run lint:fix` - Auto-fix Biome issues
- `bun run format` - Format code with Biome
- `bun run test` - Run tests with Vitest
- `bun run test:node` - Run tests once

### API Development
- `bun run api:generate-types` - Generate TypeScript types from OpenAPI spec at http://localhost:3001/doc

## Architecture Overview

### Framework Stack
- **Hono.js** - Ultrafast web framework optimized for edge computing
- **Cloudflare Workers** - Deploy globally on Cloudflare's edge network
- **Better Auth** - Modern authentication with session management
  - Supports email/password, passkeys, 2FA, anonymous users, admin roles
  - Organization plugin for multi-tenant SaaS applications
- **Stripe** - Payment processing and subscription management
- **Cloudflare D1** - Serverless SQLite database at the edge
- **Drizzle ORM** - Type-safe database operations
- **Cloudflare KV** - Key-value storage for caching and sessions
- **Durable Objects** - Stateful coordination for rate limiting
- **Zod** - Runtime validation and OpenAPI schema generation
- **TypeScript** - Full type safety with path aliases (`@/*` maps to `./src/*`)

### Application Structure

#### Core App Setup (`src/app.ts`)
- Main application configuration and route registration
- Better Auth handler mounted at `/api/auth/*` (must come before other routes)
- Centralized route mounting with type inference for `AppType`

#### App Factory (`src/lib/create-app.ts`)
- Hono app factory with pre-configured middleware stack:
  - Request ID, CORS, favicon, Pino logging, API logging, optional auth
- Global error handling and 404 responses via Stoker middleware
- `createTestApp()` helper for testing scenarios

#### Environment & Configuration
- Environment validation with Zod schemas
- Bindings configured in `wrangler.toml`: D1, KV, Durable Objects
- Secrets in `.dev.vars` for local, Cloudflare secrets for production
- Required secrets: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `STRIPE_SECRET_KEY`, `LOGS_API_KEY`

#### Database Layer
- Schema definitions in `src/db/schema.ts` optimized for D1 (SQLite)
- Better Auth tables: `user`, `session`, `account`, `verification`, `passkey`
- Custom `apiLogs` table for request/response logging
- `baseEntity` helper for common fields (id, createdAt, updatedAt)
- Migrations applied via `wrangler d1 migrations apply`

#### Authentication System
- Better Auth configuration in `src/lib/auth.ts` with plugins:
  - Email/password, passkey, 2FA, anonymous, admin, organization
- Authentication middleware in `src/middlewares/auth.ts`:
  - `authMiddleware` - Required authentication
  - `optionalAuthMiddleware` - Optional authentication (applied globally)
  - `requireEmailVerified` - Email verification requirement
- Session management with 7-day expiry and 1-day update intervals

#### API Documentation
- OpenAPI 3.1 auto-generation with `@hono/zod-openapi`
- Configuration in `src/lib/configure-open-api.ts`
- Documentation available at `/doc` (Swagger) and `/reference` (Scalar)
- Type generation from OpenAPI spec into `src/types/api.ts`

#### Route Organization
- Versioned API structure under `src/routes/v1/`
- Route modules export routers that get mounted in `src/app.ts`
- Built-in routes: health check (`/health`), API info (`/`), logs dashboard (`/_logs`)

#### Middleware Stack
- **API Logging** - Request/response logging to database via `apiLoggingMiddleware`
- **Pino Logger** - Structured logging with configurable levels
- **Error Handler** - Global error handling with consistent response format
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
1. Modify `src/db/schema.ts`
2. Run `bun run db:generate` to create migration
3. Apply to D1: `wrangler d1 migrations apply your-db-name`
4. For local dev: `wrangler d1 migrations apply your-db-name --local`

#### Authentication Integration
- Use `authMiddleware` for protected routes
- Access authenticated user via `c.get("user")` in route handlers
- Use `getCurrentUser(c)` helper for type-safe user access

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