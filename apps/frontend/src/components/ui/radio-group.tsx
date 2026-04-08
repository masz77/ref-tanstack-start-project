'use client'

import { Radio } from '@base-ui/react/radio'
import { RadioGroup as RadioGroupPrimitive } from '@base-ui/react/radio-group'

import { cn } from '@/lib/utils'

const RadioGroup = RadioGroupPrimitive

function RadioGroupItem({ className, children, ...props }: Radio.Root.Props) {
  return (
    <Radio.Root
      data-slot="radio-group-item"
      className={cn(
        'aspect-square size-4 rounded-full border border-primary text-primary shadow-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <Radio.Indicator className="flex items-center justify-center">
        <span className="size-2 rounded-full bg-primary" />
      </Radio.Indicator>
      {children}
    </Radio.Root>
  )
}

export { RadioGroup, RadioGroupItem }
