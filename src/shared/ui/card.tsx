import type { HTMLAttributes } from 'react'
import { cn } from '../lib/cn'

type CardProps = HTMLAttributes<HTMLDivElement>

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-[18px] border border-white/10 bg-[var(--card)] text-[var(--foreground)] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]',
        className,
      )}
      {...props}
    />
  )
}
