# TanStack Start + Hono CF Worker Monorepo Setup

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the existing TanStack Start project into a bun-workspace monorepo with an independently deployable Hono+D1 Cloudflare Workers backend (`apps/backend`) and a shared types package, connected via a typed RPC client (`hc<AppType>`).

**Architecture:** Bun workspaces (no Turborepo) with three packages: `apps/frontend` (TanStack Start, Cloudflare Workers), `apps/backend` (Hono + D1 + better-auth, Cloudflare Workers), `packages/shared` (compiled Zod schemas + ApiResponse types). The frontend imports `AppType` from `@repo/backend` as a devDependency for end-to-end RPC type safety.

**Tech Stack:** bun workspaces, TanStack Start (React 19 + TanStack Router + Vite), Hono v4 (`@hono/zod-openapi`), Cloudflare D1, Drizzle ORM, better-auth, Cloudflare Workers, wrangler, vitest, TypeScript 5, Zod, Biome, Scalar API reference.

**Backend source:** `/Volumes/ssd/sam/Developer/sam-hono-template-cloudflare-worker` — copy this entire project as `apps/backend`.

---

## File Map

### Root (modified)
| File | Change |
|------|--------|
| `package.json` | Strip to workspace root: bun workspace config, scripts that delegate to workspaces |
| `.gitignore` | Add monorepo ignores |
| `CLAUDE.md` | Update commands and architecture for monorepo |

### Frontend (moved from root → `apps/frontend`)
All existing files move. No code changes — just relocate + create a new `package.json` as `@repo/frontend`.

| File | Responsibility |
|------|---------------|
| `apps/frontend/package.json` | Workspace package `@repo/frontend`, refs `@repo/shared workspace:*` and `@repo/backend workspace:*` as devDep |
| `apps/frontend/src/lib/api-client.ts` | **Create**: typed Hono RPC client factory (`hc<AppType>`) |
| `apps/frontend/src/lib/auth-client.ts` | **Create**: better-auth browser client |
| `apps/frontend/src/routes/health-demo.tsx` | **Create**: demo route calling backend `/health` endpoint |

### Shared Package (created)
| File | Responsibility |
|------|---------------|
| `packages/shared/package.json` | `@repo/shared`, compiles to `dist/` |
| `packages/shared/tsconfig.json` | Compiles `src/` → `dist/` with declarations |
| `packages/shared/src/types.ts` | `ApiResponse<T>`, `ApiError`, `PaginatedResponse<T>` |
| `packages/shared/src/schemas.ts` | Shared Zod schemas (`paginationSchema`) |
| `packages/shared/src/index.ts` | Barrel export |

### Backend (copied from `sam-hono-template-cloudflare-worker`)
All source files are copied from the template. Only the files below need edits after copying.

| File | Responsibility / Change |
|------|------------------------|
| `apps/backend/package.json` | Rename to `@repo/backend`, add `@repo/shared workspace:*` dep, remove `package-lock.json` |
| `apps/backend/wrangler.json` | Rename worker to `fitality-clubs-api`, update D1 binding name to `DB` |
| `apps/backend/src/db/index.ts` | Update `Env` interface: `data_151f7d9b365f41d783ed0bf4eeef5086` → `DB`, `KV` → `KV_BINDING` |
| `apps/backend/src/auth/index.ts` | Update `CloudflareAuthEnv` + runtime access: use `DB` and `KV_BINDING` bindings |
| `apps/backend/src/app.ts` | Refactor `buildApp()` to **chain** routes (required for `AppType` RPC inference) |
| `apps/backend/src/index.ts` | Re-export `AppType` so frontend can import it |
| `apps/backend/.dev.vars` | Local secrets template (CORS_ORIGINS, etc.) |
| `apps/backend/tests/health.test.ts` | **Create**: test for `/health` endpoint, with `executionCtx` mock for vitest |

---

## Task 1: Monorepo Root Scaffold

**Files:**
- Modify: `package.json`
- Modify: `.gitignore`

- [ ] **Step 1: Replace root `package.json`**

Strip to workspace-root-only. All app-specific deps move to their workspace packages:

```json
{
  "name": "fitality-monorepo",
  "private": true,
  "type": "module",
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev:fe": "bun run --filter @repo/frontend dev",
    "dev:be": "bun run --filter @repo/backend dev",
    "build": "bun run --filter @repo/shared build && bun run --filter @repo/frontend build && bun run --filter @repo/backend build",
    "typecheck": "bun run --filter @repo/shared typecheck && bun run --filter @repo/frontend typecheck && bun run --filter @repo/backend typecheck",
    "lint": "bun run --filter @repo/frontend lint",
    "test": "bun run --filter @repo/backend test"
  },
  "devDependencies": {
    "typescript": "^5.7.2"
  }
}
```

> **Note:** There is no root `dev` script because the frontend and backend are independent servers (ports 3000 and 8787). Use `dev:fe` and `dev:be` in separate terminals. A root `dev` that runs all workspaces would also attempt `@repo/shared` which has no dev server and would error.

- [ ] **Step 2: Add monorepo entries to `.gitignore`**

Append to the existing `.gitignore`:

```
# monorepo build outputs
apps/*/dist
packages/*/dist
apps/*/.wrangler
apps/*/node_modules
packages/*/node_modules
```

- [ ] **Step 3: Create `apps/` and `packages/` directories**

```bash
mkdir -p apps packages
```

- [ ] **Step 4: Commit**

```bash
git add package.json .gitignore
git commit -m "chore: add monorepo root scaffold (bun workspaces)"
```

---

## Task 2: Move TanStack Start Frontend to `apps/frontend`

**Files:**
- Create: `apps/frontend/` (from root files)
- Create: `apps/frontend/package.json`

All commands run from the **repo root**.

- [ ] **Step 1: Create the frontend directory and move all existing app files**

```bash
mkdir -p apps/frontend
mv src apps/frontend/src
mv public apps/frontend/public
mv biome.json apps/frontend/biome.json
mv components.json apps/frontend/components.json
mv vite.config.ts apps/frontend/vite.config.ts
mv tsconfig.json apps/frontend/tsconfig.json
mv wrangler.jsonc apps/frontend/wrangler.jsonc
mv prettier.config.js apps/frontend/prettier.config.js 2>/dev/null || true
mv .prettierignore apps/frontend/.prettierignore 2>/dev/null || true
mv ref.html apps/frontend/ref.html 2>/dev/null || true
```

- [ ] **Step 2: Create `apps/frontend/package.json`**

Matches existing dependency versions exactly. Adds workspace references:

```json
{
  "name": "@repo/frontend",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "build:deploy": "bun run build && bunx wrangler deploy",
    "preview": "vite preview",
    "test": "vitest run",
    "lint": "biome check",
    "format": "biome format --write",
    "check": "biome check --write",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@base-ui/react": "^1.2.0",
    "@cloudflare/vite-plugin": "^1.25.6",
    "@fontsource-variable/roboto": "^5.2.10",
    "@phosphor-icons/react": "^2.1.10",
    "@tailwindcss/vite": "^4.0.6",
    "@tanstack/react-devtools": "^0.7.0",
    "@tanstack/react-form": "^1.28.5",
    "@tanstack/react-pacer": "^0.20.0",
    "@tanstack/react-router": "^1.166.0",
    "@tanstack/react-router-devtools": "^1.166.0",
    "@tanstack/react-router-ssr-query": "^1.131.7",
    "@tanstack/react-start": "^1.166.0",
    "@tanstack/react-table": "^8.21.3",
    "@tanstack/react-virtual": "^3.13.22",
    "@tanstack/router-plugin": "^1.166.0",
    "@repo/shared": "workspace:*",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "shadcn": "^3.8.5",
    "tailwind-merge": "^3.5.0",
    "tailwindcss": "^4.0.6",
    "tw-animate-css": "^1.4.0",
    "vite-tsconfig-paths": "^5.1.4"
  },
  "devDependencies": {
    "@biomejs/biome": "^2.4.4",
    "@repo/backend": "workspace:*",
    "@tanstack/devtools-vite": "^0.3.11",
    "@testing-library/dom": "^10.4.0",
    "@testing-library/react": "^16.2.0",
    "@types/node": "^22.10.2",
    "@types/react": "^19.2.0",
    "@types/react-dom": "^19.2.0",
    "@vitejs/plugin-react": "^5.0.4",
    "better-auth": "^1.2.8",
    "hono": "^4.7.11",
    "jsdom": "^27.0.0",
    "typescript": "^5.7.2",
    "vite": "^7.1.7",
    "vitest": "^3.0.5",
    "web-vitals": "^5.1.0",
    "wrangler": "^4.69.0"
  }
}
```

Note: `@repo/backend` is a devDependency (type imports only — no runtime code from backend runs in the browser). `hono` and `better-auth` are added as runtime deps for the RPC client and auth client.

- [ ] **Step 3: Update `apps/frontend/wrangler.jsonc` worker name**

The file already exists. Update the `"name"` field to distinguish it from the backend:

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "fitality-clubs",
  "compatibility_date": "2025-09-27",
  "observability": {
    "enabled": true
  },
  "main": "@tanstack/react-start/server-entry",
  "compatibility_flags": [
    "nodejs_compat"
  ]
}
```

No changes needed — this is already correct. This step is a verification only.

- [ ] **Step 4: Verify `apps/frontend/vite.config.ts` still resolves tsconfig paths**

The file should still work as-is since `viteTsConfigPaths` reads `./tsconfig.json` relative to the config file location. Verify the content hasn't changed:

```ts
// apps/frontend/vite.config.ts — should look like this (no changes needed):
import { cloudflare } from '@cloudflare/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import viteTsConfigPaths from 'vite-tsconfig-paths'

const config = defineConfig({
  plugins: [
    devtools(),
    viteTsConfigPaths({ projects: ['./tsconfig.json'] }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
  ],
})

export default config
```

- [ ] **Step 5: Commit**

```bash
git add apps/frontend
git commit -m "chore: migrate TanStack Start app to apps/frontend workspace"
```

---

## Task 3: Shared Types Package

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/types.ts`
- Create: `packages/shared/src/schemas.ts`
- Create: `packages/shared/src/index.ts`

- [ ] **Step 1: Create `packages/shared/package.json`**

```json
{
  "name": "@repo/shared",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "zod": "^3.25.51"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

- [ ] **Step 2: Create `packages/shared/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2020"],
    "strict": true,
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create `packages/shared/src/types.ts`**

```ts
export interface ApiResponse<T> {
  data: T
}

export interface ApiError {
  error: string
  status: number
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}
```

- [ ] **Step 4: Create `packages/shared/src/schemas.ts`**

```ts
import { z } from 'zod'

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type PaginationInput = z.infer<typeof paginationSchema>
```

- [ ] **Step 5: Create `packages/shared/src/index.ts`**

```ts
export * from './types'
export * from './schemas'
```

- [ ] **Step 6: Commit**

```bash
git add packages/shared
git commit -m "feat: add @repo/shared package with common types and schemas"
```

---

## Task 4: Copy Hono CF Worker to `apps/backend`

This task physically copies the entire `sam-hono-template-cloudflare-worker` project, then makes targeted edits to rename/configure it for this monorepo.

All commands run from the **repo root**.

- [ ] **Step 1: Copy the template**

```bash
cp -r /Volumes/ssd/sam/Developer/sam-hono-template-cloudflare-worker apps/backend
```

- [ ] **Step 2: Remove npm lockfile and template-specific artifacts**

```bash
rm -f apps/backend/package-lock.json
rm -rf apps/backend/.auto-claude
rm -f apps/backend/.auto-claude-security.json
rm -f apps/backend/.claude_settings.json
rm -f apps/backend/AGENTS.md
rm -f apps/backend/QWEN.md
rm -rf apps/backend/.wrangler
rm -rf apps/backend/data
rm -rf apps/backend/dist
rm -f apps/backend/.DS_Store
rm -f apps/backend/src/.DS_Store
rm -f apps/backend/public/.DS_Store
rm -f apps/backend/public/_logs/.DS_Store
```

- [ ] **Step 3: Replace `apps/backend/package.json`**

Renames the package, adds `@repo/shared` dependency, removes npm-specific fields:

```json
{
  "name": "@repo/backend",
  "type": "module",
  "version": "0.1.0",
  "license": "MIT",
  "scripts": {
    "dev": "wrangler dev",
    "build": "tsc --noEmit",
    "d1:migrate:remote": "wrangler d1 migrations apply DB --remote",
    "d1:migrate:local": "wrangler d1 migrations apply DB --local",
    "db:generate": "drizzle-kit generate",
    "db:push": "drizzle-kit push",
    "db:pull": "drizzle-kit pull",
    "deploy": "wrangler deploy",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@hono/zod-openapi": "^0.19.8",
    "@libsql/client": "^0.15.8",
    "@repo/shared": "workspace:*",
    "@scalar/hono-api-reference": "^0.9.2",
    "better-auth": "^1.2.8",
    "better-auth-cloudflare": "0.2.7",
    "drizzle-orm": "^0.44.6",
    "drizzle-zod": "^0.5.1",
    "hono": "^4.7.11",
    "hono-rate-limiter": "^0.4.2",
    "stoker": "1.4.3",
    "zod": "^3.25.51"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20250224.0",
    "@types/node": "^24.0.10",
    "bun-types": "^1.2.20",
    "cross-env": "^7.0.3",
    "drizzle-kit": "^0.31.5",
    "tsc-alias": "^1.8.16",
    "tsx": "^4.19.4",
    "typescript": "^5.8.3",
    "vitest": "^3.2.1",
    "wrangler": "^4.44.0"
  }
}
```

- [ ] **Step 4: Update `apps/backend/wrangler.json`**

Replace the worker name and simplify the D1 binding name to `DB`:

```json
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "compatibility_date": "2025-10-08",
  "main": "src/index.ts",
  "name": "fitality-clubs-api",
  "upload_source_maps": true,
  "d1_databases": [
    {
      "binding": "DB",
      "database_id": "REPLACE_WITH_YOUR_D1_ID",
      "migrations_dir": "src/db/migrations",
      "database_name": "fitality-clubs-db"
    }
  ],
  "kv_namespaces": [
    {
      "binding": "KV_BINDING",
      "id": "REPLACE_WITH_YOUR_KV_ID"
    }
  ],
  "observability": {
    "enabled": true
  },
  "placement": {
    "mode": "smart"
  },
  "assets": {
    "directory": "./public/",
    "binding": "ASSETS"
  }
}
```

> **Note:** Replace `REPLACE_WITH_YOUR_D1_ID` and `REPLACE_WITH_YOUR_KV_ID` with real IDs when provisioning. For local dev, wrangler auto-creates a local SQLite file — you don't need real IDs to run `wrangler dev`.

- [ ] **Step 5: Update `apps/backend/src/db/index.ts` to use `DB` and `KV_BINDING`**

The copied file references `data_151f7d9b365f41d783ed0bf4eeef5086` for D1 and `KV` for KV. Update **both** binding names (the `KV` → `KV_BINDING` rename fixes a pre-existing mismatch between the template's `db/index.ts` and its `wrangler.json`):

```ts
import type { KVNamespace } from '@cloudflare/workers-types'
import { drizzle, type AnyD1Database, type DrizzleD1Database } from 'drizzle-orm/d1'
import * as schema from './schema'

export interface Env {
  DB?: AnyD1Database
  KV_BINDING?: KVNamespace
}

type DatabaseInstance = DrizzleD1Database<typeof schema>

export function createDb(env: Env): DatabaseInstance {
  const binding = env.DB
  if (!binding) {
    throw new Error('D1 database binding (DB) is not configured.')
  }
  return drizzle(binding, { schema })
}

export type { DatabaseInstance as CloudflareD1Database }
export default createDb
```

- [ ] **Step 6: Update `apps/backend/src/auth/index.ts` to use `DB` and `KV_BINDING`**

Open `apps/backend/src/auth/index.ts`. Make **all three** of these changes:

**Change 1 — remove the `DATABASE` reference in `d1Binding` (line ~24-25):**
```ts
// Change FROM:
const d1Binding = env?.DATABASE ?? env?.data_151f7d9b365f41d783ed0bf4eeef5086
// Change TO:
const d1Binding = env?.DB
```
> The `DATABASE` field no longer exists in the updated `Env` type, so `env?.DATABASE ?? env?.DB` would be a TypeScript error. Use only `env?.DB`.

**Change 2 — update `kv:` runtime access (line ~51):**
```ts
// Change FROM:
kv: env?.KV,
// Change TO:
kv: env?.KV_BINDING,
```

**Change 3 — update `CloudflareAuthEnv` type:**
```ts
// Change FROM:
export type CloudflareAuthEnv = DatabaseEnv & {
  DATABASE?: D1Database
  KV?: KVNamespace
}
// Change TO:
export type CloudflareAuthEnv = DatabaseEnv & {
  DB?: D1Database
  KV_BINDING?: KVNamespace
}
```

- [ ] **Step 7: Update `apps/backend/src/lib/types.ts` to use `DB` binding**

The `AppBindings` interface references `DbEnv`. Since we updated `db/index.ts`, the `Env` interface there now uses `DB`. Verify `types.ts` still compiles — no changes should be needed (it imports `Env` from `@/db`).

- [ ] **Step 8: Refactor `apps/backend/src/app.ts` to chain routes (required for `AppType` RPC inference)**

> **Critical:** Hono's RPC type system requires **chained** `.route()` calls to infer typed path methods (`.health.$get()`, etc.). The template uses `forEach` which loses all route-level type information, making `AppType` effectively untyped.

Replace `buildApp()` in `apps/backend/src/app.ts`:

```ts
import configureOpenAPI from '@/lib/configure-open-api'
import createApp from '@/lib/create-app'
import authRouter from '@/routes/auth.route'
import index from '@/routes/index.route'
import { logsRouter } from '@/routes/v1/logs/logs.routes'

export function buildApp() {
  const app = createApp()

  configureOpenAPI(app)

  // Chain routes — required for AppType RPC type inference.
  // forEach or app.route() in a loop loses route-level types.
  const routes = app
    .route('/', authRouter)
    .route('/', index)
    .route('/', logsRouter)
  // Add new routers here: .route('/', yourNewRouter)

  return routes
}

export type AppType = ReturnType<typeof buildApp>

export default buildApp
```

- [ ] **Step 9: Update `apps/backend/drizzle.config.ts` to use `DB` binding name**

Read `apps/backend/drizzle.config.ts` and update any reference to the old binding name if present. The drizzle config typically reads from env vars or uses local SQLite — verify it points to a usable local DB for migration generation.

```ts
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'sqlite',
  driver: 'd1-http',
  dbCredentials: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID ?? '',
    databaseId: process.env.CLOUDFLARE_D1_DATABASE_ID ?? '',
    token: process.env.CLOUDFLARE_D1_TOKEN ?? '',
  },
})
```

- [ ] **Step 10: Ensure `apps/backend/src/index.ts` exports `AppType`**

The copied file only exports the built app. Update it to also export `AppType` so the frontend can import the type:

```ts
import { buildApp } from './app'

export { type AppType } from './app'

const app = buildApp()

export default app
```

- [ ] **Step 11: Create `apps/backend/.dev.vars`**

This file holds local development secrets. It is git-ignored (wrangler already ignores it):

```bash
cat > apps/backend/.dev.vars << 'EOF'
# Local development secrets — never commit this file
CORS_ORIGINS=http://localhost:3000
CORS_MAX_AGE=86400
EOF
```

- [ ] **Step 12: Create `apps/backend/.env.example`**

```
# Cloudflare D1 (for drizzle-kit remote commands)
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_D1_DATABASE_ID=your-d1-database-id
CLOUDFLARE_D1_TOKEN=your-api-token

# CORS (set in .dev.vars for local, wrangler vars for production)
CORS_ORIGINS=http://localhost:3000,https://your-frontend.pages.dev
```

- [ ] **Step 13: Commit**

```bash
git add apps/backend
git commit -m "feat: add @repo/backend (Hono+D1+better-auth CF Worker)"
```

---

## Task 5: Backend Health Endpoint Tests

The health endpoint already exists in `apps/backend/src/routes/index.route.ts` at `GET /health`. This task adds tests and patches the `apiLoggingMiddleware` to not crash in plain vitest (the middleware calls `c.executionCtx.waitUntil()` which does not exist outside the Cloudflare Workers runtime).

All commands run from `apps/backend/`.

- [ ] **Step 1: Patch `apps/backend/src/middlewares/api-logger.ts` to guard `executionCtx`**

Open `apps/backend/src/middlewares/api-logger.ts`. Find the line that calls `c.executionCtx.waitUntil(...)` and wrap it with a guard:

```ts
// Change FROM (wherever executionCtx.waitUntil is called):
c.executionCtx.waitUntil(saveLog(...))

// Change TO:
c.executionCtx?.waitUntil?.(saveLog(...))
```

This is safe in production (Cloudflare Workers always provides `executionCtx`) and prevents a crash in vitest where `executionCtx` is `undefined`.

- [ ] **Step 2: Create `apps/backend/tests/health.test.ts`**

> `createTestApp` is already exported by `apps/backend/src/lib/create-app.ts` (line ~101 of the template). It creates a full Hono instance with all middleware and mounts the given router at `/`.

```ts
import { describe, it, expect } from 'vitest'
import { createTestApp } from '../src/lib/create-app'
import indexRouter from '../src/routes/index.route'

describe('GET /health', () => {
  const app = createTestApp(indexRouter)

  it('returns 200', async () => {
    const res = await app.request('/health')
    expect(res.status).toBe(200)
  })

  it('returns expected JSON shape', async () => {
    const res = await app.request('/health')
    const body = await res.json() as Record<string, unknown>
    expect(body.status).toBe('healthy')
    expect(typeof body.timestamp).toBe('string')
    expect(typeof body.uptime).toBe('number')
    expect(typeof body.version).toBe('string')
  })

  it('timestamp is a valid ISO date string', async () => {
    const res = await app.request('/health')
    const body = await res.json() as Record<string, unknown>
    const ts = body.timestamp as string
    expect(new Date(ts).toISOString()).toBe(ts)
  })
})
```

- [ ] **Step 3: Run the tests**

```bash
cd apps/backend && bun run test tests/health.test.ts
```

Expected:
```
✓ GET /health > returns 200
✓ GET /health > returns expected JSON shape
✓ GET /health > timestamp is a valid ISO date string
```

If you see `TypeError: Cannot read properties of undefined (reading 'waitUntil')`, the `executionCtx` guard in Step 1 is missing or was not applied to all call sites. Search and fix all of them:

```bash
grep -n "executionCtx.waitUntil" apps/backend/src/middlewares/api-logger.ts
```

Replace every `c.executionCtx.waitUntil(` with `c.executionCtx?.waitUntil?.(`

- [ ] **Step 4: Run all backend tests**

```bash
cd apps/backend && bun run test
```

Expected: all tests pass (3 health tests + any existing template tests).

- [ ] **Step 5: Commit**

```bash
git add apps/backend/tests/health.test.ts apps/backend/src/middlewares/api-logger.ts
git commit -m "test: add health endpoint tests and fix executionCtx for vitest"
```

---

## Task 6: Install All Dependencies + Verify Backend

- [ ] **Step 1: Install all workspace dependencies from repo root**

```bash
bun install
```

Expected: bun resolves all workspace packages and symlinks `@repo/shared` and `@repo/backend` into `node_modules`. No errors. A single `bun.lock` is created at the root.

- [ ] **Step 2: Build the shared package first**

```bash
bun run --filter @repo/shared build
```

Expected: `packages/shared/dist/` is created with `index.js`, `index.d.ts`, `types.js`, `types.d.ts`, `schemas.js`, `schemas.d.ts`.

- [ ] **Step 3: Type-check the backend**

```bash
bun run --filter @repo/backend typecheck
```

Expected: no TypeScript errors.

- [ ] **Step 4: Run backend tests**

```bash
bun run --filter @repo/backend test
```

Expected: all tests pass.

- [ ] **Step 5: Start the backend dev server**

Open a new terminal tab:

```bash
cd apps/backend && bun run dev
```

Expected: wrangler starts on `http://localhost:8787` with output like:
```
⎔ Starting local server...
[wrangler:inf] Ready on http://localhost:8787
```

- [ ] **Step 6: Test the health endpoint manually**

In another terminal:

```bash
curl http://localhost:8787/health
```

Expected: `{"status":"healthy","timestamp":"2026-...","uptime":0,"version":"1.0.0"}`

- [ ] **Step 7: Test the API reference**

Open `http://localhost:8787/reference` in a browser. Expected: Scalar API reference page loads with all routes documented.

---

## Task 7: Frontend API Client + Auth Client

**Files:**
- Create: `apps/frontend/src/lib/api-client.ts`
- Create: `apps/frontend/src/lib/auth-client.ts`
- Create: `apps/frontend/src/routes/health-demo.tsx`
- Modify: `apps/frontend/src/routeTree.gen.ts` (auto-generated — do NOT edit manually, will regenerate on dev server start)

All commands run from `apps/frontend/`.

- [ ] **Step 1: Create `apps/frontend/src/lib/api-client.ts`**

Typed Hono RPC client. `AppType` is imported as a type-only import — zero runtime code from the backend ships to the browser.

```ts
import { hc } from 'hono/client'
import type { AppType } from '@repo/backend'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8787'

/**
 * Creates a typed Hono RPC client.
 * Use inside components or server functions — NOT at module level.
 *
 * Usage (unauthenticated):
 *   const api = createApiClient()
 *   const res = await api.health.$get()
 *   const data = await res.json()  // fully typed
 *
 * Usage (authenticated):
 *   const api = createApiClient(accessToken)
 *   const res = await api['v1']['some-route'].$get()
 */
export function createApiClient(accessToken?: string) {
  return hc<AppType>(BACKEND_URL, {
    headers: accessToken
      ? { Authorization: `Bearer ${accessToken}` }
      : undefined,
  })
}

export type ApiClient = ReturnType<typeof createApiClient>
```

- [ ] **Step 2: Create `apps/frontend/src/lib/auth-client.ts`**

Better-auth browser client. Matches the better-auth instance in `apps/backend/src/auth/index.ts`.

```ts
import { createAuthClient } from 'better-auth/client'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8787'

export const authClient = createAuthClient({
  baseURL: BACKEND_URL,
})

export const {
  signIn,
  signOut,
  signUp,
  useSession,
  getSession,
} = authClient
```

- [ ] **Step 3: Create `apps/frontend/src/routes/health-demo.tsx`**

A demo page showing the backend health status and confirming the typed RPC client works. Add this as a new route — it does NOT replace the existing `index.tsx`.

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { createApiClient } from '@/lib/api-client'

export const Route = createFileRoute('/health-demo')({
  component: HealthDemoPage,
})

type HealthStatus = {
  status: string
  timestamp: string
  uptime: number
  version: string
} | null

function HealthDemoPage() {
  const [health, setHealth] = useState<HealthStatus>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const api = createApiClient()
    api.health.$get()
      .then(res => res.json())
      .then(data => {
        setHealth(data as HealthStatus)
        setLoading(false)
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : 'Failed to connect to backend')
        setLoading(false)
      })
  }, [])

  return (
    <div className="p-8 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-4">Backend Health</h1>
      {loading && <p className="text-muted-foreground">Checking backend...</p>}
      {error && (
        <div className="rounded-md border border-destructive p-4 text-destructive">
          <p className="font-medium">Connection failed</p>
          <p className="text-sm mt-1">{error}</p>
          <p className="text-xs mt-2 text-muted-foreground">
            Is the backend running? Run: <code>bun run dev:be</code>
          </p>
        </div>
      )}
      {health && (
        <div className="rounded-md border p-4 space-y-2">
          <div className="flex items-center gap-2">
            <span className="inline-block size-2 rounded-full bg-green-500" />
            <span className="font-medium capitalize">{health.status}</span>
          </div>
          <p className="text-sm text-muted-foreground">Version: {health.version}</p>
          <p className="text-sm text-muted-foreground">Uptime: {health.uptime}s</p>
          <p className="text-sm text-muted-foreground">
            Last checked: {new Date(health.timestamp).toLocaleTimeString()}
          </p>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Create `apps/frontend/.env.local` (not committed)**

```bash
cat > apps/frontend/.env.local << 'EOF'
VITE_BACKEND_URL=http://localhost:8787
EOF
```

- [ ] **Step 5: Create `apps/frontend/.env.example`**

```
VITE_BACKEND_URL=http://localhost:8787
```

- [ ] **Step 6: Restart the frontend dev server to regenerate routeTree**

```bash
cd apps/frontend && bun run dev
```

Expected: Vite starts, `src/routeTree.gen.ts` regenerates with `/health-demo` added. Open `http://localhost:3000/health-demo` — health status from the backend should display (requires backend running on 8787).

- [ ] **Step 7: Verify type safety**

The key check: `api.health.$get()` must be a recognized typed method — if it shows as `any`, the AppType export from `apps/backend/src/index.ts` isn't resolving. Run:

```bash
cd apps/frontend && bun run typecheck
```

Expected: no errors. If `@repo/backend` types aren't found, run `bun run --filter @repo/backend typecheck` first to ensure the backend compiles.

- [ ] **Step 8: Commit**

```bash
git add apps/frontend/src/lib/api-client.ts apps/frontend/src/lib/auth-client.ts apps/frontend/src/routes/health-demo.tsx apps/frontend/.env.example apps/frontend/package.json
git commit -m "feat: add typed Hono RPC client and better-auth client to frontend"
```

---

## Task 8: Full Build Verification + CLAUDE.md Update

- [ ] **Step 1: Build shared package**

```bash
bun run --filter @repo/shared build
```

Expected: `packages/shared/dist/` present with `.js` and `.d.ts` files.

- [ ] **Step 2: Type-check all workspaces**

```bash
bun run typecheck
```

Expected: no errors across `@repo/shared`, `@repo/backend`, and `@repo/frontend`.

- [ ] **Step 3: Run all backend tests**

```bash
bun run --filter @repo/backend test
```

Expected: all tests pass.

- [ ] **Step 4: Build frontend**

```bash
bun run --filter @repo/frontend build
```

Expected: Vite + TanStack Start builds successfully. Output in `apps/frontend/dist/`.

- [ ] **Step 5: Update root `CLAUDE.md`**

Replace the entire `CLAUDE.md` at the repo root:

```markdown
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Fitality Clubs monorepo — bun workspaces with a TanStack Start frontend and a Hono Cloudflare Workers backend.

## Commands

### Root
\`\`\`bash
bun install                              # Install all workspace deps
bun run dev:fe                           # Start frontend dev server (port 3000)
bun run dev:be                           # Start backend dev server (port 8787)
bun run typecheck                        # Type-check all workspaces (shared → frontend → backend)
bun run test                             # Run backend tests
bun run build                            # Build shared → frontend → backend
\`\`\`

### Frontend (`apps/frontend`)
\`\`\`bash
cd apps/frontend
bun run dev                              # Vite dev server
bun run build                            # Production build
bun run build:deploy                     # Build + deploy to Cloudflare Workers
bun run test                             # vitest
bun run lint                             # Biome check
bun run check                            # Biome check + auto-fix
\`\`\`

### Backend (`apps/backend`)
\`\`\`bash
cd apps/backend
bun run dev                              # wrangler dev (port 8787)
bun run test                             # vitest run
bun run d1:migrate:local                 # Apply D1 migrations locally
bun run d1:migrate:remote                # Apply D1 migrations to Cloudflare
bun run deploy                           # wrangler deploy
\`\`\`

### Shared package (`packages/shared`)
\`\`\`bash
cd packages/shared
bun run build                            # Compile to dist/
\`\`\`

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
- **Deployment**: Cloudflare Workers (`@cloudflare/vite-plugin`)
- **Routing**: File-based via `src/routes/` — routeTree auto-generated to `src/routeTree.gen.ts` (never edit)
- **Styling**: Tailwind CSS v4 (CSS-first config in `src/styles.css`)
- **UI Components**: shadcn (base-nova style) with Base UI primitives — `src/components/ui/`
- **Icons**: `@phosphor-icons/react` exclusively
- **Linter/Formatter**: Biome (not ESLint/Prettier)
- **API Client**: `src/lib/api-client.ts` — typed Hono RPC client via `hc<AppType>`
- **Auth Client**: `src/lib/auth-client.ts` — better-auth browser client

### Backend
- **Framework**: Hono v4 with `@hono/zod-openapi`
- **Auth**: better-auth + better-auth-cloudflare (D1 + KV session store)
- **Database**: Cloudflare D1 (SQLite) via Drizzle ORM
- **Schema**: `src/db/schema.ts` — user, session, account, verification, passkey, subscription, apiLogs
- **Migrations**: `src/db/migrations/` — run via `wrangler d1 migrations apply`
- **Rate Limiting**: `hono-rate-limiter` with Cloudflare KV store
- **Logging**: API logger middleware stores to D1 `_log` table
- **API Docs**: Scalar at `/reference`, OpenAPI JSON at `/doc`
- **Linter**: ESLint with `@antfu/eslint-config`

### Shared
- **Package**: `@repo/shared` — compiled to `dist/` with `.d.ts` declarations
- **Exports**: `ApiResponse<T>`, `ApiError`, `PaginatedResponse<T>`, `paginationSchema`

## Key Conventions

### Frontend
- **Path aliases**: Use `@/` for all imports (maps to `src/`)
- **Icons**: `@phosphor-icons/react` only — no lucide, heroicons, etc.
- **Biome rules**: No semicolons, single quotes, trailing commas
- **Reference design**: `ref.html` contains the target Fitality Clubs HTML design to replicate

### Backend
- **Path aliases**: Use `@/` for all imports (maps to `src/`)
- **Bindings**: Access via `c.env` — never `process.env` in Workers
- **D1 binding**: `DB` (updated from template's long binding name)
- **KV binding**: `KV_BINDING`
- **CORS**: Configured via `CORS_ORIGINS` env var (comma-separated); set in `.dev.vars` locally
- **Auth routes**: all under `/api/auth/*` (better-auth handles routing)

## Adding Routes

### Frontend
Create a file in `apps/frontend/src/routes/`:
\`\`\`tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/path')({ component: MyPage })

function MyPage() {
  return <div>...</div>
}
\`\`\`

### Backend
Create feature files in `apps/backend/src/routes/v1/<feature>/`:
- `<feature>.routes.ts` — route definitions + router assembly
- `<feature>.controller.ts` — handlers
- Register in `apps/backend/src/app.ts`
```

- [ ] **Step 6: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md for monorepo structure"
```

---

## Appendix: Common Troubleshooting

### `@repo/backend` types not found in frontend

Run `bun run --filter @repo/backend typecheck` first. The frontend TypeScript compiler resolves `@repo/backend` from `node_modules/@repo/backend` which symlinks to `apps/backend/`. Since the backend is a Workers project (no `dist/`), TypeScript resolves directly from `apps/backend/src/index.ts` via the `"main"` field. If types still don't resolve, add `"moduleResolution": "bundler"` to the backend's tsconfig.

### `wrangler dev` fails with missing D1 binding

The `DB` binding error during `wrangler dev` means the local D1 database file hasn't been created yet. Run:

```bash
cd apps/backend && bun run d1:migrate:local
```

This applies migrations to the local SQLite file that wrangler manages at `.wrangler/state/v3/d1/`.

### CORS errors from frontend → backend

Ensure `apps/backend/.dev.vars` contains:
```
CORS_ORIGINS=http://localhost:3000
```

The `create-app.ts` reads `c.env.CORS_ORIGINS` at request time, so no restart needed after changing `.dev.vars` (wrangler reloads it).

### `bun install` fails to resolve workspace packages

Ensure `package.json` at the repo root has `"workspaces": ["apps/*", "packages/*"]` before running `bun install`. Bun workspaces require this field — without it, `workspace:*` references fail to resolve.
