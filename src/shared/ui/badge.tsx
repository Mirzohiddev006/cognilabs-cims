import type { PropsWithChildren } from 'react'
import { cn } from '../lib/cn'

type BadgeProps = PropsWithChildren<{
  className?: string
}>

export function Badge({ children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-cyan-500/30 bg-cyan-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-400',
        className,
      )}
    >
      {children}
    </span>
  )
}
