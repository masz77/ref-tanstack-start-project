'use client'

import type { AnyFieldApi } from '@tanstack/react-form'
import { Check, Spinner, X } from '@phosphor-icons/react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type TextFieldProps = {
  field: AnyFieldApi
  label: string
  placeholder?: string
  type?: 'text' | 'email' | 'password' | 'number'
  maxLength?: number
  min?: number
  max?: number
  disabled?: boolean
  autoComplete?: string
  required?: boolean
  /**
   * Show spinner/check/X icons for async validation feedback.
   */
  showValidationIcons?: boolean
  /**
   * Min value length before showing the "valid" checkmark.
   * @default 1
   */
  validMinLength?: number
  className?: string
  inputClassName?: string
  leftIcon?: React.ReactNode
}

function TextField({
  field,
  label,
  placeholder,
  type = 'text',
  maxLength,
  min,
  max,
  disabled,
  autoComplete,
  required,
  showValidationIcons = false,
  validMinLength = 1,
  className,
  inputClassName,
  leftIcon,
}: TextFieldProps) {
  const hasError = field.state.meta.errors.length > 0
  const isValidating = field.state.meta.isValidating
  const isTouched = field.state.meta.isTouched
  const value = String(field.state.value ?? '').trim()
  const isValid =
    showValidationIcons && isTouched && !hasError && !isValidating && value.length >= validMinLength

  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={field.name}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      <div className="relative">
        {leftIcon && (
          <div className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-muted-foreground">
            {leftIcon}
          </div>
        )}
        <Input
          id={field.name}
          name={field.name}
          type={type}
          value={field.state.value ?? ''}
          onChange={(e) => field.handleChange(e.target.value)}
          onBlur={field.handleBlur}
          placeholder={placeholder}
          maxLength={maxLength}
          min={min}
          max={max}
          disabled={disabled ?? field.form.state.isSubmitting}
          autoComplete={autoComplete}
          aria-invalid={hasError}
          aria-required={required}
          className={cn(
            hasError && 'border-destructive',
            (showValidationIcons || hasError) && 'pr-8',
            leftIcon && 'pl-9',
            inputClassName,
          )}
        />
        {showValidationIcons && (
          <>
            {isValidating && (
              <Spinner className="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
            {!isValidating && isValid && (
              <Check className="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-green-600" />
            )}
            {!isValidating && hasError && (
              <X className="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-destructive" />
            )}
          </>
        )}
      </div>
      {hasError && (
        <p className="text-sm text-destructive">{String(field.state.meta.errors[0])}</p>
      )}
    </div>
  )
}

export { TextField }
