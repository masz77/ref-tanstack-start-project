---
type: UI Component
title: ContentLoader
description: Centered spinner placeholder for loading regions.
tags: [ui, loader, spinner, phosphor]
timestamp: 2026-07-23
---

# ContentLoader

A fixed-height (`h-48`) flex box that centers an animated `SpinnerGap` from `@phosphor-icons/react`. Drop-in loading state for content areas. Takes no props.

Source: [content-loader.tsx](./content-loader.tsx).

## Usage

    import { ContentLoader } from '@/components/ui/content-loader'

    {isLoading ? <ContentLoader /> : <Content />}

## Exports
- `ContentLoader` — the centered spinner element.
