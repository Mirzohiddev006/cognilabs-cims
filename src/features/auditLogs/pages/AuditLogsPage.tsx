import { useMemo, useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { cn } from '../../../shared/lib/cn'
import { useAsyncData } from '../../../shared/hooks/useAsyncData'
import { useToast } from '../../../shared/toast/useToast'
import { getApiErrorMessage } from '../../../shared/lib/api-error'
import { PageHeader } from '../../../shared/ui/page-header'
import { Button } from '../../../shared/ui/button'
import { Input } from '../../../shared/ui/input'
import { LoadingStateBlock, ErrorStateBlock, EmptyStateBlock } from '../../../shared/ui/state-block'
import { auditService, type AuditLogItem, type AuditLogsParams } from '../../../shared/api/services/audit.service'

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'border-green-400/30 bg-green-500/10 text-green-400',
  UPDATE: 'border-blue-400/30 bg-blue-500/10 text-blue-400',
  DELETE: 'border-red-400/30 bg-red-500/10 text-red-400',
  LOGIN: 'border-purple-400/30 bg-purple-500/10 text-purple-400',
  LOGOUT: 'border-yellow-400/30 bg-yellow-500/10 text-yellow-400',
}

function actionBadgeClass(action: string | null) {
  if (!action) return 'border-[var(--border)] bg-[var(--muted-surface)] text-[var(--muted)]'
  const upper = action.toUpperCase()
  for (const [key, cls] of Object.entries(ACTION_COLORS)) {
    if (upper.includes(key)) return cls
  }
  return 'border-[var(--border)] bg-[var(--muted-surface)] text-[var(--muted)]'
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
}

function DataDiff({ before, after, changed }: { before: Record<string, unknown> | null; after: Record<string, unknown> | null; changed: string[] | null }) {
  const fields = changed?.length ? changed : Object.keys({ ...before, ...after })
  if (!fields.length) return <p className="text-xs text-[var(--muted)]">No field changes recorded.</p>

  return (
    <div className="space-y-2">
      {fields.map((field) => {
        const prev = before?.[field]
        const next = after?.[field]
        return (
          <div key={field} className="rounded-lg border border-[var(--border)] bg-[var(--muted-surface)] p-2 text-xs">
            <p className="font-mono font-semibold text-[var(--foreground)]">{field}</p>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <div>
                <p className="text-[var(--muted)] uppercase tracking-wide text-[9px] mb-1">Before</p>
                <p className={cn('break-all rounded px-1.5 py-1', prev !== undefined && prev !== null ? 'bg-red-500/10 text-red-300' : 'text-[var(--muted)] italic')}>
                  {prev !== undefined && prev !== null ? JSON.stringify(prev) : 'null'}
                </p>
              </div>
              <div>
                <p className="text-[var(--muted)] uppercase tracking-wide text-[9px] mb-1">After</p>
                <p className={cn('break-all rounded px-1.5 py-1', next !== undefined && next !== null ? 'bg-green-500/10 text-green-300' : 'text-[var(--muted)] italic')}>
                  {next !== undefined && next !== null ? JSON.stringify(next) : 'null'}
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function LogDetailModal({ log, onClose }: { log: AuditLogItem; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold">Audit Log #{log.id}</h3>
            <p className="mt-0.5 text-xs text-[var(--muted)]">{formatDate(log.created_at)}</p>
          </div>
          <button type="button" onClick={onClose} className="shrink-0 rounded-lg p-1.5 hover:bg-[var(--accent-soft)] text-[var(--muted)]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5 sm:grid-cols-3">
          {[
            { label: 'Action', value: log.action },
            { label: 'Module', value: log.module },
            { label: 'Table', value: log.table_name },
            { label: 'Entity', value: log.entity_type },
            { label: 'Entity ID', value: log.entity_id },
            { label: 'Actor', value: log.actor_name || log.actor_email || `#${log.actor_user_id}` },
            { label: 'IP', value: log.ip_address },
            { label: 'System Action', value: log.is_system_action ? 'Yes' : 'No' },
          ].map((row) => (
            <div key={row.label} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">{row.label}</p>
              <p className="mt-1 text-xs font-medium text-[var(--foreground)] break-all">{row.value || '—'}</p>
            </div>
          ))}
        </div>

        {log.summary ? (
          <div className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
            <p className="text-[10px] uppercase tracking-wide text-[var(--muted)] mb-1">Summary</p>
            <p className="text-sm text-[var(--foreground)]">{log.summary}</p>
          </div>
        ) : null}

        <div>
          <p className="mb-3 text-[10px] uppercase tracking-wide text-[var(--muted)]">Field Changes</p>
          <DataDiff before={log.before_data} after={log.after_data} changed={log.changed_fields} />
        </div>
      </div>
    </div>
  )
}

const ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT']
const PAGE_SIZES = [25, 50, 100, 200]

export function AuditLogsPage() {
  const { showToast } = useToast()
  const [searchParams] = useSearchParams()

  const [params, setParams] = useState<AuditLogsParams>({ page: 1, page_size: 50 })
  const [filters, setFilters] = useState({
    module: searchParams.get('module') || '',
    table_name: searchParams.get('table_name') || '',
    entity_type: searchParams.get('entity_type') || '',
    entity_id: searchParams.get('entity_id') || '',
    action: searchParams.get('action') || '',
    actor_user_id: searchParams.get('actor_user_id') || '',
    from_date: searchParams.get('date_from') || '',
    to_date: searchParams.get('date_to') || '',
  })
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null)

  // Update filters if search params change (e.g. from navigation)
  useEffect(() => {
    if (searchParams.size > 0) {
      setFilters({
        module: searchParams.get('module') || '',
        table_name: searchParams.get('table_name') || '',
        entity_type: searchParams.get('entity_type') || '',
        entity_id: searchParams.get('entity_id') || '',
        action: searchParams.get('action') || '',
        actor_user_id: searchParams.get('actor_user_id') || '',
        from_date: searchParams.get('date_from') || '',
        to_date: searchParams.get('date_to') || '',
      })
      setParams((prev) => ({ ...prev, page: 1 }))
    }
  }, [searchParams])

  const queryParams = useMemo((): AuditLogsParams => ({
    ...params,
    module: filters.module || undefined,
    table_name: filters.table_name || undefined,
    entity_type: filters.entity_type || undefined,
    entity_id: filters.entity_id || undefined,
    action: filters.action || undefined,
    actor_user_id: filters.actor_user_id ? Number(filters.actor_user_id) : undefined,
    date_from: filters.from_date || undefined,
    date_to: filters.to_date || undefined,
  }), [params, filters])

  const query = useAsyncData(
    () => auditService.list(queryParams),
    [JSON.stringify(queryParams)],
  )

  function applyFilters() {
    setParams((prev) => ({ ...prev, page: 1 }))
  }

  function clearFilters() {
    setFilters({ module: '', table_name: '', entity_type: '', entity_id: '', action: '', actor_user_id: '', from_date: '', to_date: '' })
    setParams({ page: 1, page_size: params.page_size })
  }

  function exportCsv() {
    const items = query.data?.items ?? []
    if (!items.length) {
      showToast({ title: 'No data to export', tone: 'error' })
      return
    }
    const header = ['ID', 'Date', 'Actor', 'Module', 'Table', 'Entity', 'Entity ID', 'Action', 'Summary', 'IP'].join(',')
    const rows = items.map((l) =>
      [
        l.id,
        l.created_at,
        l.actor_name || l.actor_email || l.actor_user_id || '',
        l.module || '',
        l.table_name || '',
        l.entity_type || '',
        l.entity_id || '',
        l.action || '',
        (l.summary || '').replace(/,/g, ';'),
        l.ip_address || '',
      ].join(','),
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalPages = query.data?.total_pages ?? 1
  const currentPage = params.page ?? 1

  return (
    <div>
      <PageHeader
        title="Audit Logs"
        description="Track all create, update, delete and login events across the system."
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={exportCsv}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-1.5 h-4 w-4">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Export CSV
            </Button>
            <Button variant="secondary" size="sm" onClick={() => void query.refetch()}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-1.5 h-4 w-4">
                <path d="M1 4v6h6M23 20v-6h-6" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 0 1 3.51 15" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Refresh
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <div className="mb-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Filters</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          <div>
            <label className="mb-1 block text-[10px] font-medium text-[var(--muted)] uppercase tracking-wide">Module</label>
            <Input
              value={filters.module}
              onChange={(e) => setFilters((p) => ({ ...p, module: e.target.value }))}
              placeholder="e.g. crm"
              className="h-8 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-medium text-[var(--muted)] uppercase tracking-wide">Table</label>
            <Input
              value={filters.table_name}
              onChange={(e) => setFilters((p) => ({ ...p, table_name: e.target.value }))}
              placeholder="e.g. customer"
              className="h-8 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-medium text-[var(--muted)] uppercase tracking-wide">Entity Type</label>
            <Input
              value={filters.entity_type}
              onChange={(e) => setFilters((p) => ({ ...p, entity_type: e.target.value }))}
              placeholder="e.g. Customer"
              className="h-8 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-medium text-[var(--muted)] uppercase tracking-wide">Entity ID</label>
            <Input
              value={filters.entity_id}
              onChange={(e) => setFilters((p) => ({ ...p, entity_id: e.target.value }))}
              placeholder="numeric ID"
              className="h-8 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-medium text-[var(--muted)] uppercase tracking-wide">Action</label>
            <select
              value={filters.action}
              onChange={(e) => setFilters((p) => ({ ...p, action: e.target.value }))}
              className="h-8 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            >
              <option value="">All actions</option>
              {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-medium text-[var(--muted)] uppercase tracking-wide">Actor User ID</label>
            <Input
              value={filters.actor_user_id}
              onChange={(e) => setFilters((p) => ({ ...p, actor_user_id: e.target.value }))}
              placeholder="numeric ID"
              className="h-8 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-medium text-[var(--muted)] uppercase tracking-wide">Date From</label>
            <Input
              type="date"
              value={filters.from_date}
              onChange={(e) => setFilters((p) => ({ ...p, from_date: e.target.value }))}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-medium text-[var(--muted)] uppercase tracking-wide">Date To</label>
            <Input
              type="date"
              value={filters.to_date}
              onChange={(e) => setFilters((p) => ({ ...p, to_date: e.target.value }))}
              className="h-8 text-sm"
            />
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Button size="sm" onClick={applyFilters}>Apply Filters</Button>
          <Button size="sm" variant="secondary" onClick={clearFilters}>Clear</Button>
          <div className="ml-auto flex items-center gap-2">
            <label className="text-[10px] font-medium text-[var(--muted)] uppercase tracking-wide">Per page</label>
            <select
              value={params.page_size}
              onChange={(e) => setParams((p) => ({ ...p, page: 1, page_size: Number(e.target.value) }))}
              className="h-7 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-xs text-[var(--foreground)] focus:outline-none"
            >
              {PAGE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      {query.isLoading ? (
        <LoadingStateBlock eyebrow="Loading" title="Fetching audit logs..." />
      ) : query.isError ? (
        <ErrorStateBlock
          eyebrow="Error"
          title="Failed to load audit logs"
          description={getApiErrorMessage(query.error)}
          actionLabel="Retry"
          onAction={() => void query.refetch()}
        />
      ) : !query.data?.items.length ? (
        <EmptyStateBlock eyebrow="Empty" title="No logs found" description="Try adjusting your filters." />
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
            <table className="w-full min-w-[800px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--muted-surface)]">
                  {['#', 'Time', 'Actor', 'Action', 'Module', 'Entity', 'Summary', 'IP'].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {query.data.items.map((log, index) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className={cn(
                      'cursor-pointer border-b border-[var(--border)] transition-colors last:border-0',
                      index % 2 === 0 ? 'bg-[var(--surface)]' : 'bg-[var(--surface-elevated)]',
                      'hover:bg-[var(--accent-soft)]',
                    )}
                  >
                    <td className="px-4 py-3 text-xs text-[var(--muted)]">{log.id}</td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-xs font-medium truncate max-w-[140px]">
                          {log.actor_name || log.actor_email || `User #${log.actor_user_id}` || '—'}
                        </p>
                        {log.actor_email && log.actor_name ? (
                          <p className="text-[10px] text-[var(--muted)] truncate max-w-[140px]">{log.actor_email}</p>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase', actionBadgeClass(log.action))}>
                        {log.action || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--muted)]">
                      {[log.module, log.table_name].filter(Boolean).join(' / ') || '—'}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {log.entity_type ? (
                        <span className="font-mono">
                          {log.entity_type}
                          {log.entity_id ? <span className="text-[var(--muted)]"> #{log.entity_id}</span> : null}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--muted)] max-w-[200px] truncate">
                      {log.summary || '—'}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-[var(--muted)]">
                      {log.ip_address || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-[var(--muted)]">
              {query.data.total_items} total logs · page {currentPage} of {totalPages}
            </p>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="secondary"
                disabled={currentPage <= 1}
                onClick={() => setParams((p) => ({ ...p, page: (p.page ?? 1) - 1 }))}
              >
                ← Prev
              </Button>
              {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                const start = Math.max(1, Math.min(currentPage - 3, totalPages - 6))
                const page = start + i
                return (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setParams((p) => ({ ...p, page }))}
                    className={cn(
                      'h-8 min-w-[32px] rounded-lg border px-2 text-xs font-medium transition-colors',
                      page === currentPage
                        ? 'border-blue-500/30 bg-blue-600/10 text-blue-400'
                        : 'border-transparent text-[var(--muted)] hover:border-[var(--border)] hover:bg-[var(--accent-soft)]',
                    )}
                  >
                    {page}
                  </button>
                )
              })}
              <Button
                size="sm"
                variant="secondary"
                disabled={currentPage >= totalPages}
                onClick={() => setParams((p) => ({ ...p, page: (p.page ?? 1) + 1 }))}
              >
                Next →
              </Button>
            </div>
          </div>
        </>
      )}

      {selectedLog ? (
        <LogDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
      ) : null}
    </div>
  )
}
