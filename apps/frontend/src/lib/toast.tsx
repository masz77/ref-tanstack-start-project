'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  type: ToastType
  title: string
  description?: string
}

interface ToastContextValue {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => string
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev, { ...toast, id }])

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 5000)

    return id
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  )
}

function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }

  const { addToast, removeToast, toasts } = context

  const toast = useMemo(
    () => ({
      success: (title: string, description?: string) =>
        addToast({ type: 'success', title, description }),
      error: (title: string, description?: string) =>
        addToast({ type: 'error', title, description }),
      info: (title: string, description?: string) =>
        addToast({ type: 'info', title, description }),
      warning: (title: string, description?: string) =>
        addToast({ type: 'warning', title, description }),
    }),
    [addToast],
  )

  return {
    toasts,
    toast,
    dismiss: removeToast,
  }
}

export { ToastProvider, useToast }
