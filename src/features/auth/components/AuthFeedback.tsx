import { cn } from '../../../shared/lib/cn'

type AuthFeedbackProps = {
  tone?: 'error' | 'success' | 'info'
  message?: string | null
}

const toneClasses = {
  error:   'border-[var(--danger-border)] bg-[var(--danger-dim)] text-[var(--danger-text)]',
  success: 'border-[var(--success-border)] bg-[var(--success-dim)] text-[var(--success-text)]',
  info:    'border-[var(--border-solid)] bg-[var(--background-alt)] text-[var(--muted)]',
}

export function AuthFeedback({ tone = 'info', message }: AuthFeedbackProps) {
  if (!message) return null

  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      aria-live={tone === 'error' ? 'assertive' : 'polite'}
      className={cn('rounded-[var(--radius-md)] border px-3 py-2.5 text-[13px] leading-5', toneClasses[tone])}
    >
      {message}
    </div>
  )
}
