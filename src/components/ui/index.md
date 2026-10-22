---
okf_version: "0.1"
---

# UI Components

OKF knowledge bundle co-located with `src/components/ui/`. Each entry links a
component's doc; agents ingest this directory as a set. A component without a doc
here simply has no knowledge captured yet — that is expected, not an error.

## Inputs & Forms

- [Button](./button.md) — The core button built on Base UI's Button primitive with CVA variant and size options.
- [Input](./input.md) — Styled text input built on the Base UI Input primitive.
- [Textarea](./textarea.md) — A styled multi-line text input wrapping the native HTML textarea element.
- [PasswordInput](./password-input.md) — Password field wrapping Input with a show/hide toggle button.
- [SearchField](./search-field.md) — NSSearchField-style search input: leading search button, clear button that appears only with text, and an optional recent-search menu.
- [Label](./label.md) — Styled native form label with disabled-state styling hooks.
- [Field](./field.md) — Compound form-field layout primitives for labels, descriptions, errors, and grouping.
- [InputGroup](./input-group.md) — Wrapper that pairs an input or textarea with inline/block addons, buttons, and text.
- [RadioGroup](./radio-group.md) — Radio group built on Base UI RadioGroup and Radio primitives.
- [Select](./select.md) — Compound select menu built on the Base UI Select primitive.
- [Combobox](./combobox.md) — Autocomplete/multiselect input compound built on Base UI's Combobox, with an optional chips (tag) mode.

## Overlays & Menus

- [Dialog](./dialog.md) — Modal dialog compound built on Base UI's Dialog primitive.
- [AlertDialog](./alert-dialog.md) — A modal confirmation dialog built on Base UI's AlertDialog primitive with composable parts and sized layout.
- [Drawer](./drawer.md) — Draggable edge panel compound built on the Vaul drawer primitive.
- [DropdownMenu](./dropdown-menu.md) — Compound dropdown menu with items, checkboxes, radios, submenus, and shortcuts.
- [Tooltip](./tooltip.md) — A hover/focus tooltip built on Base UI's tooltip primitive with portal, positioning, and arrow.

## Feedback & Notifications

- [Toast](./toast.md) — The presentational card for a single toast notification, with a type icon and dismiss button.
- [Toaster](./toaster.md) — The fixed viewport container that subscribes to toast state and renders the active toast stack.
- [AppError](./app-error.md) — A centered error state with icon, message, and optional retry button for failed data loads.
- [EmptyState](./empty-state.md) — Dashed-border placeholder with an icon, title, description, and optional action.

## Loading

- [Skeleton](./skeleton.md) — A pulsing muted placeholder block for loading states.
- [TableRowSkeleton](./table-row-skeleton.md) — A loading placeholder that renders skeleton cells inside a table body.
- [ContentLoader](./content-loader.md) — Centered spinner placeholder for loading regions.

## Layout & Containers

- [Card](./card.md) — A composable content container with header, title, description, action, content, and footer parts.
- [Table](./table.md) — A set of styled native table primitives with a horizontally scrollable container.
- [Tabs](./tabs.md) — A tabbed interface built on Base UI tabs with default and line variants.
- [Separator](./separator.md) — A thin visual divider that renders horizontally or vertically.
- [ScrollArea](./scroll-area.md) — macOS/SwiftUI-style overlay scroller for a bounded scroll region.
- [Squircle](./squircle.md) — Container with Figma-style smooth corners (squircles) instead of plain CSS border-radius arcs.

## Miscellaneous

- [Badge](./badge.md) — A small inline status/label pill with CVA variants, renderable as any element via Base UI useRender.
