/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { translateCurrent, translateCurrentLiteral } from '../i18n/translations'
import { cn } from '../lib/cn'
import { Button } from './button'

type Column<T> = {
  key: string
  header: ReactNode
  align?: 'left' | 'center' | 'right'
  width?: string
  minWidth?: string
  render: (row: T) => ReactNode
}

type DataTableProps<T> = {
  caption?: string
  columns: Column<T>[]
  rows: T[]
  getRowKey: (row: T) => string
  emptyState?: ReactNode
  pageSize?: number
  zebra?: boolean
  compact?: boolean
  onRowClick?: (row: T) => void
  className?: string
  fillHeight?: boolean
}

const alignClassName = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
}

function getColumnStyle<T>(column: Column<T>) {
  if (!column.width && !column.minWidth) {
    return undefined
  }

  return {
    width: column.width,
    minWidth: column.minWidth ?? column.width,
  }
}

function getVisiblePageItems(totalPages: number) {
  if (totalPages <= 6) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  return [1, 2, 3, 'ellipsis', totalPages - 1, totalPages] as const
}

function ChevronLeft() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 4L6 8l4 4" />
    </svg>
  )
}

function ChevronRight() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 4l4 4-4 4" />
    </svg>
  )
}

export function DataTable<T>({
  caption,
  columns,
  rows,
  getRowKey,
  emptyState,
  pageSize = 75,
  zebra = false,
  compact = false,
  onRowClick,
  className,
  fillHeight = false,
}: DataTableProps<T>) {
  const effectivePageSize = Math.max(1, pageSize > 0 ? pageSize : rows.length)
  const [currentPage, setCurrentPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(rows.length / effectivePageSize))

  useEffect(() => {
    setCurrentPage((current) => (current === 1 ? current : 1))
  }, [rows.length, effectivePageSize])

  useEffect(() => {
    setCurrentPage((current) => {
      const nextPage = Math.min(current, totalPages)
      return nextPage === current ? current : nextPage
    })
  }, [totalPages])

  const startIndex = (currentPage - 1) * effectivePageSize
  const endIndex = Math.min(startIndex + effectivePageSize, rows.length)
  const visibleRows = useMemo(() => rows.slice(startIndex, endIndex), [endIndex, rows, startIndex])
  const visiblePageItems = useMemo(() => getVisiblePageItems(totalPages), [totalPages])

  if (rows.length === 0) {
    return <>{emptyState ?? null}</>
  }

  const rowPadding = compact ? 'py-2.5 px-4' : 'py-3.5 px-4'
  const headPadding = compact ? 'py-2.5 px-4' : 'py-3 px-4'
  const localizedCaption = caption ? translateCurrentLiteral(caption) : null

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-sm)]',
        fillHeight && 'flex h-full min-h-0 flex-col',
        className,
      )}
    >
      <div className={cn('overflow-x-auto px-3 pb-2 sm:px-0 sm:pb-0', fillHeight && 'flex-1')}>
        <table className="w-full min-w-max border-collapse">
          {localizedCaption ? <caption className="sr-only">{localizedCaption}</caption> : null}

          <thead>
            <tr className="bg-[var(--muted-surface)]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={getColumnStyle(col)}
                  className={cn(
                    headPadding,
                    'ui-table-heading border-b border-[var(--border)] text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--caption)] whitespace-nowrap',
                    alignClassName[col.align ?? 'left'],
                  )}
                >
                  {typeof col.header === 'string' ? translateCurrentLiteral(col.header) : col.header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {visibleRows.map((row, rowIndex) => {
              const isEven = rowIndex % 2 === 0

              return (
                <tr
                  key={getRowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  onKeyDown={onRowClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRowClick(row) } } : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  role={onRowClick ? 'button' : undefined}
                  className={cn(
                    'table-row-hover group border-b border-[var(--border)] last:border-b-0',
                    zebra && isEven && 'bg-white/[0.012]',
                    onRowClick && 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/20',
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      style={getColumnStyle(col)}
                      className={cn(
                        rowPadding,
                        'text-sm font-medium text-[var(--foreground)] align-middle',
                        alignClassName[col.align ?? 'left'],
                        'group-hover:text-[var(--foreground)]',
                      )}
                    >
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="flex flex-col gap-3 border-t border-[var(--border)] bg-[var(--muted-surface)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[var(--caption)] sm:text-[13px]">
            {translateCurrent('common.results_range', '{{start}}-{{end}} of {{total}} results', {
              start: startIndex + 1,
              end: endIndex,
              total: rows.length,
            })}
          </p>

          <div className="flex flex-wrap items-center gap-1">
            <Button
              variant="ghost"
              size="md"
              className="px-2"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((current) => Math.max(1, current - 1))}
              aria-label={translateCurrent('common.previous_page', 'Previous page')}
            >
              <ChevronLeft />
            </Button>

            {visiblePageItems.map((item, index) => {
              if (item === 'ellipsis') {
                return (
                  <span
                    key={`ellipsis-${index}`}
                    className="inline-flex min-w-[28px] items-center justify-center px-1.5 text-sm text-[var(--caption)]"
                    aria-hidden="true"
                  >
                    ...
                  </span>
                )
              }

              return (
                <Button
                  key={item}
                  variant={item === currentPage ? 'secondary' : 'ghost'}
                  size="md"
                  className={cn(
                    'min-w-[28px] px-1.5',
                    item === currentPage && 'border-[var(--border-hover)] font-semibold text-white',
                  )}
                  onClick={() => setCurrentPage(item)}
                >
                  {item}
                </Button>
              )
            })}

            <Button
              variant="ghost"
              size="md"
              className="px-2"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((current) => Math.min(totalPages, current + 1))}
              aria-label={translateCurrent('common.next_page', 'Next page')}
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
