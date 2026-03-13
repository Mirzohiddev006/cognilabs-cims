import type { HTMLAttributes } from 'react'
import { cn } from '../lib/cn'

type CardProps = HTMLAttributes<HTMLDivElement>

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-white/10 bg-[var(--card)] text-[var(--foreground)] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-shadow hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_4px_20px_rgba(0,0,0,0.15)]',
        className,
      )}
      {...props}
    />
  )
}
