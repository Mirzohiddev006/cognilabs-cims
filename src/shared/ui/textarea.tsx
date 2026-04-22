import type { TextareaHTMLAttributes } from 'react'
import { cn } from '../lib/cn'

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        'min-h-24 w-full rounded-[var(--radius-md)] border border-[var(--border-solid)] bg-[var(--input-surface)] px-3 py-2',
        'text-[14px] leading-6 text-[var(--foreground)]',
        'placeholder:text-[var(--caption)]',
        'outline-none resize-y',
        'transition-[border-color] duration-100',
        'hover:border-[var(--border-hover)]',
        'focus:border-[var(--border-focus)] focus:ring-1 focus:ring-[var(--border-focus)]',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[var(--background-alt)]',
        className,
      )}
      {...props}
    />
  )
}
