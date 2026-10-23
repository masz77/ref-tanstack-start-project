# Project Reference

Commands, stack, bindings, and how-to. Decisions and their rationale live in the decision docs in
this folder; this file does not repeat them.

## Commands

All commands run from the repo root. Each one is a script in `package.json` (`scripts`, lines 7-21).

| Command | Runs | Notes |
|---------|------|-------|
| `bun install` | Install dependencies | Single package; `workspaces` is `[]` (`package.json:5`). |
| `bun run dev` | `vp dev` | Dev server for the app and the `/api` routes. |
| `bun run build` | `vp build` | Production build. |
| `bun run preview` | `vp preview` | Serve the production build locally. |
| `bun run deploy` | `vp build && wrangler deploy` | Deploys to Cloudflare. Do not run without approval. |
| `bun run test` | `vp test run` | One-shot test run. |
| `bun run test:watch` | `vp test` | Watch mode. |
| `bun run typecheck` | `tsc --noEmit` | Type check. |
| `bun run lint` | `vp lint` | Lint, including the module import rules. |
| `bun run check` | `vp check` | Format, lint, and type-aware checks. |
| `bun run format` | `vp fmt` | Format the repo. |
| `bun run db:generate` | `drizzle-kit generate` | Generate a migration from `src/server/infrastructure/db/schema.ts`. |
| `bun run d1:migrate:local` | `wrangler d1 migrations apply DB --local` | Apply migrations to the local D1. |
| `bun run d1:migrate:remote` | `wrangler d1 migrations apply DB --remote` | Changes the remote database. Do not run without approval. |
| `bun run doctor` | `npx react-doctor@latest` | React diagnostics. |

## Stack

- **App:** TanStack Start with React 19, TanStack Router (file-based), TanStack Query, TanStack Form.
- **Server:** one Cloudflare Worker, entry `src/server.ts` (`wrangler.jsonc:11`). Hono app at `/api`
  (`src/server/app.ts`), with `@hono/zod-openapi` and Scalar.
- **Auth:** better-auth in `src/server/auth/index.ts`.
- **Data:** Cloudflare D1 (SQLite) via Drizzle (`src/server/infrastructure/db/`).
- **UI:** shadcn `base-nova` style on Base UI (`@base-ui/react`), Tailwind CSS v4 (`src/styles.css`,
  oklch), `@phosphor-icons/react` for icons (`components.json:3`, `:13`).
- **Toolchain:** Vite+ (`vite-plus`) with Vite 8, Vitest, Oxlint, and Oxfmt. Lint and format config
  live in `vite.config.ts`.

## Bindings and env

| Name | Where | Used by |
|------|-------|---------|
| `DB` (D1) | `wrangler.jsonc:19-20` | `createDb` in `src/server/infrastructure/db/index.ts`. |
| `BETTER_AUTH_SECRET` | `.dev.vars` (local) | `src/server/auth/index.ts`. |
| `BETTER_AUTH_URL` | `.dev.vars` (local) | `src/server/auth/index.ts:66`. |
| `RATE_LIMITER` | Commented out in `wrangler.jsonc:29-31` | Rate limiting is off by default (`wrangler.jsonc:27`). |

- Local secrets go in `.dev.vars`. The names are in `.dev.vars.example`. Never commit `.dev.vars`.
- Read bindings with `import { env } from 'cloudflare:workers'` in server functions
  (`src/modules/health/health.functions.ts:2`).
- Inside Hono handlers, read bindings from `c.env` (`src/modules/health/health.routes.ts:82`).

## Code conventions

- **Imports:** use `@/` for `src/` in all code.
- **Formatting (Oxfmt, `vite.config.ts` `fmt`):** no semicolons, single quotes, trailing commas,
  print width 100. JSON files have no trailing commas.
- **Tests:** colocated `*.test.ts` files. Import from `vite-plus/test`.
- **Generated code:** `src/routeTree.gen.ts` is generated from `src/routes/`. Never edit it by hand.

## How to add a route

1. Create a file in `src/routes/`. Copy the shape of `src/routes/health-demo.tsx`.
2. Run `bun run dev`. It regenerates `src/routeTree.gen.ts` from the route files.

API routes go in a module, not in `src/routes/`. See [Modular Monolith § How to add a module](./modular-monolith.md#how-to-add-a-module).

## How to add a UI component

1. Run `bunx shadcn@latest add <component-name>`. The config is `components.json`.
2. The component lands in `src/components/ui/`. Check existing components there for patterns.
3. Icons come from `@phosphor-icons/react` only.
4. Each component's notes live next to it as `<name>.md` (e.g. `src/components/ui/button.md`).
