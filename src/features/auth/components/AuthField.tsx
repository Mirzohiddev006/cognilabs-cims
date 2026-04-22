import type { InputHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../../shared/lib/cn'
import { Input } from '../../../shared/ui/input'

type AuthFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
  hint?: string
  leadingIcon?: ReactNode
}

export function AuthField({ label, error, hint, id, className, leadingIcon, ...props }: AuthFieldProps) {
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
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(leadingIcon ? 'pl-9' : null, className)}
          {...props}
        />
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
