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
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'action'
  size?: 'md' | 'lg'
  className?: string
  asChild?: boolean
  children: ReactNode
}

type ButtonProps = SharedButtonProps & ButtonHTMLAttributes<HTMLButtonElement>

const variants = {
  primary: 'border border-transparent bg-[var(--accent)] text-white shadow-lg shadow-blue-700/40 hover:bg-[var(--accent-strong)] hover:scale-[1.02] active:scale-[0.98]',
  secondary: 'border border-white/10 bg-white/5 text-white hover:bg-white/10 hover:scale-[1.02] active:scale-[0.98]',
  ghost: 'border border-transparent bg-transparent text-zinc-400 hover:bg-white/5 hover:text-white active:scale-[0.98]',
  danger: 'border border-transparent bg-rose-600 text-white shadow-lg shadow-rose-900/40 hover:bg-rose-700 active:scale-[0.98]',
  action: 'bg-white text-black hover:bg-zinc-200 hover:scale-[1.02] active:scale-[0.98] rounded-lg',
}

const sizes = {
  md: 'min-h-10 px-6 text-sm',
  lg: 'min-h-12 px-8 text-base',
}

const baseClassName =
  'inline-flex items-center justify-center gap-2 rounded-full font-bold text-xs uppercase tracking-wider transition-all duration-300 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black'

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
