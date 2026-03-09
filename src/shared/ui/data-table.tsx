import type { ReactNode } from 'react'
import { cn } from '../lib/cn'

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
}

const alignClassName = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
}

export function DataTable<T>({
  caption,
  columns,
  rows,
  getRowKey,
  emptyState,
}: DataTableProps<T>) {
  if (rows.length === 0) {
    return <>{emptyState ?? null}</>
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--accent-soft)]">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    'border-r border-[var(--border)] px-4 py-3 text-xs font-medium text-[var(--muted)] last:border-r-0',
                    alignClassName[column.align ?? 'left'],
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={getRowKey(row)}
                className="border-b border-[var(--border)] text-[var(--foreground)] transition-colors hover:bg-[var(--accent-soft)]/60 last:border-b-0"
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      'border-r border-[var(--border)] px-4 py-3 text-sm text-[var(--muted-strong)] last:border-r-0',
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
    </div>
  )
}
