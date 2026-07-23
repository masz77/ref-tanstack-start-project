---
type: UI Component
title: AppError
description: A centered error state with icon, message, and optional retry button for failed data loads.
tags: [ui, error-state, feedback]
timestamp: 2026-07-23
---

# AppError

Full-block error state for "something went wrong" cases (500/network failures), distinct from empty states. Renders a `WarningCircle` Phosphor icon, a message, and — only when `onRetry` is passed — a "Try again" outline `Button`.

Source: [app-error.tsx](./app-error.tsx).

## Usage

    import { AppError } from '@/components/ui/app-error'

    <AppError message="Failed to load orders." onRetry={() => refetch()} />

## Props
- `message?: string` — error detail; defaults to `'Something went wrong. Please try again.'`.
- `onRetry?: () => void` — when provided, shows the retry button; omit to hide it.
