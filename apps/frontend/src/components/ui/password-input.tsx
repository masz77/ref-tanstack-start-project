'use client'

import { Eye, EyeSlash } from '@phosphor-icons/react'
import { forwardRef, useState } from 'react'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type PasswordInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  leftIcon?: React.ReactNode
}

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ leftIcon, className, disabled, ...props }, ref) => {
    const [show, setShow] = useState(false)

    return (
      <div data-slot="password-input" className="relative">
        {leftIcon && (
          <span className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-muted-foreground">
            {leftIcon}
          </span>
        )}
        <Input
          ref={ref}
          type={show ? 'text' : 'password'}
          disabled={disabled}
          className={cn(leftIcon && 'pl-8', 'pr-9', className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? 'Hide password' : 'Show password'}
          disabled={disabled}
          tabIndex={-1}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none"
        >
          {show ? <EyeSlash className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    )
  },
)
PasswordInput.displayName = 'PasswordInput'

export { PasswordInput }
