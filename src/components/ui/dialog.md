---
type: UI Component
title: Dialog
description: Modal dialog compound built on Base UI's Dialog primitive.
tags: [ui, dialog, modal, base-ui]
timestamp: 2026-07-23
---

# Dialog

Modal dialog built on Base UI `@base-ui/react/dialog`. Supports controlled or uncontrolled open state via the root's props. `DialogContent` bundles the portal, backdrop overlay, and centered popup; open/close animations are driven by `data-open` / `data-closed` state.

Source: [dialog.tsx](./dialog.tsx).

## Usage

    import { Dialog, DialogTrigger, DialogContent, DialogTitle } from '@/components/ui/dialog'

    <Dialog>
      <DialogTrigger>Open</DialogTrigger>
      <DialogContent>
        <DialogTitle>Title</DialogTitle>
      </DialogContent>
    </Dialog>

## Exports
- `Dialog` — root, owns open state.
- `DialogTrigger` — element that opens the dialog.
- `DialogContent` — portalled popup (renders `DialogPortal` + `DialogOverlay` internally).
- `DialogOverlay` — backdrop (`Backdrop`) with blur.
- `DialogPortal` — portal wrapper.
- `DialogHeader` / `DialogFooter` — layout wrappers (plain `div`s); footer is a muted, bordered action bar.
- `DialogTitle` / `DialogDescription` — accessible title and description.
- `DialogClose` — element that closes the dialog.
