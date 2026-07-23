---
type: UI Component
title: Button
description: The core button built on Base UI's Button primitive with CVA variant and size options.
tags: [ui, button, base-ui, cva]
timestamp: 2026-07-23
---

# Button

Primary action button built on Base UI `@base-ui/react/button` with `class-variance-authority` for styling. Being a Base UI primitive, it supports the `render` prop for polymorphic rendering (e.g. as a link or router `Link`).

Source: [button.tsx](./button.tsx).

## Usage

    import { Button } from '@/components/ui/button'

    <Button variant="outline" size="sm">Save</Button>
    <Button variant="ghost" size="icon"><Gear /></Button>

## Exports
- `Button` — the component; props are `ButtonPrimitive.Props` + `variant`/`size`.
- `buttonVariants` — CVA function for applying button styles to other elements.

Variants (`variant`, default `default`): `default`, `outline`, `secondary`, `ghost`, `destructive`, `link`.
Sizes (`size`, default `default`): `default`, `xs`, `sm`, `lg`, `icon`, `icon-xs`, `icon-sm`, `icon-lg`.
