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
      <span className="text-sm font-bold text-white tracking-tight">{label}</span>
      <div className="relative group">
        <Input
          id={inputId}
          type={visible ? 'text' : 'password'}
          className="pr-24"
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className={cn(
            'absolute right-3 top-1/2 -translate-y-1/2 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500 transition-all',
            'hover:bg-white/10 hover:text-white',
          )}
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
      {error ? <span className="text-xs font-bold text-rose-500 uppercase tracking-wider">{error}</span> : null}
      {!error && hint ? <span className="text-xs font-medium text-zinc-500">{hint}</span> : null}
    </label>
  )
}
