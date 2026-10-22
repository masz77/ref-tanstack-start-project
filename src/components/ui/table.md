---
type: UI Component
title: Table
description: A set of styled native table primitives with a horizontally scrollable container.
tags: [ui, table, data]
timestamp: 2026-07-23
---

# Table

Thin styled wrappers over native table elements (`<table>`, `<thead>`, etc.), each tagged with a `data-slot`. `Table` wraps the element in a `relative w-full overflow-x-auto` container so wide tables scroll instead of overflowing the page.

Source: [table.tsx](./table.tsx).

## Usage

    import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'

    <Table>
      <TableHeader>
        <TableRow><TableHead>Name</TableHead></TableRow>
      </TableHeader>
      <TableBody>
        <TableRow><TableCell>Ada</TableCell></TableRow>
      </TableBody>
    </Table>

## Exports
- `Table` — `<table>` inside a scroll container.
- `TableHeader` — `<thead>`.
- `TableBody` — `<tbody>`; strips the border off the last row.
- `TableFooter` — `<tfoot>`; muted background, medium weight.
- `TableRow` — `<tr>`; hover/selected/aria-expanded background states.
- `TableHead` — `<th>`; left-aligned header cell.
- `TableCell` — `<td>`.
- `TableCaption` — `<caption>`.
