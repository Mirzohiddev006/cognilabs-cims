import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../lib/cn'

type CardVariant = 'default' | 'elevated' | 'glass' | 'metric' | 'glow' | 'inset'

type CardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: CardVariant
  noPadding?: boolean
}

const variantClasses: Record<CardVariant, string> = {
  default:
    'card-base',

  elevated:
    'card-base card-elevated',

  glass:
    'card-glass-variant card-base backdrop-blur-xl bg-white/3',

  metric:
    'card-base card-metric card-elevated',

  glow:
    'card-base card-glow',

  inset:
    'card-inset-variant rounded-xl border border-(--border) bg-(--card)',
}

export function Card({
  className,
  variant = 'default',
  noPadding = false,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        variantClasses[variant],
        !noPadding && 'p-5',
        className,
      )}
      {...props}
    />
  )
}

/* ─── Compound sub-components ─────────────────────────── */
export function CardHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-4 border-b border-(--border) px-5 py-5',
        className,
      )}
      {...props}
    />
  )
}

export function CardBody({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-5 py-5', className)} {...props} />
  )
}

export function CardFooter({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'border-t border-(--border) px-5 py-4',
        className,
      )}
      {...props}
    />
  )
}

/**
 * CardSection — a divider-separated panel inside a single Card.
 *
 * Use this to flatten "card-in-card-in-card" layouts: stack multiple sections
 * inside ONE Card (with `noPadding`) and let the section borders render the
 * visual seams instead of nesting bordered boxes.
 */
type CardSectionProps = HTMLAttributes<HTMLElement> & {
  title?: ReactNode
  eyebrow?: ReactNode
  description?: ReactNode
  headerAction?: ReactNode
  bleed?: boolean
  divider?: boolean
}

export function CardSection({
  className,
  title,
  eyebrow,
  description,
  headerAction,
  bleed = false,
  divider = true,
  children,
  ...props
}: CardSectionProps) {
  const hasHeader = Boolean(title || eyebrow || headerAction || description)

  return (
    <section
      className={cn(
        divider && 'border-t border-(--border) first:border-t-0',
        !bleed && 'px-5 py-5 sm:px-6 sm:py-6',
        className,
      )}
      {...props}
    >
      {hasHeader ? (
        <header className={cn('flex flex-wrap items-start justify-between gap-3', !bleed && 'mb-4')}>
          <div className="min-w-0">
            {eyebrow ? (
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-(--muted)">
                {eyebrow}
              </p>
            ) : null}
            {title ? (
              <h3 className={cn('text-lg font-semibold tracking-tight text-(--foreground)', Boolean(eyebrow) && 'mt-1')}>
                {title}
              </h3>
            ) : null}
          </div>
          {headerAction ? <div className="flex flex-wrap items-center gap-2">{headerAction}</div> : null}
        </header>
      ) : null}
      {children}
    </section>
  )
}

/**
 * CardMetric — borderless inline metric for stat grids inside a Card.
 *
 * Replaces the bordered DetailStatTile when used inside a Card section.
 * A vertical accent rule on the left provides separation without nesting.
 */
type CardMetricTone = 'default' | 'success' | 'danger' | 'blue' | 'warning'

type CardMetricProps = {
  label: ReactNode
  value: ReactNode
  hint?: ReactNode
  tone?: CardMetricTone
  className?: string
}

const cardMetricToneText: Record<CardMetricTone, string> = {
  default: 'text-(--foreground)',
  success: 'text-(--success-text)',
  danger: 'text-(--danger-text)',
  blue: 'text-(--blue-text)',
  warning: 'text-(--warning-text)',
}

const cardMetricToneRule: Record<CardMetricTone, string> = {
  default: 'before:bg-(--border)',
  success: 'before:bg-(--success-text)',
  danger: 'before:bg-(--danger-text)',
  blue: 'before:bg-(--blue-text)',
  warning: 'before:bg-(--warning-text)',
}

export function CardMetric({ label, value, hint, tone = 'default', className }: CardMetricProps) {
  return (
    <div
      className={cn(
        'relative pl-3 before:absolute before:left-0 before:top-1 before:bottom-1 before:w-[2px] before:rounded-full',
        cardMetricToneRule[tone],
        className,
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-(--muted)">
        {label}
      </p>
      <p className={cn('mt-1.5 text-[1.1rem] font-semibold tracking-tight tabular-nums', cardMetricToneText[tone])}>
        {value}
      </p>
      {hint ? <p className="mt-1 text-[11px] text-(--muted-strong)">{hint}</p> : null}
    </div>
  )
}
