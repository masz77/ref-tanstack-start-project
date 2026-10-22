---
type: UI Component
title: ScrollArea
description: macOS/SwiftUI-style overlay scroller for a bounded scroll region.
tags: [ui, scroll, base-ui, macos-overlay]
timestamp: 2026-07-23
---

# ScrollArea

Thin, translucent, auto-hiding overlay scrollbar for a BOUNDED region — give it a
fixed height/width so its content can overflow. For the document/root scroll, the
global CSS in [styles.css](../../styles.css) owns the scrollbar; no component can
style `<html>`. Built on Base UI `scroll-area` — the auto-hide fade is native and
identical on every OS.

Source: [scroll-area.tsx](./scroll-area.tsx).

## Usage

    import { ScrollArea } from '@/components/ui/scroll-area'

    <ScrollArea className="h-72">
      <LongList />
    </ScrollArea>

## Exports

- `ScrollArea` — wraps content; set a height/width so it can overflow.
- `ScrollBar` — the scrollbar part (auto-rendered by ScrollArea; export for custom
  layouts needing a standalone horizontal/vertical bar).

## Constraints / Gotchas

- Needs a bounded height/width or nothing overflows and no bar appears.
- `overscroll-contain` on the viewport stops scroll-chaining to the page at the
  region's edges while keeping the local rubber-band — do not switch to
  `overscroll-none`, which kills the elastic boundary feel.
