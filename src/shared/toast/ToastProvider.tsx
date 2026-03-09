import { useState, type PropsWithChildren } from 'react'
import { createPortal } from 'react-dom'
import { ToastContext, type ToastInput } from './ToastContext'
import { Button } from '../ui/button'

type ToastItem = ToastInput & {
  id: number
}

const toneClasses = {
  success: 'border-emerald-200 bg-white text-emerald-700',
  error: 'border-red-200 bg-white text-red-700',
  info: 'border-[var(--border)] bg-white text-[var(--foreground)]',
}

export function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  function removeToast(id: number) {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }

  function showToast(input: ToastInput) {
    const id = Date.now() + Math.floor(Math.random() * 1000)
    setToasts((current) => [...current, { id, ...input }])

    window.setTimeout(() => {
      removeToast(id)
    }, 3600)
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed right-4 top-4 z-[90] flex w-[min(92vw,380px)] flex-col gap-3">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`pointer-events-auto rounded-xl border px-4 py-4 shadow-[0_14px_32px_rgba(15,23,42,0.12)] ${toneClasses[toast.tone ?? 'info']}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold">{toast.title}</p>
                  {toast.description ? (
                    <p className="mt-2 text-sm leading-6 opacity-85">{toast.description}</p>
                  ) : null}
                </div>
                <Button
                  variant="ghost"
                  className="min-h-8 px-2 text-xs"
                  onClick={() => removeToast(toast.id)}
                >
                  Close
                </Button>
              </div>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}
