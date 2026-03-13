import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../lib/cn'

type DialogProps = {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children?: ReactNode
  footer?: ReactNode
  size?: 'md' | 'lg' | 'xl'
}

const sizeClasses = {
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: DialogProps) {
  useEffect(() => {
    if (!open) {
      return
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose, open])

  if (!open) {
    return null
  }

  return createPortal(
    <div className="fixed inset-0 z-[80] grid place-items-center p-3 sm:p-6">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.14),transparent_32%),rgba(0,0,0,0.72)] backdrop-blur-md"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative z-10 flex max-h-[calc(100vh-1.5rem)] w-full flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(160deg,rgba(17,17,22,0.98),rgba(13,13,18,0.94))] shadow-[var(--shadow-xl)] sm:max-h-[calc(100vh-3rem)]',
          sizeClasses[size],
        )}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.16),transparent_72%)]" />

        <div className="relative z-10 flex items-start justify-between gap-4 border-b border-white/10 px-6 py-5 sm:px-7">
          <div className="max-w-2xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-blue-300/70">
              Workspace dialog
            </p>
            <h2 className="mt-2 text-lg font-semibold tracking-tight text-[var(--foreground)]">{title}</h2>
            {description ? (
              <p className="mt-2 text-xs leading-5 text-[var(--muted-strong)]">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--input-surface)] text-[var(--muted-strong)] shadow-[inset_0_1px_2px_rgba(0,0,0,0.12)] transition hover:border-[var(--border-hover)] hover:bg-[var(--accent-soft)] hover:text-[var(--foreground)]"
            aria-label="Close dialog panel"
          >
            <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M4 4l8 8M12 4 4 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {children ? (
          <div className="relative z-10 overflow-y-auto px-6 py-6 sm:px-7">
            {children}
          </div>
        ) : null}

        {footer ? (
          <div className="relative z-10 flex flex-wrap justify-end gap-3 border-t border-white/10 px-6 py-5 sm:px-7">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}
