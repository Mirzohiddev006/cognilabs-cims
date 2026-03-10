import { useDeferredValue, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { crmService } from '../../../shared/api/services/crm.service'
import type { CustomerSummary, DynamicStatusOption } from '../../../shared/api/types'
import { useConfirm } from '../../../shared/confirm/useConfirm'
import { useAsyncData } from '../../../shared/hooks/useAsyncData'
import { getApiErrorMessage } from '../../../shared/lib/api-error'
import { formatCompactNumber } from '../../../shared/lib/format'
import { useToast } from '../../../shared/toast/useToast'
import { Button } from '../../../shared/ui/button'
import { Card } from '../../../shared/ui/card'
import { ActionsMenu } from '../../../shared/ui/actions-menu'
import { DataTable } from '../../../shared/ui/data-table'
import { Input } from '../../../shared/ui/input'
import { SelectField } from '../../../shared/ui/select-field'
import { EmptyStateBlock, ErrorStateBlock, LoadingStateBlock } from '../../../shared/ui/state-block'
import { CustomerFormModal, type CustomerFormValues } from '../components/CustomerFormModal'

const emptyCustomers: CustomerSummary[] = []
const emptyStatuses: DynamicStatusOption[] = []

const initialFormValues: CustomerFormValues = {
  full_name: '',
  platform: '',
  phone_number: '',
  status: '',
  username: '',
  assistant_name: '',
  notes: '',
  recall_time: '',
  clear_recall_time: false,
  customer_type: '',
  conversation_language: 'uz',
}

function toDateTimeLocalValue(value?: string | null) {
  if (!value) {
    return ''
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const timezoneOffset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16)
}

function toFormValues(customer?: CustomerSummary | null): CustomerFormValues {
  if (!customer) {
    return initialFormValues
  }

  return {
    full_name: customer.full_name ?? '',
    platform: customer.platform ?? '',
    phone_number: customer.phone_number ?? '',
    status: customer.status ?? '',
    username: customer.username ?? '',
    assistant_name: customer.assistant_name ?? '',
    notes: customer.notes ?? '',
    recall_time: toDateTimeLocalValue(customer.recall_time),
    clear_recall_time: false,
    customer_type: '',
    conversation_language: customer.conversation_language ?? 'uz',
  }
}

function buildCustomerFormData(
  values: CustomerFormValues,
  mode: 'create' | 'edit',
  audioFile: File | null,
) {
  const formData = new FormData()

  const mappedFields: Array<[string, string]> = [
    ['full_name', values.full_name.trim()],
    ['platform', values.platform.trim()],
    ['phone_number', values.phone_number.trim()],
    [mode === 'create' ? 'status' : 'customer_status', values.status.trim()],
    ['username', values.username.trim()],
    ['assistant_name', values.assistant_name.trim()],
    ['notes', values.notes.trim()],
    ['conversation_language', values.conversation_language.trim()],
    ['customer_type', values.customer_type.trim()],
  ]

  mappedFields.forEach(([key, value]) => {
    if (value) {
      formData.append(key, value)
    }
  })

  if (values.recall_time) {
    formData.append('recall_time', new Date(values.recall_time).toISOString())
  }

  if (mode === 'edit' && values.clear_recall_time) {
    formData.append('clear_recall_time', 'true')
  }

  if (audioFile) {
    formData.append('audio', audioFile)
  }

  return formData
}

function getInitials(name: string) {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?'
  )
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return '-'
  }

  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return '-'
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(parsed)
}

function normalizeDateValue(value?: string | null) {
  if (!value) {
    return null
  }

  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return parsed
}

function normalizeStatusKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function getStatusCount(statusDict: Record<string, number> | undefined, ...keys: string[]) {
  if (!statusDict) {
    return 0
  }

  const normalizedCandidates = keys.map(normalizeStatusKey)

  for (const [key, count] of Object.entries(statusDict)) {
    if (normalizedCandidates.includes(normalizeStatusKey(key))) {
      return count
    }
  }

  return 0
}

function resolveMetricValue(primary: number | undefined, fallback: number) {
  if (typeof primary === 'number' && primary > 0) {
    return primary
  }

  if (fallback > 0) {
    return fallback
  }

  return primary ?? fallback
}

function StatusBadge({
  status,
  statusMetaMap,
}: {
  status: string
  statusMetaMap: Map<string, DynamicStatusOption>
}) {
  const meta = statusMetaMap.get(status)

  return (
    <span
      className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium capitalize"
      style={{
        borderColor: meta?.color ?? 'var(--border)',
        color: meta?.color ?? 'var(--foreground)',
        backgroundColor: meta?.color ? `${meta.color}18` : 'var(--muted-surface)',
      }}
    >
      {meta?.label ?? status}
    </span>
  )
}

function MetricCard({
  label,
  value,
  description,
}: {
  label: string
  value: number
  description: string
}) {
  return (
    <Card className="flex min-h-[140px] flex-col justify-between p-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#3b82f6]">{label}</p>
        <p className="mt-5 text-[2.125rem] leading-none font-semibold text-white tracking-tight">
          {formatCompactNumber(value)}
        </p>
      </div>
      <p className="text-sm leading-6 text-[var(--muted)]">{description}</p>
    </Card>
  )
}

export function CrmDashboardPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { confirm } = useConfirm()

  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [phoneFilter, setPhoneFilter] = useState('')
  const deferredPhoneFilter = useDeferredValue(phoneFilter)
  const [statusFilter, setStatusFilter] = useState('')
  const [platformFilter, setPlatformFilter] = useState('')
  const [dateStart, setDateStart] = useState('')
  const [dateEnd, setDateEnd] = useState('')

  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSummary | null>(null)
  const [formValues, setFormValues] = useState<CustomerFormValues>(initialFormValues)
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isFormSubmitting, setIsFormSubmitting] = useState(false)

  const dashboardQuery = useAsyncData(() => crmService.dashboard(), [])
  const statusesQuery = useAsyncData(() => crmService.dynamicStatuses(), [])
  const summaryQuery = useAsyncData(() => crmService.summaryStats(), [])

  const customers = dashboardQuery.data?.customers ?? emptyCustomers
  const statusOptions = statusesQuery.data ?? emptyStatuses

  const statusMetaMap = useMemo(() => new Map(statusOptions.map((item) => [item.value, item])), [statusOptions])

  const availablePlatforms = useMemo(() => {
    return Array.from(new Set(customers.map((item) => item.platform).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b),
    )
  }, [customers])

  const displayedCustomers = useMemo(() => {
    const normalizedSearch = deferredSearch.trim().toLowerCase()
    const normalizedPhone = deferredPhoneFilter.trim().toLowerCase()
    const startDate = dateStart ? new Date(`${dateStart}T00:00:00`) : null
    const endDate = dateEnd ? new Date(`${dateEnd}T23:59:59.999`) : null

    return customers.filter((customer) => {
      const matchesSearch = normalizedSearch
        ? [customer.full_name, customer.username, customer.notes]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(normalizedSearch))
        : true

      const matchesPhone = normalizedPhone
        ? customer.phone_number.toLowerCase().includes(normalizedPhone)
        : true

      const matchesStatus = statusFilter ? customer.status === statusFilter : true
      const matchesPlatform = platformFilter ? customer.platform === platformFilter : true

      const createdAt = normalizeDateValue(customer.created_at)
      const matchesStart = startDate && createdAt ? createdAt >= startDate : !startDate
      const matchesEnd = endDate && createdAt ? createdAt <= endDate : !endDate

      return matchesSearch && matchesPhone && matchesStatus && matchesPlatform && matchesStart && matchesEnd
    })
  }, [customers, dateEnd, dateStart, deferredPhoneFilter, deferredSearch, platformFilter, statusFilter])

  async function refreshAll() {
    await Promise.all([dashboardQuery.refetch(), statusesQuery.refetch(), summaryQuery.refetch()])
  }

  function resetFilters() {
    setSearch('')
    setPhoneFilter('')
    setStatusFilter('')
    setPlatformFilter('')
    setDateStart('')
    setDateEnd('')
  }

  function openCreateModal() {
    setModalMode('create')
    setSelectedCustomer(null)
    setFormValues(initialFormValues)
    setAudioFile(null)
    setIsFormOpen(true)
  }

  function openEditModal(customer: CustomerSummary) {
    setModalMode('edit')
    setSelectedCustomer(customer)
    setFormValues(toFormValues(customer))
    setAudioFile(null)
    setIsFormOpen(true)
  }

  async function handleDeleteCustomer(customer: CustomerSummary) {
    const approved = await confirm({
      title: `Delete ${customer.full_name}?`,
      description: 'The customer record will be permanently removed and cannot be undone.',
      confirmLabel: 'Delete customer',
      cancelLabel: 'Cancel',
      tone: 'danger',
    })

    if (!approved) {
      return
    }

    try {
      await crmService.deleteCustomer(customer.id)
      await Promise.all([dashboardQuery.refetch(), summaryQuery.refetch()])
      showToast({
        title: 'Customer deleted',
        description: `${customer.full_name} has been removed from the CRM list.`,
        tone: 'success',
      })
    } catch (error) {
      showToast({
        title: 'Delete failed',
        description: getApiErrorMessage(error),
        tone: 'error',
      })
    }
  }

  async function handleSubmitCustomer() {
    if (
      !formValues.full_name.trim() ||
      !formValues.platform.trim() ||
      !formValues.phone_number.trim() ||
      !formValues.status.trim()
    ) {
      showToast({
        title: 'Required fields missing',
        description: 'Full name, platform, phone number, and status are required.',
        tone: 'error',
      })
      return
    }

    setIsFormSubmitting(true)

    try {
      const formData = buildCustomerFormData(formValues, modalMode, audioFile)

      if (modalMode === 'create') {
        await crmService.createCustomer(formData)
      } else if (selectedCustomer) {
        await crmService.updateCustomer(selectedCustomer.id, formData)
      }

      setIsFormOpen(false)
      setAudioFile(null)
      await Promise.all([dashboardQuery.refetch(), summaryQuery.refetch()])
      showToast({
        title: modalMode === 'create' ? 'Customer created' : 'Customer updated',
        description: 'The CRM list has been refreshed.',
        tone: 'success',
      })
    } catch (error) {
      showToast({
        title: 'Save failed',
        description: getApiErrorMessage(error),
        tone: 'error',
      })
    } finally {
      setIsFormSubmitting(false)
    }
  }

  if (dashboardQuery.isLoading && !dashboardQuery.data) {
    return (
      <LoadingStateBlock
        eyebrow="CRM"
        title="CRM dashboard loading"
        description="Retrieving customers and summary statistics."
      />
    )
  }

  if (dashboardQuery.isError && !dashboardQuery.data) {
    return (
      <ErrorStateBlock
        eyebrow="CRM"
        title="CRM dashboard failed to load"
        description="Could not retrieve CRM data. Please retry."
        actionLabel="Retry"
        onAction={() => {
          void refreshAll()
        }}
      />
    )
  }

  const stats = summaryQuery.data
  const fallbackStatusDict = dashboardQuery.data?.status_dict ?? dashboardQuery.data?.status_stats
  const statusFilterOptions = [
    { value: '', label: 'All statuses' },
    ...(dashboardQuery.data?.status_choices ?? statusOptions).map((option) => ({
      value: option.value,
      label: option.label,
    })),
  ]
  const platformFilterOptions = [
    { value: '', label: 'All platforms' },
    ...availablePlatforms.map((platform) => ({ value: platform, label: platform })),
  ]

  return (
    <section className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total Customers"
          value={stats?.total_customers ?? customers.length}
          description="Total clients in CRM"
        />
        <MetricCard
          label="Need to Call"
          value={resolveMetricValue(stats?.need_to_call, getStatusCount(fallbackStatusDict, 'need_to_call', 'need to call'))}
          description="Leads to be contacted"
        />
        <MetricCard
          label="Contacted"
          value={resolveMetricValue(stats?.contacted, getStatusCount(fallbackStatusDict, 'contacted'))}
          description="Initial contact made"
        />
        <MetricCard
          label="Project Started"
          value={resolveMetricValue(stats?.project_started, getStatusCount(fallbackStatusDict, 'project_started', 'project started'))}
          description="Projects in kickoff phase"
        />
        <MetricCard
          label="Continuing"
          value={resolveMetricValue(stats?.continuing, getStatusCount(fallbackStatusDict, 'continuing'))}
          description="Ongoing projects"
        />
        <MetricCard
          label="Finished"
          value={resolveMetricValue(stats?.finished, getStatusCount(fallbackStatusDict, 'finished'))}
          description="Projects successfully completed"
        />
        <MetricCard
          label="Rejected"
          value={resolveMetricValue(stats?.rejected, getStatusCount(fallbackStatusDict, 'rejected'))}
          description="Deals not closed"
        />
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border)] px-6 py-6">
          <div>
            <h2 className="text-2xl font-semibold text-white">Clients</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Manage your clients ({formatCompactNumber(displayedCustomers.length)} total)
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => void refreshAll()}>
              Refresh
            </Button>
            <Button onClick={openCreateModal}>+ Add Client</Button>
          </div>
        </div>

        <div className="border-b border-[var(--border)] px-6 py-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h3 className="text-lg font-semibold text-white">Filters</h3>
            <Button variant="ghost" onClick={resetFilters}>
              Clear
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-white">Search</span>
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Name or username"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-white">Status</span>
              <SelectField
                value={statusFilter}
                options={statusFilterOptions}
                onValueChange={setStatusFilter}
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-white">Platform</span>
              <SelectField
                value={platformFilter}
                options={platformFilterOptions}
                onValueChange={setPlatformFilter}
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-white">Phone</span>
              <Input
                value={phoneFilter}
                onChange={(event) => setPhoneFilter(event.target.value)}
                placeholder="Search by phone"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-white">Start date</span>
              <Input type="date" value={dateStart} onChange={(event) => setDateStart(event.target.value)} />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-white">End date</span>
              <Input type="date" value={dateEnd} onChange={(event) => setDateEnd(event.target.value)} />
            </label>
          </div>
        </div>

        <div className="px-6 py-5">
          <DataTable
            caption="CRM customers table"
            rows={displayedCustomers}
            getRowKey={(row) => String(row.id)}
            emptyState={
              <EmptyStateBlock
                eyebrow="CRM"
                title="No clients found"
                description="The current filters returned no client records."
              />
            }
            columns={[
              {
                key: 'client',
                header: 'Client',
                render: (row) => (
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--muted-surface)] text-sm font-semibold text-white">
                      {getInitials(row.full_name)}
                    </div>
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => navigate(`/crm/customers/${row.id}`)}
                        className="block truncate text-left font-semibold text-white transition hover:text-zinc-300"
                      >
                        {row.full_name}
                      </button>
                      <span className="block truncate text-xs text-[var(--muted)]">{row.username || 'none'}</span>
                    </div>
                  </div>
                ),
              },
              {
                key: 'platform',
                header: 'Platform',
                render: (row) => row.platform || '-',
              },
              {
                key: 'phone',
                header: 'Phone',
                render: (row) => row.phone_number,
              },
              {
                key: 'status',
                header: 'Status',
                render: (row) => <StatusBadge status={row.status} statusMetaMap={statusMetaMap} />,
              },
              {
                key: 'language',
                header: 'Language',
                render: (row) => row.conversation_language || '-',
              },
              {
                key: 'assistant',
                header: 'Assistant',
                render: (row) => row.assistant_name || '-',
              },
              {
                key: 'audio',
                header: 'Audio',
                render: (row) =>
                  row.audio_url ? (
                    <a
                      href={row.audio_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-white underline underline-offset-4"
                    >
                      Open
                    </a>
                  ) : (
                    '-'
                  ),
              },
              {
                key: 'notes',
                header: 'Notes',
                render: (row) => (
                  <span className="block max-w-[260px] truncate text-[var(--muted-strong)]">
                    {row.notes || '-'}
                  </span>
                ),
              },
              {
                key: 'recall',
                header: 'Recall Time',
                render: (row) => formatDateTime(row.recall_time),
              },
              {
                key: 'created',
                header: 'Created',
                render: (row) => formatDateTime(row.created_at),
              },
              {
                key: 'actions',
                header: 'Actions',
                render: (row) => (
                  <ActionsMenu
                    label={`Open actions for ${row.full_name}`}
                    items={[
                      {
                        label: 'Edit',
                        onSelect: () => openEditModal(row),
                      },
                      {
                        label: 'Delete',
                        onSelect: () => void handleDeleteCustomer(row),
                        tone: 'danger',
                      },
                    ]}
                  />
                ),
              },
            ]}
          />
        </div>
      </Card>

      <CustomerFormModal
        open={isFormOpen}
        mode={modalMode}
        values={formValues}
        statusOptions={statusOptions.map((item) => ({ value: item.value, label: item.label }))}
        audioFileName={audioFile?.name ?? selectedCustomer?.audio_file_id ?? null}
        onClose={() => setIsFormOpen(false)}
        onChange={(field, value) =>
          setFormValues((current) => ({
            ...current,
            [field]: value,
          }))
        }
        onFileChange={setAudioFile}
        onSubmit={() => void handleSubmitCustomer()}
        isSubmitting={isFormSubmitting}
      />
    </section>
  )
}
