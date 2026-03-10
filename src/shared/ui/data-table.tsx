import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { cn } from '../lib/cn'
import { Button } from './button'

type Column<T> = {
  key: string
  header: ReactNode
  align?: 'left' | 'center' | 'right'
  render: (row: T) => ReactNode
}

type DataTableProps<T> = {
  caption?: string
  columns: Column<T>[]
  rows: T[]
  getRowKey: (row: T) => string
  emptyState?: ReactNode
  pageSize?: number
}

const alignClassName = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
}

function getVisiblePageNumbers(currentPage: number, totalPages: number) {
  const maxVisiblePages = 5
  const halfWindow = Math.floor(maxVisiblePages / 2)
  let start = Math.max(1, currentPage - halfWindow)
  let end = Math.min(totalPages, start + maxVisiblePages - 1)

  if (end - start + 1 < maxVisiblePages) {
    start = Math.max(1, end - maxVisiblePages + 1)
  }

  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}

export function DataTable<T>({
  caption,
  columns,
  rows,
  getRowKey,
  emptyState,
  pageSize = 10,
}: DataTableProps<T>) {
  const effectivePageSize = Math.max(1, pageSize > 0 ? pageSize : rows.length)
  const [currentPage, setCurrentPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(rows.length / effectivePageSize))

  useEffect(() => {
    setCurrentPage(1)
  }, [rows.length, effectivePageSize])

  useEffect(() => {
    setCurrentPage((current) => Math.min(current, totalPages))
  }, [totalPages])

  const startIndex = (currentPage - 1) * effectivePageSize
  const endIndex = Math.min(startIndex + effectivePageSize, rows.length)
  const visibleRows = useMemo(
    () => rows.slice(startIndex, endIndex),
    [endIndex, rows, startIndex],
  )
  const visiblePageNumbers = useMemo(
    () => getVisiblePageNumbers(currentPage, totalPages),
    [currentPage, totalPages],
  )

  if (rows.length === 0) {
    return <>{emptyState ?? null}</>
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead>
            <tr className="bg-[var(--muted-surface)]">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    'h-10 border-b border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--muted)] whitespace-nowrap',
                    alignClassName[column.align ?? 'left'],
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr
                key={getRowKey(row)}
                className="group transition-colors hover:bg-[var(--accent-soft)]"
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      'border-b border-[var(--border)] px-4 py-3 text-sm font-medium text-[var(--foreground)] align-middle',
                      alignClassName[column.align ?? 'left'],
                    )}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="flex flex-col gap-3 border-t border-[var(--border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[var(--muted)]">
            Showing {startIndex + 1}-{endIndex} of {rows.length}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              className="min-h-8 px-3 text-xs"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((current) => Math.max(1, current - 1))}
            >
              Prev
            </Button>

            {visiblePageNumbers.map((pageNumber) => (
              <Button
                key={pageNumber}
                type="button"
                variant={pageNumber === currentPage ? 'secondary' : 'ghost'}
                className="min-h-8 min-w-8 px-2 text-xs"
                onClick={() => setCurrentPage(pageNumber)}
              >
                {pageNumber}
              </Button>
            ))}

            <Button
              type="button"
              variant="ghost"
              className="min-h-8 px-3 text-xs"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((current) => Math.min(totalPages, current + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
