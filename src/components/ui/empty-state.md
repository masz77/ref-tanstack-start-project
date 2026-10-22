---
type: UI Component
title: EmptyState
description: Dashed-border placeholder with an icon, title, description, and optional action.
tags: [ui, empty-state, feedback]
timestamp: 2026-07-23
---

# EmptyState

Centered "nothing here" placeholder — a required icon component, title, description, and optional action. Plain React (no primitive library); renders the project `Button` for object-form actions.

Source: [empty-state.tsx](./empty-state.tsx).

## Usage

    import { EmptyState } from '@/components/ui/empty-state'
    import { Folder } from '@phosphor-icons/react'

    <EmptyState
      icon={Folder}
      title="No projects"
      description="Create your first project to get started."
      action={{ label: 'New project', onClick: handleCreate }}
    />

## Exports
- `EmptyState` — props: `icon` (component), `title`, `description`, optional `action`, `className`

## Constraints / Gotchas
- `icon` is a component type, passed as `icon={Folder}` (not `<Folder />`).
- `action` is either `{ label, onClick }` (renders a `Button`) or a raw `ReactNode` (rendered as-is).
- Presentational only — for error vs empty distinction, choose which state to render at the call site.
