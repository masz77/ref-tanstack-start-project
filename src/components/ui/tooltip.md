---
type: UI Component
title: Tooltip
description: A hover/focus tooltip built on Base UI's tooltip primitive with portal, positioning, and arrow.
tags: [ui, tooltip, base-ui, overlay]
timestamp: 2026-07-23
---

# Tooltip

A composable tooltip built on Base UI (`@base-ui/react/tooltip`). `Tooltip` wraps its own `TooltipProvider` (default `delay=0`), `TooltipTrigger` anchors it, and `TooltipContent` renders the portalled, positioned popup with an arrow. Content supports `side`/`align`/`sideOffset`/`alignOffset` positioning props.

Source: [tooltip.tsx](./tooltip.tsx).

## Usage

    import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'

    <Tooltip>
      <TooltipTrigger asChild>
        <Button>Hover</Button>
      </TooltipTrigger>
      <TooltipContent>Helpful text</TooltipContent>
    </Tooltip>

## Exports
- `Tooltip` — root; self-wraps a provider, accepts `delay`.
- `TooltipTrigger` — anchor element; `asChild` renders onto its child via Base UI `render`.
- `TooltipContent` — portalled popup (positioner + arrow); accepts `side`/`align`/`sideOffset`/`alignOffset`.
- `TooltipProvider` — shared provider for grouping tooltips (default `delay=0`).

## Constraints / Gotchas
- `Tooltip` already includes a `TooltipProvider`; wrap a tree in `TooltipProvider` only to share delay across many tooltips.
- `TooltipTrigger asChild` only forwards when `children` is a valid single React element.
