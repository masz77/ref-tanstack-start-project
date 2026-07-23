---
type: UI Component
title: Drawer
description: Draggable edge panel compound built on the Vaul drawer primitive.
tags: [ui, drawer, vaul, sheet]
timestamp: 2026-07-23
---

# Drawer

Slide-in panel built on `vaul` (`DrawerPrimitive`) — the canonical shadcn base-nova drawer, chosen over a custom Base UI build for drag-to-dismiss. Direction is set on the root (`direction="bottom|top|left|right"`); content styling adapts via `data-vaul-drawer-direction`. Bottom drawers show a drag handle. Controlled or uncontrolled open state via root props.

Source: [drawer.tsx](./drawer.tsx).

## Usage

    import { Drawer, DrawerTrigger, DrawerContent, DrawerTitle } from '@/components/ui/drawer'

    <Drawer direction="right">
      <DrawerTrigger>Open</DrawerTrigger>
      <DrawerContent>
        <DrawerTitle>Title</DrawerTitle>
      </DrawerContent>
    </Drawer>

## Exports
- `Drawer` — root, owns open state and `direction`.
- `DrawerTrigger` — opens the drawer.
- `DrawerContent` — portalled panel (renders `DrawerPortal` + `DrawerOverlay` internally); shows a drag handle on bottom drawers.
- `DrawerOverlay` — backdrop with blur.
- `DrawerPortal` — portal wrapper.
- `DrawerClose` — closes the drawer.
- `DrawerHeader` / `DrawerFooter` — layout wrappers (plain `div`s).
- `DrawerTitle` / `DrawerDescription` — accessible title and description.

## Constraints / Gotchas
- Do not swap for a custom drawer: a custom perf build was measured and rejected in favor of this Vaul component (see the source header comment).
