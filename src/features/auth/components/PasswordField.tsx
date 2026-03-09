import type { InputHTMLAttributes } from 'react'
import { useState } from 'react'
import { cn } from '../../../shared/lib/cn'
import { Input } from '../../../shared/ui/input'

type PasswordFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: string
  error?: string
  hint?: string
}

export function PasswordField({ label, error, hint, id, ...props }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)
  const inputId = id ?? props.name

  return (
    <label className="grid gap-2" htmlFor={inputId}>
      <span className="text-sm font-medium text-[var(--foreground)]">{label}</span>
      <div className="relative">
        <Input
          id={inputId}
          type={visible ? 'text' : 'password'}
          className="pr-20"
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className={cn(
            'absolute right-2 top-1/2 -translate-y-1/2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]',
            'hover:bg-[var(--accent-soft)] hover:text-[var(--accent-strong)]',
          )}
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
      {error ? <span className="text-sm text-red-600">{error}</span> : null}
      {!error && hint ? <span className="text-xs text-[var(--muted)]">{hint}</span> : null}
    </label>
  )
}
