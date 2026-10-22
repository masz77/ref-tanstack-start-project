---
type: UI Component
title: TableRowSkeleton
description: A loading placeholder that renders skeleton cells inside a table body.
tags: [ui, skeleton, table, loading]
timestamp: 2026-07-23
---

# TableRowSkeleton

Renders a `TableBody` of placeholder rows for tables in a loading state. Each cell holds a `Skeleton` bar whose width cycles through a fixed set (`w-2/3`, `w-1/2`, `w-1/3`, `w-3/4`, `w-1/2`).

Source: [table-row-skeleton.tsx](./table-row-skeleton.tsx).

## Usage

    import { TableRowSkeleton } from '@/components/ui/table-row-skeleton'

    <Table>
      <TableHeader>...</TableHeader>
      <TableRowSkeleton columns={4} rows={5} hiddenColumns={[3]} />
    </Table>

## Exports
- `TableRowSkeleton` — props: `columns` (required, number of cells per row), `rows` (default `5`), `hiddenColumns` (column indexes hidden below the `sm` breakpoint via `hidden sm:table-cell`).

## Constraints / Gotchas
- Renders its own `TableBody`, so drop it directly inside `Table` — do not wrap it in another `TableBody`.
