import type { HTMLAttributes } from 'react'
import { cn } from '../lib/cn'

type CardProps = HTMLAttributes<HTMLDivElement>

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl transition-all duration-300 hover:border-blue-500/30',
        className,
      )}
      {...props}
    />
  )
}
