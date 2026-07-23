---
type: UI Component
title: SearchField
description: NSSearchField-style search input — leading search button, clear button that appears only with text, and an optional recent-search menu.
tags: [ui, search, input, base-ui, macos]
timestamp: 2026-07-23
---

# SearchField

Native-feel search field composed from [input-group](./input-group.tsx) + phosphor
icons, with the recents menu from [dropdown-menu](./dropdown-menu.tsx). Works
controlled (`value` + `onValueChange`) or uncontrolled (`defaultValue`).

Source: [search-field.tsx](./search-field.tsx).

## Usage

    import { SearchField } from '@/components/ui/search-field'

    // uncontrolled
    <SearchField placeholder="Search…" onValueChange={setQuery} />

    // with recent-search menu (NSSearchFieldCell.searchMenuTemplate)
    <SearchField
      recentSearches={['climate', 'housing']}
      onRecentSelect={(t) => runSearch(t)}
    />

## Props

- `value` / `defaultValue` / `onValueChange` — text state (controlled or not).
- `onClear` — fired when the trailing clear button is pressed.
- `recentSearches` / `onRecentSelect` — optional recents dropdown on the leading
  button; omit `recentSearches` for a plain static magnifier.
- `...rest` — forwarded to the underlying input.

## Constraints / Gotchas

- Uses `type="search"`; WebKit's native search decorations are stripped via
  `::-webkit-search-cancel-button` / `::-webkit-search-decoration` so only the
  custom leading/trailing controls show. Removing that strips-nothing and a
  duplicate clear "×" reappears.
- The trailing clear button renders only when there is text, matching NSSearchField.
