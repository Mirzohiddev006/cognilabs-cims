import type { PropsWithChildren } from 'react'
import { translateCurrentLiteral } from '../i18n/translations'
import { cn } from '../lib/cn'

type BadgeVariant =
  | 'default'
  | 'secondary'
  | 'outline'
  | 'blue'
  | 'success'
  | 'warning'
  | 'danger'
  | 'violet'
  | 'ghost'

type BadgeSize = 'sm' | 'md'

type BadgeProps = PropsWithChildren<{
  className?: string
  variant?: BadgeVariant
  size?: BadgeSize
  dot?: boolean
  pulse?: boolean
}>

const variants: Record<BadgeVariant, string> = {
  default:
    'border-[var(--border-solid)] bg-[var(--tag-default-bg)] text-[var(--tag-default-text)]',

  secondary:
    'border-[var(--border-solid)] bg-[var(--background-alt)] text-[var(--muted-strong)]',

  outline:
    'border-[var(--border-solid)] bg-transparent text-[var(--muted)]',

  blue:
    'border-[var(--tag-blue-bg)] bg-[var(--tag-blue-bg)] text-[var(--tag-blue-text)]',

  success:
    'border-[var(--tag-green-bg)] bg-[var(--tag-green-bg)] text-[var(--tag-green-text)]',

  warning:
    'border-[var(--tag-yellow-bg)] bg-[var(--tag-yellow-bg)] text-[var(--tag-yellow-text)]',

  danger:
    'border-[var(--tag-red-bg)] bg-[var(--tag-red-bg)] text-[var(--tag-red-text)]',

  violet:
    'border-[var(--tag-purple-bg)] bg-[var(--tag-purple-bg)] text-[var(--tag-purple-text)]',

  ghost:
    'border-transparent bg-transparent text-[var(--muted)]',
}

const sizes: Record<BadgeSize, string> = {
  sm: 'px-1.5 py-0.5 text-[11px] rounded-[3px] gap-1',
  md: 'px-2 py-0.5 text-[12px] rounded-[3px] gap-1.5',
}

const dotColors: Record<BadgeVariant, string> = {
  default:  'bg-[var(--muted)]',
  secondary:'bg-[var(--muted)]',
  outline:  'bg-[var(--caption)]',
  blue:     'bg-[var(--tag-blue-text)]',
  success:  'bg-[var(--tag-green-text)]',
  warning:  'bg-[var(--tag-yellow-text)]',
  danger:   'bg-[var(--tag-red-text)]',
  violet:   'bg-[var(--tag-purple-text)]',
  ghost:    'bg-[var(--caption)]',
}

export function Badge({
  children,
  className,
  variant = 'outline',
  size = 'md',
  dot = false,
  pulse = false,
}: BadgeProps) {
  const localizedChildren = typeof children === 'string' ? translateCurrentLiteral(children) : children

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center border font-medium whitespace-nowrap',
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {dot ? (
        <span
          className={cn(
            'inline-block shrink-0 rounded-full',
            size === 'sm' ? 'h-1.5 w-1.5' : 'h-2 w-2',
            dotColors[variant],
            pulse && 'badge-pulse',
          )}
        />
      ) : null}
      {localizedChildren}
    </span>
  )
}

export function StatusBadge({
  status,
  className,
}: {
  status: string
  className?: string
}) {
  const normalized = status.toLowerCase().replace(/[^a-z]/g, '')

  const map: Record<string, BadgeVariant> = {
    active:      'success',
    online:      'success',
    paid:        'success',
    done:        'success',
    finished:    'success',
    success:     'success',
    pending:     'warning',
    inprocess:   'warning',
    processing:  'warning',
    waiting:     'warning',
    inactive:    'danger',
    failed:      'danger',
    rejected:    'danger',
    deleted:     'danger',
    error:       'danger',
    contacted:   'blue',
    continuing:  'violet',
  }

  const variant = map[normalized] ?? 'outline'

  return (
    <Badge variant={variant} dot className={className}>
      {status}
    </Badge>
  )
}
