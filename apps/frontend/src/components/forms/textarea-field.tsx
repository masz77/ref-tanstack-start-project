'use client'

import type { AnyFieldApi } from '@tanstack/react-form'

import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

type TextareaFieldProps = {
  field: AnyFieldApi
  label: string
  placeholder?: string
  maxLength?: number
  disabled?: boolean
  required?: boolean
  className?: string
  textareaClassName?: string
  /**
   * Minimum height class for the textarea.
   * @default 'min-h-20'
   */
  minHeight?: string
}

function TextareaField({
  field,
  label,
  placeholder,
  maxLength,
  disabled,
  required,
  className,
  textareaClassName,
  minHeight = 'min-h-20',
}: TextareaFieldProps) {
  const hasError = field.state.meta.errors.length > 0

  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={field.name}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      <Textarea
        id={field.name}
        name={field.name}
        value={field.state.value ?? ''}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={disabled ?? field.form.state.isSubmitting}
        aria-invalid={hasError}
        aria-required={required}
        className={cn(hasError && 'border-destructive', minHeight, textareaClassName)}
      />
      {hasError && (
        <p className="text-sm text-destructive">{String(field.state.meta.errors[0])}</p>
      )}
    </div>
  )
}

export { TextareaField }
