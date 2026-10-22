---
type: UI Component
title: Textarea
description: A styled multi-line text input wrapping the native HTML textarea element.
tags: [ui, textarea, form, input]
timestamp: 2026-07-23
---

# Textarea

A thin wrapper over the native `<textarea>` that applies the design-system styling (border, focus ring, `aria-invalid` states, disabled styling). Uses `field-sizing-content` so it grows with its content. Forwards all native textarea props.

Source: [textarea.tsx](./textarea.tsx).

## Usage

    import { Textarea } from '@/components/ui/textarea'

    <Textarea placeholder="Message" rows={4} />

## Exports
- `Textarea` — native textarea with design-system classes; accepts all `React.ComponentProps<'textarea'>`.
