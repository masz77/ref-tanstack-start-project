# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Gym landing page for "Fitality Clubs" — a fitness/wellness brand. Built with TanStack Start (full-stack React framework with SSR), deployed to Cloudflare Workers. Uses file-based routing.

## Commands

```bash
bun run dev          # Start dev server (Vite)
bun run build        # Production build
bun run preview      # Preview production build
bun run test         # Run all tests (vitest)
bunx vitest run src/path/to/test.ts  # Run a single test file
bun run lint         # Lint with Biome
bun run format       # Format with Biome (auto-fix)
bun run check        # Biome check + auto-fix
bun run build:deploy # Build + deploy to Cloudflare Workers
```

## Tech Stack

- **Framework**: TanStack Start (React 19 + TanStack Router + Vite)
- **Deployment**: Cloudflare Workers (`@cloudflare/vite-plugin`, config in `wrangler.jsonc`)
- **Routing**: File-based via `src/routes/` — route tree auto-generated to `src/routeTree.gen.ts` (never edit this file)
- **Styling**: Tailwind CSS v4 (CSS-first config in `src/styles.css`, no `tailwind.config.js`)
- **UI Components**: shadcn (base-nova style) with Base UI primitives (`@base-ui/react`) — components in `src/components/ui/`
- **Icons**: `@phosphor-icons/react` exclusively
- **Linter/Formatter**: Biome (not ESLint/Prettier) — config in `biome.json`
- **Font**: Roboto Variable (`@fontsource-variable/roboto`)
- **Package manager**: bun (lockfile: `bun.lock`)
- **Testing**: Vitest + Testing Library

## Architecture

```
src/
  routes/           # TanStack file-based routes (auto-generates routeTree.gen.ts)
    __root.tsx       # Root layout (HTML shell, head meta, global CSS, devtools)
    index.tsx        # Home page (/)
  components/
    ui/              # shadcn components (Base UI-based, not Radix)
    *.tsx            # Page-level components
  lib/
    utils.ts         # cn() helper (clsx + tailwind-merge)
  router.tsx         # Router factory with scroll restoration
  styles.css         # Tailwind v4 config + CSS variables (oklch color space)
```

## Key Conventions

- **Path aliases**: Use `@/` for all imports (maps to `src/`)
- **shadcn config**: `components.json` — uses `base-nova` style, Phosphor icons, no RSC
- **CSS variables**: oklch color space with light/dark theme tokens in `src/styles.css`
- **Biome rules**: No semicolons, single quotes, trailing commas. `noConsole: warn`, `noExplicitAny: off`
- **Reference design**: `ref.html` contains the target HTML design for Fitality Clubs to replicate in React

## Adding Routes

Create a new file in `src/routes/` following TanStack Router conventions:

```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/path')({ component: MyPage })

function MyPage() {
  return <div>...</div>
}
```

The route tree regenerates automatically on dev server restart.

## Adding UI Components

```bash
bunx shadcn@latest add <component-name>
```

Components use Base UI (`@base-ui/react`) under the hood, not Radix. Check existing components in `src/components/ui/` for patterns.
