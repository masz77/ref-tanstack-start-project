---
type: UI Component
title: Toast
description: The presentational card for a single toast notification, with a type icon and dismiss button.
tags: [ui, toast, notification, phosphor]
timestamp: 2026-07-23
---

# Toast

Renders one toast as a card (`role="alert"`) with a type-based Phosphor icon, title, optional description, and a close button. Purely presentational — it takes toast data plus an `onDismiss` callback and does not manage state. State and the `toast.*` trigger API live in `@/lib/toast` (a custom React context, not sonner). The mount/list component is [toaster](./toaster.md).

Source: [toast.tsx](./toast.tsx).

## Usage

    import { Toast } from '@/components/ui/toast'

    <Toast toast={toast} onDismiss={dismiss} />

Typically you don't render `Toast` directly — use `useToast().toast.success(...)` and mount `<Toaster />`.

## Exports
- `Toast` — single toast card; props `{ toast: Toast, onDismiss: (id: string) => void }`.

## Constraints / Gotchas
- `type` maps to icon + color: `success`/`error`/`info`/`warning`. Note `error` and `info` both use the `Info` icon (only the color differs).
