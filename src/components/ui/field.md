---
type: UI Component
title: Field
description: Compound form-field layout primitives for labels, descriptions, errors, and grouping.
tags: [ui, form, layout]
timestamp: 2026-07-23
---

# Field

Layout primitives for composing form fields — orientation-aware wrappers plus label, description, and error parts. Built with plain elements + `class-variance-authority`; reuses the project `Label` and `Separator`.

Source: [field.tsx](./field.tsx).

## Usage

    import { Field, FieldLabel, FieldDescription, FieldError } from '@/components/ui/field'

    <Field>
      <FieldLabel htmlFor="email">Email</FieldLabel>
      <Input id="email" />
      <FieldDescription>We never share it.</FieldDescription>
      <FieldError errors={fieldErrors} />
    </Field>

## Exports
- `Field` — `role=group` wrapper; `orientation: 'vertical' | 'horizontal' | 'responsive'`
- `FieldSet`, `FieldLegend` (`variant: 'legend' | 'label'`), `FieldGroup` — grouping containers
- `FieldContent`, `FieldLabel`, `FieldTitle` — content/label parts
- `FieldDescription`, `FieldSeparator` — helper text and labelled divider
- `FieldError` — renders `children`, or dedupes/lists `errors: Array<{ message? }>`; returns `null` when empty

## Constraints / Gotchas
- `responsive` orientation switches to horizontal only inside a `FieldGroup` (via its `@container/field-group`).
- `FieldError` renders nothing when there is no content — no empty `role=alert` node.
