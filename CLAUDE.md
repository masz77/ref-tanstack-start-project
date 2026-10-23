# CLAUDE.md

White-label template: one TanStack Start app on one Cloudflare Worker, with a Hono API at `/api`.

Commands, stack, bindings, and how-to: [`docs/ARCHITECTURE/project-reference.md`](docs/ARCHITECTURE/project-reference.md). Decision docs: [`docs/ARCHITECTURE/`](docs/ARCHITECTURE/) — read the matching doc before touching an area.

## Module Boundaries (CRITICAL)

- Modules are flat: `src/modules/<name>/`, no subfolders.
- Import a module only through its public entries: `@/modules/<name>`, `@/modules/<name>/index.<x>`, or `@/modules/<name>/index.server`. Never import its internal files.
- Inside a module, import with `./`. Import into `src/modules` only with the `@/modules` alias, never a relative path.
- Modules never import the app shell: `@/router`, `@/routes/**`, `@/start`, `@/server`, `@/server/app`.
- Kernel code (`src/server/**`, `src/lib/**`, `src/components/**`) never imports `@/modules/**`. Only `src/server/app.ts` mounts module routers.
- Lint enforces these rules. Never add `oxlint-disable` for them. Details: [`modular-monolith.md`](docs/ARCHITECTURE/modular-monolith.md).

## Rules

- Verify before finishing: `bun run typecheck`, `bun run test`, `bun run lint`.
- Never edit `src/routeTree.gen.ts` (generated from `src/routes/`).
- Use `@/` for `src/` imports. Tests import from `vite-plus/test`.
- Format with Oxfmt: no semicolons, single quotes, trailing commas.
- Icons: `@phosphor-icons/react` only. UI: shadcn on Base UI, not Radix.
- Bindings: `env` from `cloudflare:workers` in server functions; `c.env` in Hono handlers. Never `process.env`.
- Secrets go in `.dev.vars` (names in `.dev.vars.example`). Never commit `.dev.vars`.
- Do not run `deploy` or `d1:migrate:remote` without user approval.
