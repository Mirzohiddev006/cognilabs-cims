import { useState, type PropsWithChildren } from 'react'
import { createPortal } from 'react-dom'
import { ToastContext, type ToastInput } from './ToastContext'
import { Button } from '../ui/button'

type ToastItem = ToastInput & {
  id: number
}

const toneClasses = {
  success: 'border-emerald-500/20 bg-emerald-950/80 text-emerald-200',
  error: 'border-red-500/20 bg-red-950/80 text-red-200',
  info: 'border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]',
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
              className={`pointer-events-auto rounded-xl border px-4 py-3 shadow-[0_14px_32px_rgba(0,0,0,0.4)] backdrop-blur-lg ${toneClasses[toast.tone ?? 'info']}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold">{toast.title}</p>
                  {toast.description ? (
                    <p className="mt-1 text-[11px] leading-4 opacity-85">{toast.description}</p>
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
