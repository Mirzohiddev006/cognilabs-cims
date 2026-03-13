import type { TextareaHTMLAttributes } from 'react'
import { cn } from '../lib/cn'

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        'min-h-24 w-full rounded-md border border-[var(--border)] bg-[var(--input-surface)] px-3 py-2 text-xs text-[var(--foreground)] shadow-sm outline-none transition-[color,box-shadow,border-color] placeholder:text-[var(--muted)] focus:border-white/15 focus:ring-2 focus:ring-white/10',
        className,
      )}
      {...props}
    />
  )
}
