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
    <div className="overflow-hidden rounded-xl border border-white/5 bg-[#0f0f0f]">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead>
            <tr className="border-b border-white/5 bg-[#0f0f0f]">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    'px-6 py-4 text-[11px] font-medium text-zinc-500',
                    alignClassName[column.align ?? 'left'],
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((row) => (
              <tr
                key={getRowKey(row)}
                className="group text-white transition-colors hover:bg-white/[0.01]"
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      'px-6 py-4 text-[13px] font-medium text-zinc-300 group-hover:text-white transition-colors',
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
