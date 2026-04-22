import type { InputHTMLAttributes } from 'react'
import { cn } from '../lib/cn'

type InputProps = InputHTMLAttributes<HTMLInputElement>

export function Input({ className, 'aria-invalid': ariaInvalid, ...props }: InputProps) {
  return (
    <input
      aria-invalid={ariaInvalid}
      className={cn(
        'min-h-[34px] w-full rounded-[var(--radius-md)] border border-[var(--border-solid)] bg-[var(--input-surface)] px-3 py-1.5',
        'text-[14px] text-[var(--foreground)]',
        'placeholder:text-[var(--caption)]',
        'outline-none',
        'transition-[border-color,box-shadow] duration-100',
        'hover:border-[var(--border-hover)]',
        'focus:border-[var(--border-focus)] focus:ring-1 focus:ring-[var(--border-focus)]',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[var(--background-alt)]',
        ariaInvalid === true || ariaInvalid === 'true'
          ? 'border-[var(--danger)] focus:border-[var(--danger)] focus:ring-[var(--danger)]'
          : null,
        className,
      )}
      {...props}
    />
  )
}
