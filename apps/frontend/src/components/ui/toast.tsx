import { CheckCircle, Info, Warning, X } from '@phosphor-icons/react'

import { cn } from '@/lib/utils'
import type { Toast as ToastData, ToastType } from '@/lib/toast'

const icons: Record<ToastType, React.ElementType> = {
  success: CheckCircle,
  error: Info,
  info: Info,
  warning: Warning,
}

const iconColors: Record<ToastType, string> = {
  success: 'text-green-600',
  error: 'text-destructive',
  info: 'text-primary',
  warning: 'text-amber-500',
}

type ToastProps = {
  toast: ToastData
  onDismiss: (id: string) => void
}

function Toast({ toast, onDismiss }: ToastProps) {
  const Icon = icons[toast.type]

  return (
    <div
      data-slot="toast"
      role="alert"
      className={cn(
        'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl bg-card p-4 shadow-lg ring-1 ring-border',
        'animate-in slide-in-from-right-full fade-in duration-300',
      )}
    >
      <Icon
        weight="regular"
        className={cn('size-5 shrink-0 mt-0.5', iconColors[toast.type])}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-card-foreground">{toast.title}</p>
        {toast.description && (
          <p className="mt-1 text-sm text-muted-foreground">{toast.description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 rounded-md p-1 text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X weight="bold" className="size-4" />
      </button>
    </div>
  )
}

export { Toast }
