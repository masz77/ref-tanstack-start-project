---
type: UI Component
title: RadioGroup
description: Radio group built on Base UI RadioGroup and Radio primitives.
tags: [ui, radio-group, base-ui, form]
timestamp: 2026-07-23
---

# RadioGroup

Compound radio control. `RadioGroup` is Base UI's `RadioGroup` root re-exported as-is; `RadioGroupItem` wraps `Radio.Root` with a styled indicator dot (`Radio.Indicator`). Value can be controlled or uncontrolled via the root's props.

Source: [radio-group.tsx](./radio-group.tsx).

## Usage

    import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

    <RadioGroup defaultValue="a">
      <RadioGroupItem value="a" />
      <RadioGroupItem value="b" />
    </RadioGroup>

## Exports
- `RadioGroup` — the Base UI group root (unmodified).
- `RadioGroupItem` — styled `Radio.Root` with indicator; takes `Radio.Root.Props` plus `children`.
