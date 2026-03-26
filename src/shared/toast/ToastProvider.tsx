import { useState, type PropsWithChildren } from 'react'
import { createPortal } from 'react-dom'
import { translateCurrentLiteral } from '../i18n/translations'
import { ToastContext, type ToastInput } from './ToastContext'

type ToastItem = ToastInput & {
  id: number
}

const toneStyles = {
  success: {
    shell: 'border-emerald-500/20 bg-[linear-gradient(180deg,rgba(6,78,59,0.94),rgba(20,83,45,0.96))] text-emerald-50 shadow-[0_22px_48px_rgba(6,78,59,0.26)]',
    iconWrap: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-4.5 w-4.5" aria-hidden="true">
        <path d="m5 10 3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    eyebrow: 'text-emerald-200/80',
    description: 'text-emerald-50/72',
    close: 'border-emerald-100/18 bg-emerald-50/8 text-emerald-50 hover:bg-emerald-50/14',
    rail: 'bg-emerald-300/75',
  },
  error: {
    shell: 'border-red-500/20 bg-[linear-gradient(180deg,rgba(127,29,29,0.96),rgba(69,10,10,0.96))] text-red-50 shadow-[0_22px_48px_rgba(127,29,29,0.26)]',
    iconWrap: 'border-red-300/20 bg-red-300/10 text-red-100',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-4.5 w-4.5" aria-hidden="true">
        <path d="M10 6v4m0 4h.01M10 2.5l7 12.5H3l7-12.5Z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    eyebrow: 'text-red-100/80',
    description: 'text-red-50/72',
    close: 'border-red-100/18 bg-red-50/8 text-red-50 hover:bg-red-50/14',
    rail: 'bg-red-300/75',
  },
  info: {
    shell: 'border-[var(--border)] bg-[linear-gradient(180deg,var(--surface-elevated),var(--surface))] text-[var(--foreground)] shadow-[0_18px_40px_rgba(15,23,42,0.12)]',
    iconWrap: 'border-blue-500/15 bg-blue-500/8 text-blue-500',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-4.5 w-4.5" aria-hidden="true">
        <path d="M10 6.75h.01M9.25 9.5h.75v3h.75" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="10" cy="10" r="7" />
      </svg>
    ),
    eyebrow: 'text-[var(--muted)]',
    description: 'text-[var(--muted-strong)]',
    close: 'border-[var(--border)] bg-[var(--muted-surface)] text-[var(--foreground)] hover:bg-[var(--accent-soft)]',
    rail: 'bg-blue-500/70',
  },
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
        <div className="pointer-events-none fixed right-4 top-4 z-[90] flex w-[min(92vw,420px)] flex-col gap-3">
          {toasts.map((toast) => (
            (() => {
              const tone = toast.tone ?? 'info'
              const toneStyle = toneStyles[tone]
              const localizedTone = translateCurrentLiteral(tone)
              const localizedTitle = translateCurrentLiteral(toast.title)
              const localizedDescription = toast.description ? translateCurrentLiteral(toast.description) : null

              return (
                <div
                  key={toast.id}
                  className={`pointer-events-auto relative overflow-hidden rounded-2xl border px-4 py-4 backdrop-blur-xl ${toneStyle.shell}`}
                >
                  <span className={`absolute inset-y-0 left-0 w-1 ${toneStyle.rail}`} aria-hidden="true" />
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${toneStyle.iconWrap}`}>
                      {toneStyle.icon}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className={`text-[10px] font-semibold uppercase tracking-[0.22em] ${toneStyle.eyebrow}`}>
                        {localizedTone}
                      </p>
                      <p className="mt-1 text-sm font-semibold tracking-tight">{localizedTitle}</p>
                      {localizedDescription ? (
                        <p className={`mt-1 text-[12px] leading-5 ${toneStyle.description}`}>{localizedDescription}</p>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      className={`inline-flex h-9 shrink-0 items-center justify-center rounded-xl border px-3 text-xs font-medium transition-colors ${toneStyle.close}`}
                      onClick={() => removeToast(toast.id)}
                    >
                      {translateCurrentLiteral('Close')}
                    </button>
                  </div>
                </div>
              )
            })()
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}
