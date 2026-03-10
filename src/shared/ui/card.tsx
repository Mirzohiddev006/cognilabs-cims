import type { HTMLAttributes } from 'react'
import { cn } from '../lib/cn'

type CardProps = HTMLAttributes<HTMLDivElement>

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-white/5 bg-[#0f0f0f] shadow-2xl transition-all duration-300',
        className,
      )}
      {...props}
    />
  )
}
