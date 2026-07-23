---
type: UI Component
title: Card
description: A composable content container with header, title, description, action, content, and footer parts.
tags: [ui, card, layout]
timestamp: 2026-07-23
---

# Card

Plain-`div` container primitives (no Base UI) for grouping content. The root exposes a `size` prop that drives spacing on all child parts via `group/card` data-attribute selectors. Layout adapts automatically to the presence of `CardAction`, `CardDescription`, `CardFooter`, and leading images.

Source: [card.tsx](./card.tsx).

## Usage

    import {
      Card, CardHeader, CardTitle, CardDescription,
      CardAction, CardContent, CardFooter,
    } from '@/components/ui/card'

    <Card size="sm">
      <CardHeader>
        <CardTitle>Title</CardTitle>
        <CardDescription>Subtitle</CardDescription>
        <CardAction><Button size="icon-sm" /></CardAction>
      </CardHeader>
      <CardContent>Body</CardContent>
      <CardFooter>Footer</CardFooter>
    </Card>

## Exports
- `Card` — root; `size?: 'default' | 'sm'` sets `data-size` for child spacing.
- `CardHeader` — grid header; grows columns/rows when action/description present.
- `CardTitle`, `CardDescription` — heading and muted subtitle.
- `CardAction` — top-right slot (needs `CardHeader` grid to position).
- `CardContent` — padded body.
- `CardFooter` — bordered, muted footer bar.
