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
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  asChild?: boolean
  loading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  children: ReactNode
}

type ButtonProps = SharedButtonProps & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>

const variants = {
  primary:
    'bg-[var(--foreground)] text-[var(--background)] border border-[var(--foreground)] ' +
    'hover:bg-[var(--muted-strong)] hover:border-[var(--muted-strong)] ' +
    'active:opacity-90',

  secondary:
    'bg-[var(--background)] text-[var(--foreground)] border border-[var(--border-solid)] ' +
    'hover:bg-[var(--accent-soft)] ' +
    'active:bg-[var(--accent-hover)]',

  ghost:
    'bg-transparent text-[var(--muted)] border border-transparent ' +
    'hover:bg-[var(--accent-soft)] hover:text-[var(--foreground)]',

  danger:
    'bg-[var(--danger-dim)] text-[var(--danger-text)] border border-[var(--danger-border)] ' +
    'hover:bg-[var(--danger-dim)] hover:border-[var(--danger-text)]',

  success:
    'bg-[var(--success-dim)] text-[var(--success-text)] border border-[var(--success-border)] ' +
    'hover:bg-[var(--success-strong)]',
}

const sizes = {
  sm: 'min-h-[26px] px-2.5 py-0.5 text-[12px] rounded-[4px] gap-1.5',
  md: 'min-h-[32px] px-3 py-1.5 text-[13px] rounded-[6px] gap-1.5',
  lg: 'min-h-[36px] px-4 py-2 text-[14px] rounded-[6px] gap-2',
}

const baseClassName =
  'inline-flex items-center justify-center font-medium ' +
  'transition-colors duration-100 ' +
  'disabled:pointer-events-none disabled:opacity-40 ' +
  'focus-visible:outline-none focus-visible:ring-2 ' +
  'focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-1 ' +
  'focus-visible:ring-offset-[var(--background)]'

function Spinner({ size }: { size: 'sm' | 'md' | 'lg' }) {
  const dim = size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-4 w-4' : 'h-3.5 w-3.5'

  return (
    <svg
      className={cn(dim, 'animate-spin shrink-0')}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12" cy="12" r="10"
        stroke="currentColor" strokeWidth="3"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  asChild = false,
  loading = false,
  leftIcon,
  rightIcon,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const combinedClassName = cn(
    baseClassName,
    variants[variant],
    sizes[size],
    className,
  )

  if (asChild && isValidElement(children)) {
    const child = children as ReactElement<AnchorHTMLAttributes<HTMLAnchorElement>>

    return cloneElement(child, {
      className: cn(combinedClassName, child.props.className),
    } as Partial<JSX.IntrinsicElements['a']>)
  }

  return (
    <button
      className={combinedClassName}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <Spinner size={size} />
      ) : leftIcon ? (
        <span className="shrink-0">{leftIcon}</span>
      ) : null}

      {children}

      {!loading && rightIcon ? (
        <span className="shrink-0">{rightIcon}</span>
      ) : null}
    </button>
  )
}
