---
type: UI Component
title: Label
description: Styled native form label with disabled-state styling hooks.
tags: [ui, label, form]
timestamp: 2026-07-23
---

# Label

Plain native `<label>` with Tailwind styling. Dims and disables pointer events when a parent `group` or sibling `peer` is disabled (`group-data-[disabled=true]`, `peer-disabled`).

Source: [label.tsx](./label.tsx).

## Usage

    import { Label } from '@/components/ui/label'

    <Label htmlFor="email">Email</Label>

## Props
- `Label` — accepts all `React.ComponentProps<'label'>`; pass `htmlFor` to associate a control.
