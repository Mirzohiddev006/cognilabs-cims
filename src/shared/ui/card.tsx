import type { HTMLAttributes } from 'react'
import { cn } from '../lib/cn'

type CardVariant = 'default' | 'elevated' | 'glass' | 'metric' | 'glow' | 'inset' | 'gray' | 'brown' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink' | 'red'

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
  gray:     'card-base bg-[var(--tag-gray-bg)] text-[var(--tag-gray-text)] border-[var(--tag-gray-bg)] hover:bg-[var(--tag-gray-bg)]/90',
  brown:    'card-base bg-[var(--tag-brown-bg)] text-[var(--tag-brown-text)] border-[var(--tag-brown-bg)] hover:bg-[var(--tag-brown-bg)]/90',
  orange:   'card-base bg-[var(--tag-orange-bg)] text-[var(--tag-orange-text)] border-[var(--tag-orange-bg)] hover:bg-[var(--tag-orange-bg)]/90',
  yellow:   'card-base bg-[var(--tag-yellow-bg)] text-[var(--tag-yellow-text)] border-[var(--tag-yellow-bg)] hover:bg-[var(--tag-yellow-bg)]/90',
  green:    'card-base bg-[var(--tag-green-bg)] text-[var(--tag-green-text)] border-[var(--tag-green-bg)] hover:bg-[var(--tag-green-bg)]/90',
  blue:     'card-base bg-[var(--tag-blue-bg)] text-[var(--tag-blue-text)] border-[var(--tag-blue-bg)] hover:bg-[var(--tag-blue-bg)]/90',
  purple:   'card-base bg-[var(--tag-purple-bg)] text-[var(--tag-purple-text)] border-[var(--tag-purple-bg)] hover:bg-[var(--tag-purple-bg)]/90',
  pink:     'card-base bg-[var(--tag-pink-bg)] text-[var(--tag-pink-text)] border-[var(--tag-pink-bg)] hover:bg-[var(--tag-pink-bg)]/90',
  red:      'card-base bg-[var(--tag-red-bg)] text-[var(--tag-red-text)] border-[var(--tag-red-bg)] hover:bg-[var(--tag-red-bg)]/90',
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
