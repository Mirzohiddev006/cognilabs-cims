import type { InputHTMLAttributes } from 'react'
import { cn } from '../lib/cn'

type InputProps = InputHTMLAttributes<HTMLInputElement>

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        'min-h-10 w-full rounded-md border border-[var(--border)] bg-[var(--input-surface)] px-3 py-2 text-sm text-[var(--foreground)] shadow-sm outline-none transition-[color,box-shadow,border-color] placeholder:text-[var(--muted)] focus:border-white/15 focus:ring-2 focus:ring-white/10 disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...props}
    />
  )
}
