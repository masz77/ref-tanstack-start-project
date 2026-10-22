---
type: UI Component
title: Skeleton
description: A pulsing muted placeholder block for loading states.
tags: [ui, skeleton, loading, placeholder]
timestamp: 2026-07-23
---

# Skeleton

A plain `div` with `animate-pulse`, rounded corners, and a muted background used as a loading placeholder. Size and shape are controlled entirely via `className`.

Source: [skeleton.tsx](./skeleton.tsx).

## Usage

    import { Skeleton } from '@/components/ui/skeleton'

    <Skeleton className="h-4 w-32" />

## Exports
- `Skeleton` — accepts all native `div` props; pass width/height utilities through `className`.
