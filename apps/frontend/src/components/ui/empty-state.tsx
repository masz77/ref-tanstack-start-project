import type { ComponentType, ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type EmptyStateAction = {
  label: string
  onClick: () => void
}

type EmptyStateProps = {
  icon: ComponentType<{ className?: string }>
  title: string
  description: string
  action?: EmptyStateAction | ReactNode
  className?: string
}

function isActionObject(action: unknown): action is EmptyStateAction {
  return typeof action === 'object' && action !== null && 'label' in action && 'onClick' in action
}

function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        'flex flex-col items-center gap-4 rounded-xl border border-dashed py-16 text-center',
        className,
      )}
    >
      <Icon className="size-12 text-muted-foreground/40" />
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {action &&
        (isActionObject(action) ? (
          <Button onClick={action.onClick}>{action.label}</Button>
        ) : (
          action
        ))}
    </div>
  )
}

export { EmptyState }
