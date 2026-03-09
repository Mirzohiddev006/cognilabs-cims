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
  primary: 'border border-transparent bg-[var(--accent)] text-white shadow-sm hover:bg-[var(--accent-strong)]',
  secondary: 'border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] shadow-sm hover:bg-[var(--accent-soft)]',
  ghost: 'border border-transparent bg-transparent text-[var(--muted-strong)] hover:bg-[var(--accent-soft)] hover:text-[var(--foreground)]',
  danger: 'border border-transparent bg-[var(--danger)] text-white shadow-sm hover:bg-[#b91c1c]',
}

const sizes = {
  md: 'min-h-9 px-4 text-sm',
  lg: 'min-h-10 px-5 text-sm',
}

const baseClassName =
  'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2'

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
