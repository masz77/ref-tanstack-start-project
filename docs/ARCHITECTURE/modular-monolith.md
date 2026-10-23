# Modular Monolith

## Overview

The app is one TanStack Start package deployed as one Worker. Feature code lives in a flat folder
per module, `src/modules/<name>/`, and each module is entered only through its public index files.
The import rules are enforced by lint (`no-restricted-imports` in `vite.config.ts`), not by the
compiler, so they are a team convention backed by a lint gate. A `// oxlint-disable` comment
bypasses them.

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Unit of feature code | One flat folder per module: `src/modules/<name>/`, no subfolders | A file in a subfolder cannot reach its module root without `../` or a self-barrel cycle, and both are linted. Upgrade trigger: when a module needs subfolders, relax `MODULE_PARENT` for that module. |
| Client-safe public API | `src/modules/<name>/index.ts` | Client code imports the session-facing barrel. Server-only code is not pulled into the browser bundle. |
| Extra client entries | `src/modules/<name>/index.<name>.ts` (identity: `index.auth.ts`) | Splits a heavy client dependency into its own entry. Measured 2026-10-22 on the root chunk: 376179 B at HEAD, 414634 B with one identity barrel that re-exported `auth-client.ts`, 376268 B after the split. `better-auth` now loads only in the lazy login and signup chunks. |
| Server-side public API | `src/modules/<name>/index.server.ts` | Server-only exports (the Hono router). Server code inside modules may import it, including other modules, for server-to-server calls. Kernel files still may not, except `src/server/app.ts` (`KERNEL_NO_MODULES`). In the client bundle, TanStack import protection flags it: a build error in production and a mock in dev (`node_modules/@tanstack/start-plugin-core/dist/esm/vite/import-protection-plugin/plugin.js:771`). Its default rule covers `**/*.server.*` (`defaults.js:17`). |
| Imports inside a module | `./` only | Stops a module from reaching into a sibling folder with `../`. |
| Imports into another module | `@/modules/<name>/index.*` or `@/modules/<name>` only | A module may import another module's public entry. Deep imports into its internals bypass the public API, so they are linted. |
| Module paths | Always the `@/modules` alias, never a relative path into `src/modules` | A relative path into the folder skips the group rules, so it is an error in every file. |
| Kernel imports | `src/server/**`, `src/lib/**`, `src/components/**` never import `@/modules/**` | Shared code stays free of feature code. `src/server/app.ts` is the one exception: it is the composition root that mounts module routers (`src/server/app.ts:1-2`, `:13`). |
| App shell | Modules never import the app shell: `@/router`, `@/routes/**`, `@/start`, `@/server`, `@/server/app` | Values come in from the caller. Kernel imports such as `@/server/infrastructure/db` stay allowed. `src/modules/identity/use-session-channel.ts:12` reads the client with `useQueryClient()` from context, so no shell import is needed. |
| Auth and DB schema | Stay in the kernel: `src/server/auth/index.ts`, `src/server/infrastructure/db/schema.ts` | better-auth needs the whole schema, and no module owns tables yet. |
| Enforcement | Lint rules in `vite.config.ts:12-32` (constants), `:103` (base rule), `:112-116` (module overrides), `:122-125` (kernel override) | Costs nothing at runtime and runs in the existing `bun run lint` gate. Hard boundaries would need workspace packages (see [Out of Scope](#out-of-scope)). |

## Key Files

| File | Purpose |
|------|---------|
| `src/modules/health/index.ts` | Client-safe public API: health query options. |
| `src/modules/health/index.server.ts` | Server-side public API: `healthRouter`. |
| `src/modules/identity/index.ts` | Client-safe session API: `SessionProvider`, `AuthSync`, `useSession`, `useFinalizeSession`, `SessionContextValue`. |
| `src/modules/identity/index.auth.ts` | Client auth API: `passkey`, `signIn`, `signUp`, `useSignOut`. Kept apart from `index.ts` so the root chunk does not load better-auth. |
| `src/modules/identity/index.server.ts` | Server-side public API: `authRouter`. |
| `src/server/app.ts` | Composition root. Chains the module routers under `/api` (`basePath` at `:9`, `.route()` at `:13`). |
| `src/routes/__root.tsx:8` | Imports the session API from the identity barrel. Composition, so allowed. |
| `src/routes/login.tsx:11`, `src/routes/signup.tsx:11` | Import the auth API from `@/modules/identity/index.auth`. |
| `src/routes/api/$.ts` | TanStack catch-all that forwards `/api/*` to the Hono app. |
| `vite.config.ts` | Lint rules that enforce this doc (`:12-32`, `:103`, `:112-125`). |

## Data Flow

Public HTTP API path:

1. Request to `/api/*` matches `src/routes/api/$.ts`.
2. The route calls `handleApiRequest` (`src/routes/api/-handler.ts`), which lazily imports `forwardToApi`.
3. `forwardToApi` (`src/server/app.ts`) runs the Hono app, which is mounted at `/api`.
4. The Hono app dispatches to the module routers (`healthRouter`, `authRouter`).

UI path: a route file (`src/routes/*.tsx`) imports from the module's client entries
(`@/modules/<name>` or `@/modules/<name>/index.auth`). Server-only code in a module is reached only
through its `index.server.ts` or through a server function.

## Security Considerations

- The module rules are a code-organization boundary, not a security boundary. They do not stop a
  developer from adding server code to a client file.
- The security-relevant part is the `*.server.*` naming. Import protection flags those files in the
  client bundle (see `plugin.js:771` above), and `index.server.ts` is the only server export a module
  publishes. Auth boundaries are in [Auth](./auth.md).

## How to add a module

1. Create `src/modules/<name>/`. Keep it flat: no subfolders.
2. Add `index.ts` with the client-safe exports (no server imports).
3. Add `index.server.ts` that re-exports the Hono router, e.g. `export { default as xRouter } from './x.routes'`.
4. Write `x.routes.ts` with `createRouter` from `@/server/lib/create-app`, as `src/modules/identity/auth.routes.ts:1` does.
5. Mount it in `src/server/app.ts`: import from `@/modules/<name>/index.server` and chain `.route('/', xRouter)`.
6. If a heavy client dependency would enter the root chunk, put it behind an `index.<name>.ts` entry instead of `index.ts`.
7. Import the module's client entry from routes with `@/modules/<name>`.

Inside the module, use `./` imports only.

## STOP Rules

These need explicit user approval before they change:

- Importing a module's internal file from outside that module.
- Letting a kernel file (`src/server/**`, `src/lib/**`, `src/components/**`) import `@/modules/**`, other than `src/server/app.ts`.
- Letting a module import the app shell (`@/router`, `@/routes/**`, `@/start`, `@/server`, `@/server/app`).
- Adding subfolders to a module without first relaxing `MODULE_PARENT` through a decision in this doc.
- Adding `oxlint-disable` for any rule in `vite.config.ts`.
- Moving `src/server/auth/index.ts` or `src/server/infrastructure/db/schema.ts` into a module.

## Out of Scope

- Splitting the DB schema per module. No module owns tables yet.
- `import/no-cycle`. No cross-module calls exist yet.
- Workspace packages per module. That would be the only way to make boundaries hard.
- An event bus for module-to-module calls. Add it when a real cross-module call needs it.
- Old `src/features/` and `src/server/features/` paths. They are superseded by this layout; see the
  [unified-app layout note](./unified-app.md#proposed-code-layout).
