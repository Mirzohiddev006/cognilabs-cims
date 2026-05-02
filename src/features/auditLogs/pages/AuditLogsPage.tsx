import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAsyncData } from '../../../shared/hooks/useAsyncData'
import { translateCurrentLiteral } from '../../../shared/i18n/translations'
import { auditService, type AuditLogItem } from '../../../shared/api/services/audit.service'
import { Card, CardContent } from '../../../shared/ui/card'
import { Button } from '../../../shared/ui/button'
import { Badge } from '../../../shared/ui/badge'
import { Input } from '../../../shared/ui/input'
import { PageHeader } from '../../../shared/ui/page-header'
import { DataTable } from '../../../shared/ui/data-table'
import { LoadingStateBlock, ErrorStateBlock, EmptyStateBlock } from '../../../shared/ui/state-block'
import { Dialog } from '../../../shared/ui/dialog'

function LogDetailModal({ log, onClose }: { log: AuditLogItem; onClose: () => void }) {
  const lt = translateCurrentLiteral

  return (
    <Dialog
      open
      onClose={onClose}
      title={lt('Log Detail')}
      size="lg"
      footer={
        <Button variant="secondary" onClick={onClose}>
          {lt('Close')}
        </Button>
      }
    >
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">{lt('Action')}</p>
            <Badge
              variant={
                log.action === 'create' ? 'success' :
                log.action === 'update' ? 'warning' :
                log.action === 'delete' ? 'danger' : 'blue'
              }
              className="uppercase font-black text-[10px]"
            >
              {log.action ?? 'action'}
            </Badge>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">{lt('Entity Type')}</p>
            <p className="text-sm font-bold text-white">{log.entity_type}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">{lt('Entity ID')}</p>
            <p className="text-sm font-bold text-white">#{log.entity_id}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">{lt('Timestamp')}</p>
            <p className="text-sm font-bold text-white">{new Date(log.created_at).toLocaleString()}</p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">{lt('User')}</p>
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/20 text-blue-400 font-bold">
              {log.actor_name?.charAt(0) ?? '?'}
            </div>
            <div>
              <p className="text-sm font-bold text-white">{log.actor_name}</p>
              <p className="text-xs text-[var(--muted)]">{log.actor_email}</p>
            </div>
          </div>
        </div>

        {(log.after_data || log.before_data) ? (
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">{lt('Data Changes')}</p>
            <div className="max-h-60 overflow-auto rounded-2xl border border-white/10 bg-black/20 p-4 font-mono text-[11px] leading-relaxed text-blue-300">
              <pre>{JSON.stringify({ before: log.before_data, after: log.after_data }, null, 2)}</pre>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 opacity-40">
            <p className="text-sm italic">{lt('No change data available')}</p>
          </div>
        )}
      </div>
    </Dialog>
  )
}

export function AuditLogsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const lt = translateCurrentLiteral

  const [page, setPage] = useState(Number(searchParams.get('page')) || 1)
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [entityType, setEntityType] = useState(searchParams.get('entity_type') || '')
  const [entityId, setEntityId] = useState(searchParams.get('entity_id') || '')
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null)

  const logsQuery = useAsyncData(
    () => auditService.list({
      page,
      entity_type: entityType || undefined,
      entity_id: entityId || undefined,
    }),
    [page, search, entityType, entityId]
  )

  useEffect(() => {
    const params: Record<string, string> = {}
    if (page > 1) params.page = String(page)
    if (search) params.search = search
    if (entityType) params.entity_type = entityType
    if (entityId) params.entity_id = entityId
    setSearchParams(params, { replace: true })
  }, [page, search, entityType, entityId, setSearchParams])

  const logs = logsQuery.data?.items ?? []
  const total = logsQuery.data?.total_items ?? 0
  const totalPages = Math.ceil(total / 20)

  return (
    <div className="space-y-8 page-enter">
      <PageHeader
        eyebrow={lt('System Administration')}
        title={lt('Audit Logs')}
        description={lt('Track and monitor all changes and activities across the platform.')}
      />

      <div className="grid gap-4 md:grid-cols-4 stagger-children">
        <div className="md:col-span-2">
          <Input
            placeholder={lt('Search by action...')}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="h-12 rounded-2xl bg-[var(--surface-elevated)]"
          />
        </div>
        <Input
          placeholder={lt('Entity Type (e.g. Project)')}
          value={entityType}
          onChange={(e) => { setEntityType(e.target.value); setPage(1) }}
          className="h-12 rounded-2xl bg-[var(--surface-elevated)]"
        />
        <Input
          placeholder={lt('Entity ID')}
          value={entityId}
          onChange={(e) => { setEntityId(e.target.value); setPage(1) }}
          className="h-12 rounded-2xl bg-[var(--surface-elevated)]"
        />
      </div>

      <Card className="overflow-hidden border-[var(--border)] shadow-xl bg-[var(--surface)]">
        <CardContent>
          {logsQuery.isLoading ? (
            <LoadingStateBlock eyebrow={lt('Loading')} title={lt('Loading logs...')} description={lt('Retrieving latest system activities.')} />
          ) : logsQuery.isError ? (
            <ErrorStateBlock eyebrow={lt('Error')} title={lt('Failed to load logs')} />
          ) : logs.length === 0 ? (
            <EmptyStateBlock 
              eyebrow={lt('Audit Logs')}
              title={lt('No logs found')} 
              description={lt('Adjust your filters or try a different search term.')} 
            />
          ) : (
            <DataTable
              rows={logs}
              getRowKey={(log) => String(log.id)}
              onRowClick={setSelectedLog}
              columns={[
                {
                  key: 'user',
                  header: lt('User'),
                  render: (row) => (
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 shrink-0 rounded-full bg-blue-500/10 flex items-center justify-center text-[10px] font-black text-blue-400 border border-blue-500/20">
                        {row.actor_name?.charAt(0) ?? '?'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{row.actor_name}</p>
                        <p className="text-[10px] text-[var(--muted)] truncate">{row.actor_email}</p>
                      </div>
                    </div>
                  )
                },
                {
                  key: 'action',
                  header: lt('Action'),
                  render: (row) => (
                    <Badge
                      variant={
                        row.action === 'create' ? 'success' :
                        row.action === 'update' ? 'warning' :
                        row.action === 'delete' ? 'danger' : 'blue'
                      }
                      className="uppercase font-black text-[9px] px-2 py-0.5"
                    >
                      {row.action ?? 'action'}
                    </Badge>
                  )
                },
                {
                  key: 'entity',
                  header: lt('Entity'),
                  render: (row) => (
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase text-blue-400/80">{row.entity_type}</span>
                      <span className="text-[11px] font-bold text-white">ID: #{row.entity_id}</span>
                    </div>
                  )
                },
                {
                  key: 'timestamp',
                  header: lt('Time'),
                  render: (row) => (
                    <div className="text-[11px] font-medium text-[var(--muted-strong)]">
                      {new Date(row.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </div>
                  )
                }
              ]}
            />
          )}
        </CardContent>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[var(--border)] bg-black/20 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">
              {lt('Page')} {page} {lt('of')} {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-xl h-9"
              >
                ← {lt('Prev')}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-xl h-9"
              >
                {lt('Next')} →
              </Button>
            </div>
          </div>
        )}
      </Card>

      {selectedLog && (
        <LogDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
      )}
    </div>
  )
}
