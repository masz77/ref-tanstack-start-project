---
type: UI Component
title: DropdownMenu
description: Compound dropdown menu with items, checkboxes, radios, submenus, and shortcuts.
tags: [ui, menu, overlay]
timestamp: 2026-07-23
---

# DropdownMenu

Compound menu built on Base UI `@base-ui/react/menu`, with Phosphor `CaretRightIcon`/`CheckIcon` indicators. `DropdownMenuContent` portals and positions the popup itself (default `side=bottom`, `align=start`, `sideOffset=4`).

Source: [dropdown-menu.tsx](./dropdown-menu.tsx).

## Usage

    import {
      DropdownMenu,
      DropdownMenuTrigger,
      DropdownMenuContent,
      DropdownMenuItem,
    } from '@/components/ui/dropdown-menu'

    <DropdownMenu>
      <DropdownMenuTrigger>Open</DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>Profile</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

## Exports
- `DropdownMenu`, `DropdownMenuPortal`, `DropdownMenuTrigger` — root, portal, trigger
- `DropdownMenuContent` — portalled + positioned popup (`align`/`alignOffset`/`side`/`sideOffset` props)
- `DropdownMenuGroup`, `DropdownMenuLabel` — grouping; `Label` takes `inset`
- `DropdownMenuItem` — item; `inset` and `variant: 'default' | 'destructive'`
- `DropdownMenuCheckboxItem`, `DropdownMenuRadioGroup`, `DropdownMenuRadioItem` — selectable items
- `DropdownMenuSub`, `DropdownMenuSubTrigger`, `DropdownMenuSubContent` — nested submenu
- `DropdownMenuSeparator`, `DropdownMenuShortcut` — divider and trailing shortcut text

## Constraints / Gotchas
- `DropdownMenuContent` already renders its own `Portal` + `Positioner`; do not wrap it in another portal.
