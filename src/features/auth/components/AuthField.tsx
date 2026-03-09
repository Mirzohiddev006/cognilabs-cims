import type { InputHTMLAttributes } from 'react'
import { Input } from '../../../shared/ui/input'

type AuthFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
  hint?: string
}

export function AuthField({ label, error, hint, id, ...props }: AuthFieldProps) {
  const inputId = id ?? props.name

  return (
    <label className="grid gap-2" htmlFor={inputId}>
      <span className="text-sm font-medium text-[var(--foreground)]">{label}</span>
      <Input id={inputId} {...props} />
      {error ? <span className="text-sm text-red-600">{error}</span> : null}
      {!error && hint ? <span className="text-xs text-[var(--muted)]">{hint}</span> : null}
    </label>
  )
}
