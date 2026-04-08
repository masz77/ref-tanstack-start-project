import { ArrowCounterClockwise, WarningCircle } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'

type AppErrorProps = {
  message?: string
  onRetry?: () => void
}

function AppError({
  message = 'Something went wrong. Please try again.',
  onRetry,
}: AppErrorProps) {
  return (
    <div
      data-slot="app-error"
      className="flex flex-col items-center justify-center gap-4 py-20 text-center"
    >
      <WarningCircle className="size-12 text-destructive/60" weight="thin" />
      <div>
        <p className="font-semibold text-foreground">Something went wrong</p>
        <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <ArrowCounterClockwise className="mr-1.5 size-4" />
          Try again
        </Button>
      )}
    </div>
  )
}

export { AppError }
