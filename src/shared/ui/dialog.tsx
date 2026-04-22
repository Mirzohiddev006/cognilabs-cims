import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { translateCurrentLiteral } from '../i18n/translations'
import { cn } from '../lib/cn'

type DialogProps = {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  eyebrow?: string
  children?: ReactNode
  footer?: ReactNode
  size?: 'md' | 'lg' | 'xl'
  tone?: 'default' | 'danger'
  headerIcon?: ReactNode
}

const sizeClasses = {
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

const FOCUSABLE_SELECTORS = [
  'button:not([disabled])',
  'input:not([disabled])',
  'textarea:not([disabled])',
  'select:not([disabled])',
  'a[href]',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

export function Dialog({
  open,
  onClose,
  title,
  description,
  eyebrow,
  children,
  footer,
  size = 'md',
  tone = 'default',
  headerIcon,
}: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose, open])

  useEffect(() => {
    if (!open || !dialogRef.current) return

    const previouslyFocused = document.activeElement as HTMLElement | null
    const focusableElements = Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS),
    )

    focusableElements[0]?.focus()

    function handleTab(event: KeyboardEvent) {
      if (event.key !== 'Tab' || !dialogRef.current) return

      const elements = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS),
      )
      const first = elements[0]
      const last = elements[elements.length - 1]

      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault()
          last?.focus()
        }
      } else {
        if (document.activeElement === last) {
          event.preventDefault()
          first?.focus()
        }
      }
    }

    window.addEventListener('keydown', handleTab)

    return () => {
      window.removeEventListener('keydown', handleTab)
      previouslyFocused?.focus()
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[80] grid place-items-center p-3 sm:p-6">
      {/* Backdrop */}
      <button
        type="button"
        aria-label={translateCurrentLiteral('Close dialog')}
        className="dialog-backdrop absolute inset-0 backdrop-blur-[2px]"
        onClick={onClose}
        tabIndex={-1}
      />

      {/* Panel */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          'dialog-content relative z-10 flex max-h-[calc(100vh-1.5rem)] w-full flex-col overflow-hidden sm:max-h-[calc(100vh-3rem)]',
          sizeClasses[size],
        )}
      >
        {/* Header */}
        <div className="dialog-divider flex items-start justify-between gap-4 border-b px-6 py-5">
          <div className="min-w-0 flex-1">
            {headerIcon ? (
              <div className="mb-3 text-[var(--muted)]">{headerIcon}</div>
            ) : null}
            {eyebrow ? (
              <p className="dialog-eyebrow mb-1 text-[11px] font-medium uppercase tracking-[0.12em]">
                {translateCurrentLiteral(eyebrow)}
              </p>
            ) : null}
            <h2
              id={titleId}
              className="text-[15px] font-semibold text-[var(--foreground)]"
            >
              {translateCurrentLiteral(title)}
            </h2>
            {description ? (
              <p className="mt-1.5 text-[13px] leading-5 text-[var(--muted)]">
                {translateCurrentLiteral(description)}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-[var(--muted)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--foreground)]',
              tone === 'danger' && 'hover:bg-[var(--danger-dim)] hover:text-[var(--danger-text)]',
            )}
            aria-label={translateCurrentLiteral('Close dialog panel')}
          >
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <path d="M4 4l8 8M12 4 4 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {children ? (
          <div className="overflow-y-auto px-6 py-5">
            {children}
          </div>
        ) : null}

        {footer ? (
          <div className="dialog-divider flex flex-wrap justify-end gap-2 border-t px-6 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}
