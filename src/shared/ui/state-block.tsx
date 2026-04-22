import type { ReactNode } from 'react'
import { translateCurrentLiteral } from '../i18n/translations'
import { Button } from './button'

type StateBlockProps = {
  eyebrow: string
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  tone?: 'loading' | 'empty' | 'error'
  children?: ReactNode
}

function LoadingDots() {
  return (
    <div className="flex items-center gap-1.5" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--caption)] animate-bounce"
          style={{ animationDelay: `${i * 120}ms`, animationDuration: '900ms' }}
        />
      ))}
    </div>
  )
}

function EmptyIllustration() {
  return (
    <svg
      className="h-10 w-10 text-[var(--caption)]"
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="8" y="10" width="32" height="28" rx="3" />
      <path d="M16 20h16M16 26h10" />
    </svg>
  )
}

function ErrorIllustration() {
  return (
    <svg
      className="h-10 w-10 text-[var(--danger)]"
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="24" cy="24" r="16" />
      <path d="M24 16v9M24 30v2" strokeWidth="2" />
    </svg>
  )
}

export function StateBlock({
  eyebrow,
  title,
  description,
  actionLabel,
  onAction,
  tone = 'empty',
  children,
}: StateBlockProps) {
  const isLoading = tone === 'loading'
  const isError   = tone === 'error'

  return (
    <div
      role={isLoading ? 'status' : isError ? 'alert' : undefined}
      aria-live={isLoading ? 'polite' : isError ? 'assertive' : undefined}
      className={
        isError
          ? 'flex flex-col items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--danger-border)] bg-[var(--danger-dim)] px-6 py-10 text-center'
          : 'flex flex-col items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--border-solid)] bg-[var(--background-alt)] px-6 py-10 text-center'
      }
    >
      <div className="mb-1">
        {isLoading ? (
          <LoadingDots />
        ) : isError ? (
          <ErrorIllustration />
        ) : (
          <EmptyIllustration />
        )}
      </div>

      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--caption)]">
          {translateCurrentLiteral(eyebrow)}
        </p>
        <h3 className={
          isError
            ? 'mt-2 text-[15px] font-semibold text-[var(--danger-text)]'
            : 'mt-2 text-[15px] font-semibold text-[var(--foreground)]'
        }>
          {translateCurrentLiteral(title)}
        </h3>
        <p className="mt-1.5 max-w-sm text-[13px] leading-5 text-[var(--muted)]">
          {translateCurrentLiteral(description)}
        </p>
      </div>

      {children ? <div className="mt-2">{children}</div> : null}

      {actionLabel && onAction ? (
        <Button variant="secondary" size="md" className="mt-2" onClick={onAction}>
          {translateCurrentLiteral(actionLabel)}
        </Button>
      ) : null}
    </div>
  )
}

export function LoadingStateBlock(props: Omit<StateBlockProps, 'tone'>) {
  return <StateBlock {...props} tone="loading" />
}

export function EmptyStateBlock(props: Omit<StateBlockProps, 'tone'>) {
  return <StateBlock {...props} tone="empty" />
}

export function ErrorStateBlock(props: Omit<StateBlockProps, 'tone'>) {
  return <StateBlock {...props} tone="error" />
}
