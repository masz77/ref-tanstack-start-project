---
type: UI Component
title: Badge
description: A small inline status/label pill with CVA variants, renderable as any element via Base UI useRender.
tags: [ui, badge, base-ui, cva]
timestamp: 2026-07-23
---

# Badge

Compact label/status pill. Uses `class-variance-authority` for variants and Base UI `useRender` + `mergeProps`, so it renders a `span` by default but can polymorphically become any element (e.g. a link) via the `render` prop.

Source: [badge.tsx](./badge.tsx).

## Usage

    import { Badge } from '@/components/ui/badge'

    <Badge variant="secondary">New</Badge>
    <Badge render={<a href="/tag" />}>Link badge</Badge>

## Exports
- `Badge` — the component; props are `useRender.ComponentProps<'span'>` + `variant`.
- `badgeVariants` — CVA function for reusing badge styles elsewhere.

Variants (`variant`, default `default`): `default`, `secondary`, `destructive`, `outline`, `ghost`, `link`.
