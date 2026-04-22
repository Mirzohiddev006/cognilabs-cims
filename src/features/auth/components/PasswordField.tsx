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
    <label className="grid gap-1.5" htmlFor={inputId}>
      {label ? (
        <span className="text-[13px] font-medium text-[var(--foreground)]">{label}</span>
      ) : null}
      <div className="relative">
        {leadingIcon ? (
          <span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-[var(--caption)]">
            {leadingIcon}
          </span>
        ) : null}
        <Input
          id={inputId}
          type={visible ? 'text' : 'password'}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn('pr-10', leadingIcon ? 'pl-9' : null, className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((c) => !c)}
          aria-label={visible ? t('auth.password.hide', 'Hide password') : t('auth.password.show', 'Show password')}
          aria-pressed={visible}
          className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-[var(--radius-md)] text-[var(--caption)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--foreground)]"
        >
          {visible ? (
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6Z" />
              <circle cx="12" cy="12" r="2.75" />
              <line x1="3" y1="3" x2="21" y2="21" />
            </svg>
          ) : (
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6Z" />
              <circle cx="12" cy="12" r="2.75" />
            </svg>
          )}
        </button>
      </div>
      {error ? (
        <span id={errorId} role="alert" className="text-[12px] text-[var(--danger-text)]">
          {error}
        </span>
      ) : null}
      {!error && hint ? (
        <span id={hintId} className="text-[12px] text-[var(--muted)]">
          {hint}
        </span>
      ) : null}
    </label>
  )
}
