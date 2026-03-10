import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  JSX,
  ReactElement,
  ReactNode,
} from 'react'
import { cloneElement, isValidElement } from 'react'
import { cn } from '../lib/cn'

type SharedButtonProps = {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'md' | 'lg'
  className?: string
  asChild?: boolean
  children: ReactNode
}

type ButtonProps = SharedButtonProps & ButtonHTMLAttributes<HTMLButtonElement>

const variants = {
  primary:
    'border border-white/5 bg-white text-black shadow-[0_10px_30px_rgba(255,255,255,0.06)] hover:bg-zinc-100',
  secondary:
    'border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-white/15 hover:bg-[var(--accent-soft)]',
  ghost:
    'border border-transparent bg-transparent text-[var(--muted-strong)] hover:border-white/10 hover:bg-[var(--accent-soft)] hover:text-[var(--foreground)]',
  danger:
    'border border-red-500/20 bg-[var(--danger)] text-white shadow-[0_10px_24px_rgba(239,68,68,0.22)] hover:bg-red-500',
}

const sizes = {
  md: 'min-h-9 px-3.5 py-2 text-[13px]',
  lg: 'min-h-10 px-5 py-2 text-sm',
}

const baseClassName =
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-[color,box-shadow,background-color,border-color,transform] active:translate-y-px disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/15 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]'

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  asChild = false,
  children,
  ...props
}: ButtonProps) {
  const combinedClassName = cn(baseClassName, variants[variant], sizes[size], className)

  if (asChild && isValidElement(children)) {
    const child = children as ReactElement<AnchorHTMLAttributes<HTMLAnchorElement>>

    return cloneElement(child, {
      className: cn(combinedClassName, child.props.className),
    } as Partial<JSX.IntrinsicElements['a']>)
  }

  return (
    <button className={combinedClassName} {...props}>
      {children}
    </button>
  )
}
