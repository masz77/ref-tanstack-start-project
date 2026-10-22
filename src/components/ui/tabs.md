---
type: UI Component
title: Tabs
description: A tabbed interface built on Base UI tabs with default and line variants.
tags: [ui, tabs, base-ui]
timestamp: 2026-07-23
---

# Tabs

A tabbed navigation set built on Base UI's `@base-ui/react/tabs`. Supports horizontal (default) and vertical orientation, and the list offers `default` (filled) and `line` (underline) variants via `class-variance-authority`.

Source: [tabs.tsx](./tabs.tsx).

## Usage

    import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

    <Tabs defaultValue="a">
      <TabsList>
        <TabsTrigger value="a">A</TabsTrigger>
        <TabsTrigger value="b">B</TabsTrigger>
      </TabsList>
      <TabsContent value="a">...</TabsContent>
      <TabsContent value="b">...</TabsContent>
    </Tabs>

## Exports
- `Tabs` — root (Base UI `Tabs.Root`); `orientation` defaults to `'horizontal'`.
- `TabsList` — tab strip; `variant` prop `'default' | 'line'` (default `'default'`).
- `TabsTrigger` — individual tab (Base UI `Tabs.Tab`); use `value`.
- `TabsContent` — panel (Base UI `Tabs.Panel`); use `value`.
- `tabsListVariants` — the cva helper for the list styles.
