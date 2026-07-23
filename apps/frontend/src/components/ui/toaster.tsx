// Toaster — usage & design notes: ./toaster.md

import { Toast } from '@/components/ui/toast'
import { useToast } from '@/lib/toast'

function Toaster() {
  const { toasts, dismiss } = useToast()

  return (
    <div
      data-slot="toaster"
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2"
    >
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={dismiss} />
      ))}
    </div>
  )
}

export { Toaster }
