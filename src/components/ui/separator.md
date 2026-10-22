---
type: UI Component
title: Separator
description: A thin visual divider that renders horizontally or vertically.
tags: [ui, separator, base-ui, divider]
timestamp: 2026-07-23
---

# Separator

A thin dividing line built on Base UI's `@base-ui/react/separator`. Uses `data-horizontal` / `data-vertical` classes to switch between a full-width 1px rule and a self-stretching 1px column.

Source: [separator.tsx](./separator.tsx).

## Usage

    import { Separator } from '@/components/ui/separator'

    <Separator />
    <Separator orientation="vertical" />

## Exports
- `Separator` — divider element; accepts Base UI `Separator.Props`, `orientation` defaults to `'horizontal'`.
