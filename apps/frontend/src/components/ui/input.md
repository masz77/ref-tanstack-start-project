---
type: UI Component
title: Input
description: Styled text input built on the Base UI Input primitive.
tags: [ui, input, base-ui, form]
timestamp: 2026-07-23
---

# Input

Thin wrapper over Base UI's `Input` (`@base-ui/react/input`). Forwards all native `<input>` props and merges Tailwind classes. Supports `aria-invalid` error styling, disabled state, and `file:` input styling.

Source: [input.tsx](./input.tsx).

## Usage

    import { Input } from '@/components/ui/input'

    <Input type="email" placeholder="you@example.com" />

## Props
- `Input` — accepts all `React.ComponentProps<'input'>`; adds `data-slot="input"`.
