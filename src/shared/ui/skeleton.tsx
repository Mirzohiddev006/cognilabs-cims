import type { HTMLAttributes } from 'react'
import { cn } from '../lib/cn'

type SkeletonProps = HTMLAttributes<HTMLDivElement> & {
  /** Height class, e.g. "h-4", "h-8". Defaults to "h-4". */
  height?: string
  /** Width class, e.g. "w-24", "w-full". Defaults to "w-full". */
  width?: string
  /** Rounded corner class. Defaults to "rounded-md". */
  rounded?: string
}

export function Skeleton({
  className,
  height = 'h-4',
  width = 'w-full',
  rounded = 'rounded-md',
  ...props
}: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('skeleton', height, width, rounded, className)}
      {...props}
    />
  )
}

type SkeletonTextProps = {
  lines?: number
  className?: string
}

/** Renders N lines of skeleton text with a shorter last line. */
export function SkeletonText({ lines = 3, className }: SkeletonTextProps) {
  return (
    <div className={cn('space-y-2', className)} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          height="h-3"
          width={i === lines - 1 ? 'w-3/5' : 'w-full'}
        />
      ))}
    </div>
  )
}

type SkeletonCardProps = {
  className?: string
}

/** A metric card skeleton. */
export function SkeletonCard({ className }: SkeletonCardProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'rounded-xl border border-[var(--border)] bg-[var(--muted-surface)] p-5',
        className,
      )}
    >
      <Skeleton height="h-3" width="w-16" rounded="rounded-full" className="mb-3" />
      <Skeleton height="h-7" width="w-28" rounded="rounded-lg" className="mb-2" />
      <Skeleton height="h-2.5" width="w-20" rounded="rounded-full" />
    </div>
  )
}

type SkeletonTableProps = {
  rows?: number
  cols?: number
  className?: string
}

/** A data table skeleton. */
export function SkeletonTable({ rows = 5, cols = 4, className }: SkeletonTableProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]',
        className,
      )}
    >
      {/* Header row */}
      <div className="flex gap-4 border-b border-[var(--border)] bg-[var(--muted-surface)] px-4 py-3">
        {Array.from({ length: cols }, (_, i) => (
          <Skeleton key={i} height="h-2.5" width={i === 0 ? 'w-24' : 'w-16'} rounded="rounded-full" />
        ))}
      </div>
      {/* Data rows */}
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div
          key={rowIndex}
          className="flex gap-4 border-b border-[var(--border)] px-4 py-3.5 last:border-b-0"
        >
          {Array.from({ length: cols }, (_, colIndex) => (
            <Skeleton
              key={colIndex}
              height="h-3"
              width={colIndex === 0 ? 'w-32' : 'w-20'}
              rounded="rounded-full"
            />
          ))}
        </div>
      ))}
    </div>
  )
}
