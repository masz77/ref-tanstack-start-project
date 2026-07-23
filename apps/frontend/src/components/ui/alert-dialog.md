---
type: UI Component
title: AlertDialog
description: A modal confirmation dialog built on Base UI's AlertDialog primitive with composable parts and sized layout.
tags: [ui, alert-dialog, base-ui, modal]
timestamp: 2026-07-23
---

# AlertDialog

Modal confirmation dialog composed from Base UI `@base-ui/react/alert-dialog` primitives. Unlike a plain dialog, it requires an explicit action or cancel to dismiss. Action/Cancel render as the project `Button`. Uncontrolled by default; pass `open`/`onOpenChange` on the root for controlled use.

Source: [alert-dialog.tsx](./alert-dialog.tsx).

## Usage

    import {
      AlertDialog,
      AlertDialogTrigger,
      AlertDialogContent,
      AlertDialogHeader,
      AlertDialogTitle,
      AlertDialogDescription,
      AlertDialogFooter,
      AlertDialogCancel,
      AlertDialogAction,
    } from '@/components/ui/alert-dialog'

    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="destructive">Delete</Button>} />
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive">Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

## Exports
- `AlertDialog` — root (Base UI `Root`).
- `AlertDialogTrigger` — opens the dialog.
- `AlertDialogContent` — popup with backdrop/portal; `size?: 'default' | 'sm'`.
- `AlertDialogHeader`, `AlertDialogFooter`, `AlertDialogMedia` — layout `div`s.
- `AlertDialogTitle`, `AlertDialogDescription` — Base UI title/description.
- `AlertDialogAction` — confirm button (renders `Button`, forwards its props).
- `AlertDialogCancel` — close button; defaults `variant="outline"`, `size="default"`.
- `AlertDialogOverlay`, `AlertDialogPortal` — backdrop and portal.

## Constraints / Gotchas
- `AlertDialogContent` auto-wraps itself in `AlertDialogPortal` + `AlertDialogOverlay` — do not add them again.
- `size` on Content sets `data-size` that header/footer read via group selectors; passing it elsewhere has no effect.
