# Repository Guidelines

## Project Structure & Module Organization
`src/index.ts` bootstraps the Bun entrypoint and exports the worker handler. Core routing lives in `src/routes`, shared middleware in `src/middlewares`, and reusable helpers under `src/lib`. Persistent models and Drizzle schema utilities sit in `src/db`, while generated or shared types belong in `src/types`. Build artifacts are emitted to `dist`, static assets stay in `public`, and Cloudflare settings live in `wrangler.json`. Keep long-form references in `docs/` and avoid editing the generated SQLite files in `data/`.

## Build, Test, and Development Commands
Use `bun run dev` for hot-reloading the Bun server and `bun run worker:dev` to emulate the Cloudflare worker via Wrangler. `bun run build` outputs a Bun-optimized bundle to `dist`, whereas `bun run build:node` plus `bun run start:node` target a Node runtime. Run `bun run typecheck` before pushing to surface TypeScript regressions. Lint with `bun run lint` and auto-fix eligible issues via `bun run lint:fix`. Deploy the worker with `bun run worker:deploy` once previews are approved.

## Coding Style & Naming Conventions
The ESLint preset enforces two-space indentation, double quotes, and required semicolons. Filenames must be kebab-case (`unicorn/filename-case`) except for documented overrides like `README.md`. Prefer named exports for routes and middleware, and co-locate feature-specific helpers in subdirectories (`src/routes/users/handler.ts`). Environment access must flow through wrappers—never reference `process.env` directly because the `node/no-process-env` rule blocks it. Run `bun run lint` before committing to ensure formatting is consistent with the Antfu config.

## Testing Guidelines
Vitest powers the test suite. Place new specs alongside the code they cover using the `.test.ts` suffix (e.g., `src/routes/users/users.test.ts`). Exercise request/response flows with Hono’s testing helpers and mock D1 interactions. Execute `bun run test` for watch mode during development and `bun run test:node` in CI to ensure deterministic runs. Add scenario-focused assertions for every new route and middleware branch to guard against regression.

## Commit & Pull Request Guidelines
Follow Conventional Commits with an explicit scope—`feat(routes): add auth token refresh` mirrors existing history and keeps the changelog clean. Squash unrelated work, keep messages present tense, and reference issues in the footer when applicable. Before opening a PR, run lint, tests, and type checks, then include context covering motivation, key changes, and any Wrangler preview URLs or database migration steps. Request review only after confirming the worker builds locally (`bun run worker:dev`) without warnings.

## Deployment & Environment Notes
Manage Cloudflare bindings in `wrangler.json`, and document secrets in the PR description so reviewers can replicate `wrangler dev`. For D1 updates, generate migrations with `bun run db:generate`, apply locally via `bun run d1:migrate:local`, and gate remote applies behind reviewer approval. Keep sample `.env` templates in sync with the README whenever environment keys change.
