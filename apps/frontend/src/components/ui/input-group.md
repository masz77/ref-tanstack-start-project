---
type: UI Component
title: InputGroup
description: Wrapper that pairs an input or textarea with inline/block addons, buttons, and text.
tags: [ui, form, input]
timestamp: 2026-07-23
---

# InputGroup

Groups a control with leading/trailing addons that share one bordered, focus-ring container. Built with plain elements + `class-variance-authority`; wraps the project `Input`, `Textarea`, and `Button`.

Source: [input-group.tsx](./input-group.tsx).

## Usage

    import {
      InputGroup,
      InputGroupInput,
      InputGroupAddon,
    } from '@/components/ui/input-group'
    import { MagnifyingGlass } from '@phosphor-icons/react'

    <InputGroup>
      <InputGroupAddon><MagnifyingGlass /></InputGroupAddon>
      <InputGroupInput placeholder="Search" />
    </InputGroup>

## Exports
- `InputGroup` — `role=group` container that owns the border and focus ring
- `InputGroupAddon` — addon slot; `align: 'inline-start' | 'inline-end' | 'block-start' | 'block-end'`
- `InputGroupButton` — `Button` sized for the group; `size: 'xs' | 'sm' | 'icon-xs' | 'icon-sm'`
- `InputGroupText` — muted inline text/icon label
- `InputGroupInput`, `InputGroupTextarea` — borderless controls (`data-slot=input-group-control`)

## Constraints / Gotchas
- `InputGroupAddon` clicks/Enter/Space delegate focus to the sibling `input` (clicks on nested buttons are ignored).
- Controls must be `InputGroupInput`/`InputGroupTextarea` (or carry `data-slot=input-group-control`) for the focus ring to react.
