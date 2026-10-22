---
type: UI Component
title: Toaster
description: The fixed viewport container that subscribes to toast state and renders the active toast stack.
tags: [ui, toast, notification, mount]
timestamp: 2026-07-23
---

# Toaster

The mount component for the toast system. Reads `toasts` and `dismiss` from `useToast()` (`@/lib/toast`) and renders each entry as a [toast](./toast.md) card in a fixed, bottom-right, `aria-live="polite"` region. Render it once near the app root, inside a `ToastProvider`.

Source: [toaster.tsx](./toaster.tsx).

## Usage

    import { Toaster } from '@/components/ui/toaster'
    import { ToastProvider } from '@/lib/toast'

    <ToastProvider>
      {children}
      <Toaster />
    </ToastProvider>

## Exports
- `Toaster` — viewport container; takes no props, sources state from context.

## Constraints / Gotchas
- Must be a descendant of `ToastProvider` — `useToast()` throws otherwise.
- Toasts auto-dismiss after 5s (timer lives in `@/lib/toast`); the close button dismisses early.
