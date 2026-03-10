import type { PropsWithChildren } from 'react'
import { cn } from '../lib/cn'

type BadgeProps = PropsWithChildren<{
  className?: string
  variant?: 'default' | 'secondary' | 'outline' | 'danger' | 'success'
}>

const variants = {
  default: 'border-transparent bg-white text-black',
  secondary: 'border-transparent bg-[var(--surface)] text-[var(--foreground)]',
  outline: 'border-[var(--border)] bg-transparent text-[var(--foreground)]',
  danger: 'border-transparent bg-[var(--danger)] text-white',
  success: 'border-transparent bg-[var(--success)] text-white',
}

export function Badge({ children, className, variant = 'outline' }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}
