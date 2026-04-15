import type { InputHTMLAttributes, ReactNode } from 'react'
import { useState } from 'react'
import { useLocale } from '../../../app/hooks/useLocale'
import { cn } from '../../../shared/lib/cn'
import { Input } from '../../../shared/ui/input'

type PasswordFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: string
  error?: string
  hint?: string
  leadingIcon?: ReactNode
}

export function PasswordField({ label, error, hint, id, className, leadingIcon, ...props }: PasswordFieldProps) {
  const { t } = useLocale()
  const [visible, setVisible] = useState(false)
  const inputId = id ?? props.name
  const errorId = error ? `${inputId}-error` : undefined
  const hintId = hint && !error ? `${inputId}-hint` : undefined
  const describedBy = errorId ?? hintId

  return (
    <label className="grid gap-2" htmlFor={inputId}>
      {label ? (
        <span className="text-xs font-bold text-[var(--foreground)] tracking-tight">{label}</span>
      ) : null}
      <div className="relative group">
        {leadingIcon ? (
          <span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-[var(--muted)]">
            {leadingIcon}
          </span>
        ) : null}
        <Input
          id={inputId}
          type={visible ? 'text' : 'password'}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            'pr-14',
            leadingIcon ? 'pl-10' : null,
            error
              ? 'border-rose-500/50 focus:border-rose-500/70 focus:shadow-[inset_0_1px_2px_rgba(0,0,0,0.12),0_0_0_3px_rgba(239,68,68,0.12)]'
              : null,
            className,
          )}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? t('auth.password.hide', 'Hide password') : t('auth.password.show', 'Show password')}
          aria-pressed={visible}
          className={cn(
            'absolute right-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-[var(--muted)] transition-all',
            'hover:bg-[var(--accent-soft)] hover:text-[var(--foreground)]',
          )}
        >
          {visible ? (
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4.5 w-4.5">
              <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6Z" />
              <circle cx="12" cy="12" r="2.75" />
              <line x1="3" y1="3" x2="21" y2="21" strokeWidth="1.8" />
            </svg>
          ) : (
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4.5 w-4.5">
              <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6Z" />
              <circle cx="12" cy="12" r="2.75" />
            </svg>
          )}
        </button>
      </div>
      {error ? (
        <span id={errorId} role="alert" className="text-[11px] font-bold text-rose-500 uppercase tracking-wider">
          {error}
        </span>
      ) : null}
      {!error && hint ? (
        <span id={hintId} className="text-[11px] font-medium text-[var(--muted)]">
          {hint}
        </span>
      ) : null}
    </label>
  )
}
