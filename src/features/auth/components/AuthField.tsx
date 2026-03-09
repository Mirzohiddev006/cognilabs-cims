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
      <span className="text-sm font-bold text-white tracking-tight">{label}</span>
      <Input id={inputId} {...props} />
      {error ? <span className="text-xs font-bold text-rose-500 uppercase tracking-wider">{error}</span> : null}
      {!error && hint ? <span className="text-xs font-medium text-zinc-500">{hint}</span> : null}
    </label>
  )
}
