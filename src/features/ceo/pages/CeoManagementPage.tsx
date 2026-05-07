import { useMemo, useState } from 'react'
import { managementService } from '../../../shared/api/services/management.service'
import type {
  ManagementStatusCreatePayload,
  ManagementStatusRecord,
  ManagementStatusUpdatePayload,
} from '../../../shared/api/types'
import { useConfirm } from '../../../shared/confirm/useConfirm'
import { useAsyncData } from '../../../shared/hooks/useAsyncData'
import { translateCurrentLiteral } from '../../../shared/i18n/translations'
import { getApiErrorMessage } from '../../../shared/lib/api-error'
import { cn } from '../../../shared/lib/cn'
import { formatShortDate } from '../../../shared/lib/format'
import { useToast } from '../../../shared/toast/useToast'
import { ActionsMenu } from '../../../shared/ui/actions-menu'
import { Badge } from '../../../shared/ui/badge'
import { Button } from '../../../shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/ui/card'
import { DataTable } from '../../../shared/ui/data-table'
import { Dialog } from '../../../shared/ui/dialog'
import { Input } from '../../../shared/ui/input'
import { Label } from '../../../shared/ui/label'
import { PageHeader } from '../../../shared/ui/page-header'
import { ErrorStateBlock, LoadingStateBlock } from '../../../shared/ui/state-block'
import { Textarea } from '../../../shared/ui/textarea'

type ManagementTab = 'statuses'

const tabOptions: Array<{ key: ManagementTab; label: string; description: string }> = [
  { key: 'statuses', label: 'Statuses', description: 'Dynamic CRM statuses with live CRUD.' },
]

type StatusFormState = {
  name: string
  displayName: string
  description: string
  color: string
  order: string
  isActive: boolean
  isSystem: boolean
}

const statusColorPresets = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#14B8A6']

const initialStatusForm: StatusFormState = {
  name: '',
  displayName: '',
  description: '',
  color: '#2563EB',
  order: '0',
  isActive: true,
  isSystem: false,
}

const managementStaticCardTitle = 'text-gray-500 dark:text-white/50'
const managementStaticCardValue = 'text-gray-900 dark:text-white'

function toStatusFormState(item?: ManagementStatusRecord | null): StatusFormState {
  if (!item) {
    return initialStatusForm
  }

  return {
    name: item.name,
    displayName: item.display_name,
    description: item.description ?? '',
    color: item.color || '#2563EB',
    order: String(item.order ?? 0),
    isActive: item.is_active,
    isSystem: item.is_system,
  }
}

function BooleanToggle({
  value,
  onChange,
  trueLabel,
  falseLabel,
}: {
  value: boolean
  onChange: (next: boolean) => void
  trueLabel: string
  falseLabel: string
}) {
  const lt = translateCurrentLiteral
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <button
        type="button"
        onClick={() => onChange(true)}
        className={cn(
          'rounded-xl border px-4 py-3 text-left text-sm transition',
          value
            ? 'border-emerald-400/35 bg-emerald-500/[0.10] text-white'
            : 'border-white/10 bg-white/[0.03] text-white/72 hover:border-white/16',
        )}
      >
        {lt(trueLabel)}
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={cn(
          'rounded-xl border px-4 py-3 text-left text-sm transition',
          !value
            ? 'border-amber-400/35 bg-amber-500/[0.10] text-white'
            : 'border-white/10 bg-white/[0.03] text-white/72 hover:border-white/16',
        )}
      >
        {lt(falseLabel)}
      </button>
    </div>
  )
}

export function CeoManagementPage() {
  const { showToast } = useToast()
  const { confirm } = useConfirm()
  const lt = translateCurrentLiteral
  const [activeTab, setActiveTab] = useState<ManagementTab>('statuses')

  const [statusDialogMode, setStatusDialogMode] = useState<'create' | 'edit'>('create')
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [statusForm, setStatusForm] = useState<StatusFormState>(initialStatusForm)
  const [editingStatus, setEditingStatus] = useState<ManagementStatusRecord | null>(null)
  const [isStatusSubmitting, setIsStatusSubmitting] = useState(false)

  const statusesQuery = useAsyncData(() => managementService.listStatuses(), [])

  const statuses = useMemo(
    () => [...(statusesQuery.data ?? [])].sort((left, right) => left.order - right.order || left.display_name.localeCompare(right.display_name)),
    [statusesQuery.data],
  )

  const isInitialLoading = !statusesQuery.data && statusesQuery.isLoading

  function closeStatusDialog() {
    setStatusDialogOpen(false)
    setEditingStatus(null)
    setStatusForm(initialStatusForm)
  }

  function reloadManagementPageAfterSave() {
    if (typeof window === 'undefined') {
      return
    }

    window.setTimeout(() => {
      window.location.reload()
    }, 180)
  }

  async function refreshAll() {
    const results = await Promise.allSettled([statusesQuery.refetch()])
    const failed = results.find((result) => result.status === 'rejected')

    if (failed && failed.status === 'rejected') {
      showToast({
        title: lt('Management refresh failed'),
        description: getApiErrorMessage(failed.reason),
        tone: 'error',
      })
      return
    }

    showToast({
      title: lt('Management refreshed'),
      description: lt('Statuses reloaded.'),
      tone: 'success',
    })
  }

  function openCreateStatusDialog() {
    setStatusDialogMode('create')
    setEditingStatus(null)
    setStatusForm(initialStatusForm)
    setStatusDialogOpen(true)
  }

  function openEditStatusDialog(item: ManagementStatusRecord) {
    setStatusDialogMode('edit')
    setEditingStatus(item)
    setStatusForm(toStatusFormState(item))
    setStatusDialogOpen(true)
  }

  async function handleSubmitStatus() {
    if (!statusForm.name.trim() || !statusForm.displayName.trim()) {
      showToast({
        title: lt('Status form incomplete'),
        description: lt('Name and display name are required.'),
        tone: 'error',
      })
      return
    }

    setIsStatusSubmitting(true)

    try {
      const shouldReloadPage = statusDialogMode === 'edit'

      if (statusDialogMode === 'create') {
        const payload: ManagementStatusCreatePayload = {
          name: statusForm.name.trim(),
          display_name: statusForm.displayName.trim(),
          description: statusForm.description.trim() || undefined,
          color: statusForm.color,
          order: Number(statusForm.order) || 0,
          is_active: statusForm.isActive,
          is_system: statusForm.isSystem,
        }

        await managementService.createStatus(payload)
      } else if (editingStatus) {
        const payload: ManagementStatusUpdatePayload = {
          display_name: statusForm.displayName.trim(),
          description: statusForm.description.trim() || undefined,
          color: statusForm.color,
          order: Number(statusForm.order) || 0,
          is_active: statusForm.isActive,
        }

        await managementService.updateStatus(editingStatus.id, payload)
      }

      await statusesQuery.refetch()
      closeStatusDialog()
      showToast({
        title: statusDialogMode === 'create' ? lt('Status created') : lt('Status updated'),
        description: lt('Management statuses list refreshed.'),
        tone: 'success',
      })

      if (shouldReloadPage) {
        reloadManagementPageAfterSave()
      }
    } catch (error) {
      showToast({
        title: lt('Status save failed'),
        description: getApiErrorMessage(error),
        tone: 'error',
      })
    } finally {
      setIsStatusSubmitting(false)
    }
  }

  async function handleDeleteStatus(item: ManagementStatusRecord) {
    const approved = await confirm({
      title: `${lt('Delete status')} ${item.display_name}?`,
      description: item.is_system
        ? 'Backend system statusni o‘chirishga ruxsat bermasligi mumkin.'
        : 'Status butunlay o‘chiriladi.',
      confirmLabel: lt('Delete status'),
      tone: 'danger',
    })

    if (!approved) {
      return
    }

    try {
      await managementService.deleteStatus(item.id)
      await statusesQuery.refetch()
      showToast({
        title: lt('Status deleted'),
        description: `${item.display_name} ${lt('removed.')}`,
        tone: 'success',
      })
    } catch (error) {
      showToast({
        title: lt('Delete failed'),
        description: getApiErrorMessage(error),
        tone: 'error',
      })
    }
  }

  if (isInitialLoading) {
    return (
      <LoadingStateBlock
        eyebrow={lt('CEO / Management')}
        title={lt('Loading management modules')}
        description={lt('Fetching statuses overview.')}
      />
    )
  }

  if (!statusesQuery.data && statusesQuery.isError) {
    return (
      <ErrorStateBlock
        eyebrow={lt('CEO / Management')}
        title={lt('Management modules unavailable')}
        description={lt('Could not load the management dashboard.')}
        actionLabel={lt('Retry')}
        onAction={() => void refreshAll()}
      />
    )
  }

  return (
    <section className="space-y-4 page-enter">
      <PageHeader
        title={lt('Management API')}
        actions={(
          <>
            <Button variant="secondary" onClick={() => void refreshAll()}>
              {lt('Refresh')}
            </Button>
            {activeTab === 'statuses' ? (
              <Button onClick={openCreateStatusDialog}>{lt('Create status')}</Button>
            ) : null}
          </>
        )}
      />

      <div className="grid gap-3 md:grid-cols-4">
        {tabOptions.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'rounded-xl border px-4 py-4 text-left transition',
              activeTab === tab.key
                ? 'border-[#2576EF]/32 bg-[linear-gradient(180deg,rgba(37,118,239,0.18),rgba(255,255,255,0.98))] shadow-[inset_0_0_0_1px_rgba(37,118,239,0.08),0_18px_34px_rgba(37,118,239,0.12)] dark:border-blue-400/28 dark:bg-[linear-gradient(180deg,rgba(37,118,239,0.22),rgba(37,118,239,0.08))] dark:text-white dark:shadow-[0_0_0_1px_rgba(96,165,250,0.08),0_18px_36px_rgba(15,23,42,0.26)]'
                : 'border-[#2576EF]/22 bg-[linear-gradient(180deg,rgba(37,118,239,0.10),rgba(255,255,255,1))] shadow-[inset_0_0_0_1px_rgba(37,118,239,0.05),0_12px_24px_rgba(37,118,239,0.07)] hover:border-[#2576EF]/30 hover:bg-[linear-gradient(180deg,rgba(37,118,239,0.14),rgba(255,255,255,1))] dark:border-blue-500/18 dark:bg-[linear-gradient(180deg,rgba(37,118,239,0.14),rgba(37,118,239,0.05))] dark:text-white/84 dark:shadow-[0_0_0_1px_rgba(96,165,250,0.06),0_16px_28px_rgba(15,23,42,0.24)] dark:hover:border-blue-400/26 dark:hover:bg-[linear-gradient(180deg,rgba(37,118,239,0.18),rgba(37,118,239,0.06))]',
            )}
          >
            <p className={cn('text-sm font-bold', activeTab === tab.key ? managementStaticCardValue : managementStaticCardTitle)}>{lt(tab.label)}</p>
          </button>
        ))}
      </div>

      {activeTab === 'statuses' ? (
        <Card noPadding>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>{lt('Statuses')}</CardTitle>
            <Badge variant="success">{statuses.length} {lt('statuses')}</Badge>
          </CardHeader>
          <CardContent>
            <DataTable
              caption={lt('Management statuses')}
              rows={statuses}
              getRowKey={(row) => String(row.id)}
              zebra
              columns={[
                {
                  key: 'status',
                  header: lt('Status'),
                  render: (row) => (
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: row.color }} />
                        <p className="font-semibold text-white">{row.display_name}</p>
                      </div>
                      <p className="mt-1 text-xs uppercase tracking-[0.14em] text-(--muted)">{row.name}</p>
                    </div>
                  ),
                },
                {
                  key: 'description',
                  header: lt('Description'),
                  render: (row) => (
                    <span className="text-sm text-white/75">{row.description || lt('No description')}</span>
                  ),
                },
                {
                  key: 'order',
                  header: lt('Order'),
                  align: 'right',
                  render: (row) => row.order,
                },
                {
                  key: 'flags',
                  header: lt('Flags'),
                  render: (row) => (
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={row.is_active ? 'success' : 'outline'}>
                        {row.is_active ? lt('Active') : lt('Inactive')}
                      </Badge>
                      <Badge variant={row.is_system ? 'warning' : 'secondary'}>
                        {row.is_system ? lt('System') : lt('Custom')}
                      </Badge>
                    </div>
                  ),
                },
                {
                  key: 'updated',
                  header: lt('Updated'),
                  render: (row) => formatShortDate(row.updated_at),
                },
                {
                  key: 'actions',
                  header: lt('Actions'),
                  render: (row) => (
                    <ActionsMenu
                      label={`${lt('Actions for')} ${row.display_name}`}
                      items={[
                        { label: lt('Edit'), onSelect: () => openEditStatusDialog(row) },
                        { label: lt('Delete'), onSelect: () => void handleDeleteStatus(row), tone: 'danger' },
                      ]}
                    />
                  ),
                },
              ]}
            />
          </CardContent>
        </Card>
      ) : null}

      <Dialog
        open={statusDialogOpen}
        onClose={closeStatusDialog}
        title={statusDialogMode === 'create' ? lt('Create status') : lt('Edit status')}
        description={lt('Status CRUD form')}
        size="xl"
        footer={(
          <>
            <Button variant="secondary" onClick={closeStatusDialog} disabled={isStatusSubmitting}>
              {lt('Cancel')}
            </Button>
            <Button onClick={() => void handleSubmitStatus()} loading={isStatusSubmitting}>
              {statusDialogMode === 'create' ? lt('Create status') : lt('Save changes')}
            </Button>
          </>
        )}
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block text-sm font-semibold text-white">{lt('Name')}</Label>
              <Input
                value={statusForm.name}
                onChange={(event) => setStatusForm((current) => ({ ...current, name: event.target.value }))}
                disabled={statusDialogMode === 'edit'}
                placeholder="contacted"
              />
            </div>

            <div>
              <Label className="mb-2 block text-sm font-semibold text-white">{lt('Display name')}</Label>
              <Input
                value={statusForm.displayName}
                onChange={(event) => setStatusForm((current) => ({ ...current, displayName: event.target.value }))}
                placeholder={lt('Contacted')}
              />
            </div>

            <div>
              <Label className="mb-2 block text-sm font-semibold text-white">{lt('Description')}</Label>
              <Textarea
                value={statusForm.description}
                onChange={(event) => setStatusForm((current) => ({ ...current, description: event.target.value }))}
                placeholder={lt('Status usage description')}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label className="mb-2 block text-sm font-semibold text-white">{lt('Color')}</Label>
              <div className="flex flex-wrap items-center gap-3">
                <Input
                  type="color"
                  value={statusForm.color}
                  onChange={(event) => setStatusForm((current) => ({ ...current, color: event.target.value }))}
                  className="h-12 w-18 rounded-xl border-white/10 bg-white/[0.03] p-2"
                />
                <div className="flex flex-wrap gap-2">
                  {statusColorPresets.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setStatusForm((current) => ({ ...current, color }))}
                      className={cn(
                        'h-8 w-8 rounded-full border-2 transition',
                        statusForm.color === color ? 'border-white' : 'border-transparent',
                      )}
                      style={{ backgroundColor: color }}
                      aria-label={`Select ${color}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div>
              <Label className="mb-2 block text-sm font-semibold text-white">{lt('Order')}</Label>
              <Input
                type="number"
                value={statusForm.order}
                onChange={(event) => setStatusForm((current) => ({ ...current, order: event.target.value }))}
              />
            </div>

            <div>
              <p className="mb-2 block text-sm font-semibold text-white">{lt('Active state')}</p>
              <BooleanToggle
                value={statusForm.isActive}
                onChange={(isActive) => setStatusForm((current) => ({ ...current, isActive }))}
                trueLabel={lt('Active')}
                falseLabel={lt('Inactive')}
              />
            </div>

            {statusDialogMode === 'create' ? (
              <div>
                <p className="mb-2 block text-sm font-semibold text-white">{lt('System status')}</p>
                <BooleanToggle
                  value={statusForm.isSystem}
                  onChange={(isSystem) => setStatusForm((current) => ({ ...current, isSystem }))}
                  trueLabel={lt('System')}
                  falseLabel={lt('Custom')}
                />
              </div>
            ) : null}
          </div>
        </div>
      </Dialog>
    </section>
  )
}
