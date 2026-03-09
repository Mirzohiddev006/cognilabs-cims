import type { InputHTMLAttributes } from 'react'
import { cn } from '../lib/cn'

type InputProps = InputHTMLAttributes<HTMLInputElement>

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        'min-h-10 w-full rounded-md border border-[var(--border)] bg-white px-3 text-sm text-[var(--foreground)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgba(15,23,42,0.08)]',
        className,
      )}
      {...props}
    />
  )
}
