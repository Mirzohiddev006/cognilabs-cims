import type { HTMLAttributes } from 'react'
import { cn } from '../lib/cn'

type SkeletonProps = HTMLAttributes<HTMLDivElement> & {
  height?: string
  width?: string
  rounded?: string
}

export function Skeleton({
  className,
  height = 'h-4',
  width = 'w-full',
  rounded = 'rounded-[var(--radius-md)]',
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

export function SkeletonCard({ className }: SkeletonCardProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'rounded-[var(--radius-lg)] border border-[var(--border-solid)] bg-[var(--background-alt)] p-5',
        className,
      )}
    >
      <Skeleton height="h-3" width="w-20" rounded="rounded-full" className="mb-4" />
      <Skeleton height="h-7" width="w-28" rounded="rounded-[var(--radius-md)]" className="mb-2.5" />
      <Skeleton height="h-2.5" width="w-16" rounded="rounded-full" />
    </div>
  )
}

type SkeletonTableProps = {
  rows?: number
  cols?: number
  className?: string
}

export function SkeletonTable({ rows = 5, cols = 4, className }: SkeletonTableProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-solid)] bg-[var(--card)]',
        className,
      )}
    >
      <div className="flex gap-4 border-b border-[var(--border-solid)] bg-[var(--background-alt)] px-4 py-3">
        {Array.from({ length: cols }, (_, i) => (
          <Skeleton key={i} height="h-2.5" width={i === 0 ? 'w-24' : 'w-16'} rounded="rounded-full" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div
          key={rowIndex}
          className="flex gap-4 border-b border-[var(--border-solid)] px-4 py-3.5 last:border-b-0"
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
