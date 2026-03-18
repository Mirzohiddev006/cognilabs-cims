import type { HTMLAttributes } from 'react'
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
    'card-glass-variant card-base backdrop-blur-xl bg-white/3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]',

  metric:
    'card-base card-metric card-elevated',

  glow:
    'card-base card-glow shadow-[0_0_0_1px_rgba(59,130,246,0.15),0_4px_20px_rgba(0,0,0,0.28),0_0_32px_rgba(59,130,246,0.10)]',

  inset:
    'card-inset-variant rounded-xl border border-(--border) bg-(--card) shadow-[inset_0_1px_3px_rgba(0,0,0,0.12)]',
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