---
type: UI Component
title: Select
description: Compound select menu built on the Base UI Select primitive.
tags: [ui, select, base-ui, form]
timestamp: 2026-07-23
---

# Select

Compound dropdown select over `@base-ui/react/select`, with Phosphor caret/check icons. `Select` is the primitive `Root`; the other parts wrap positioner, popup, items, and scroll arrows with styling. `SelectContent` handles portalling, positioning (side/align/offset props), and animated open/close. Value can be controlled or uncontrolled via the root.

Source: [select.tsx](./select.tsx).

## Usage

    import {
      Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
    } from '@/components/ui/select'

    <Select>
      <SelectTrigger><SelectValue placeholder="Pick one" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="a">A</SelectItem>
      </SelectContent>
    </Select>

## Exports
- `Select` — root (Base UI `Select.Root`).
- `SelectTrigger` — trigger button; `size?: 'sm' | 'default'`, renders a caret icon.
- `SelectValue` — displays the selected value / placeholder.
- `SelectContent` — portalled positioner + popup; props `side`, `sideOffset`, `align`, `alignOffset`, `alignItemWithTrigger`.
- `SelectItem` — selectable option with check indicator.
- `SelectGroup`, `SelectLabel` — group items under a label.
- `SelectSeparator` — divider line.
- `SelectScrollUpButton`, `SelectScrollDownButton` — scroll arrows (auto-rendered inside `SelectContent`).
