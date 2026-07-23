---
type: UI Component
title: PasswordInput
description: Password field wrapping Input with a show/hide toggle button.
tags: [ui, input, password, form]
timestamp: 2026-07-23
---

# PasswordInput

Wraps `Input` and toggles its `type` between `password` and `text` via a trailing eye button (`Eye`/`EyeSlash` from `@phosphor-icons/react`). Forwards a ref to the underlying input and accepts an optional `leftIcon`. Own visibility state is internal.

Source: [password-input.tsx](./password-input.tsx).

## Usage

    import { PasswordInput } from '@/components/ui/password-input'

    <PasswordInput placeholder="Password" />

## Props
- `PasswordInput` — all native input props except `type` (managed internally), plus `leftIcon?: React.ReactNode`.

## Constraints / Gotchas
- The toggle button is `tabIndex={-1}` (skipped in tab order) and its `aria-label` flips between "Show password" and "Hide password".
