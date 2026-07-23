---
type: UI Component
title: Combobox
description: Autocomplete/multiselect input compound built on Base UI's Combobox, with an optional chips (tag) mode.
tags: [ui, combobox, base-ui, autocomplete, multiselect]
timestamp: 2026-07-23
---

# Combobox

Filterable select built on Base UI `@base-ui/react` `Combobox`. `ComboboxInput` composes the repo's `InputGroup` for the text field plus inline trigger/clear buttons; a separate chips mode (`ComboboxChips` / `ComboboxChip` / `ComboboxChipsInput`) renders selected values as removable tags for multiselect. Icons from `@phosphor-icons/react`.

Source: [combobox.tsx](./combobox.tsx).

## Usage

    import { Combobox, ComboboxInput, ComboboxContent, ComboboxList, ComboboxItem } from '@/components/ui/combobox'

    <Combobox items={items}>
      <ComboboxInput />
      <ComboboxContent>
        <ComboboxList>
          {(item) => <ComboboxItem key={item.value} value={item}>{item.label}</ComboboxItem>}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>

## Exports
- `Combobox` — root (`ComboboxPrimitive.Root`), holds value/items state.
- `ComboboxValue` — renders the current selected value.
- `ComboboxInput` — text field in an `InputGroup`; props `showTrigger` (default true), `showClear` (default false), `disabled`.
- `ComboboxTrigger` — dropdown toggle with caret icon.
- `ComboboxClear` — clears the value (X icon).
- `ComboboxContent` — portalled/positioned popup; accepts `side`, `align`, `sideOffset`, `alignOffset`, `anchor`.
- `ComboboxList` — scrollable option list.
- `ComboboxItem` — option row with a check `ItemIndicator`.
- `ComboboxGroup` / `ComboboxLabel` — grouped options with a heading.
- `ComboboxCollection` — renders a collection of items.
- `ComboboxEmpty` — no-results state (shown only when the list is empty).
- `ComboboxSeparator` — divider between groups.
- `ComboboxChips` / `ComboboxChip` / `ComboboxChipsInput` — multiselect tag UI; `ComboboxChip` has `showRemove` (default true).
- `useComboboxAnchor` — returns a ref to attach as `ComboboxContent`'s `anchor` (e.g. anchor the popup to a chips container).

## Constraints / Gotchas
- Chips mode: pass `useComboboxAnchor()`'s ref to both the anchor element and `ComboboxContent` `anchor` so the popup sizes to the chips box (`data-chips` toggles min-width behavior).
