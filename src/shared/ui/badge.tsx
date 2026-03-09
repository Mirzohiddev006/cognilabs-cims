import type { PropsWithChildren } from 'react'
import { cn } from '../lib/cn'

type BadgeProps = PropsWithChildren<{
  className?: string
}>

export function Badge({ children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--accent-soft)] px-2 py-0.5 text-xs font-medium text-[var(--foreground)]',
        className,
      )}
    >
      {children}
    </span>
  )
}
