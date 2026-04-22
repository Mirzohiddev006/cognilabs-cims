import type { HTMLAttributes } from 'react'
import { cn } from '../lib/cn'

type CardVariant = 'default' | 'elevated' | 'glass' | 'metric' | 'glow' | 'inset'

type CardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: CardVariant
  noPadding?: boolean
}

const variantClasses: Record<CardVariant, string> = {
  default:  'card-base',
  elevated: 'card-base card-elevated',
  glass:    'card-glass-variant card-base',
  metric:   'card-base card-metric card-elevated',
  glow:     'card-base card-glow',
  inset:    'card-inset-variant rounded-[var(--radius-lg)] border border-[var(--border-solid)]',
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

export function CardHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-4 border-b border-[var(--border-solid)] px-5 py-4',
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
    <div className={cn('px-5 py-4', className)} {...props} />
  )
}

export function CardFooter({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'border-t border-[var(--border-solid)] px-5 py-3',
        className,
      )}
      {...props}
    />
  )
}
