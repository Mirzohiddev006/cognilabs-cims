import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MetricCard } from '../../ceo/components/MetricCard'
import { crmService } from '../../../shared/api/services/crm.service'
import type { CustomerSummary, DynamicStatusOption } from '../../../shared/api/types'
import { useConfirm } from '../../../shared/confirm/useConfirm'
import { useAsyncData } from '../../../shared/hooks/useAsyncData'
import { getApiErrorMessage } from '../../../shared/lib/api-error'
import { formatCompactNumber, formatShortDate } from '../../../shared/lib/format'
import { useToast } from '../../../shared/toast/useToast'
import { Button } from '../../../shared/ui/button'
import { Card } from '../../../shared/ui/card'
import { DataTable } from '../../../shared/ui/data-table'
import { Input } from '../../../shared/ui/input'
import { SectionTitle } from '../../../shared/ui/section-title'
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

function StatusPill({
  status,
  statusMetaMap,
}: {
  status: string
  statusMetaMap: Map<string, DynamicStatusOption>
}) {
  const meta = statusMetaMap.get(status)

  return (
    <span
      className="inline-flex w-fit items-center rounded-md border px-2 py-0.5 text-xs font-medium"
      style={{
        borderColor: meta?.color ?? 'var(--border)',
        color: meta?.color ?? 'var(--foreground)',
        background: meta?.color ? `${meta.color}14` : 'var(--accent-soft)',
      }}
    >
      {meta?.label ?? status}
    </span>
  )
}

export function CrmDashboardPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { confirm } = useConfirm()

  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [statusFilter, setStatusFilter] = useState('')
  const [platformFilter, setPlatformFilter] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [salesCustomerType, setSalesCustomerType] = useState('')
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<number[]>([])

  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSummary | null>(null)
  const [formValues, setFormValues] = useState<CustomerFormValues>(initialFormValues)
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isFormSubmitting, setIsFormSubmitting] = useState(false)

  const dashboardQuery = useAsyncData(
    () =>
      crmService.dashboard({
        search: deferredSearch || undefined,
        status_filter: statusFilter || undefined,
        show_all: showAll,
      }),
    [deferredSearch, statusFilter, showAll],
  )
  const statusesQuery = useAsyncData(() => crmService.dynamicStatuses(), [])
  const summaryQuery = useAsyncData(() => crmService.summaryStats(), [])
  const salesStatsQuery = useAsyncData(
    () => crmService.salesStats(salesCustomerType || undefined),
    [salesCustomerType],
  )
  const conversionQuery = useAsyncData(() => crmService.conversionRate(), [])

  const customers = dashboardQuery.data?.customers ?? emptyCustomers
  const statusOptions = statusesQuery.data ?? emptyStatuses

  const statusMetaMap = useMemo(() => new Map(statusOptions.map((item) => [item.value, item])), [statusOptions])

  const availablePlatforms = useMemo(() => {
    return Array.from(new Set(customers.map((item) => item.platform).filter(Boolean))).sort()
  }, [customers])

  const displayedCustomers = useMemo(() => {
    if (!platformFilter) {
      return customers
    }

    return customers.filter((customer) => customer.platform === platformFilter)
  }, [customers, platformFilter])

  useEffect(() => {
    setSelectedCustomerIds((current) => current.filter((id) => displayedCustomers.some((customer) => customer.id === id)))
  }, [displayedCustomers])

  const areAllDisplayedSelected =
    displayedCustomers.length > 0 && displayedCustomers.every((customer) => selectedCustomerIds.includes(customer.id))

  async function refreshAll() {
    await Promise.all([
      dashboardQuery.refetch(),
      statusesQuery.refetch(),
      summaryQuery.refetch(),
      salesStatsQuery.refetch(),
      conversionQuery.refetch(),
    ])
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

  function toggleCustomerSelection(customerId: number, checked: boolean) {
    setSelectedCustomerIds((current) =>
      checked ? Array.from(new Set([...current, customerId])) : current.filter((id) => id !== customerId),
    )
  }

  function toggleAllDisplayed(checked: boolean) {
    if (!checked) {
      setSelectedCustomerIds((current) =>
        current.filter((id) => !displayedCustomers.some((customer) => customer.id === id)),
      )
      return
    }

    setSelectedCustomerIds((current) =>
      Array.from(new Set([...current, ...displayedCustomers.map((customer) => customer.id)])),
    )
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
      await Promise.all([dashboardQuery.refetch(), summaryQuery.refetch(), conversionQuery.refetch()])
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

  async function handleBulkDelete() {
    if (selectedCustomerIds.length === 0) {
      showToast({
        title: 'No customers selected',
        description: 'Please select at least one customer for bulk deletion.',
        tone: 'info',
      })
      return
    }

    const approved = await confirm({
      title: `Delete ${selectedCustomerIds.length} customers?`,
      description: 'Selected customers will be permanently removed from the system.',
      confirmLabel: 'Delete selected',
      cancelLabel: 'Cancel',
      tone: 'danger',
    })

    if (!approved) {
      return
    }

    try {
      await crmService.bulkDelete(selectedCustomerIds)
      setSelectedCustomerIds([])
      await Promise.all([dashboardQuery.refetch(), summaryQuery.refetch(), conversionQuery.refetch()])
      showToast({
        title: 'Bulk delete complete',
        description: 'Selected customers have been successfully removed.',
        tone: 'success',
      })
    } catch (error) {
      showToast({
        title: 'Bulk delete failed',
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
      await Promise.all([
        dashboardQuery.refetch(),
        summaryQuery.refetch(),
        salesStatsQuery.refetch(),
        conversionQuery.refetch(),
      ])
      showToast({
        title: modalMode === 'create' ? 'Customer created' : 'Customer updated',
        description: 'The CRM dashboard list has been refreshed.',
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
        eyebrow="CRM / Leads"
        title="CRM dashboard loading"
        description="Retrieving customers, status statistics, and sales data."
      />
    )
  }

  if (dashboardQuery.isError && !dashboardQuery.data) {
    return (
      <ErrorStateBlock
        eyebrow="CRM / Leads"
        title="CRM dashboard failed to load"
        description="Could not retrieve CRM data. Please retry."
        actionLabel="Retry"
        onAction={() => {
          void refreshAll()
        }}
      />
    )
  }

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Sales Dashboard</h1>
          <p className="mt-2 text-sm font-medium text-zinc-500">
            Track customer leads, sales performance, and conversion metrics in real-time.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg bg-white/5 p-1">
            <Button size="md" variant="ghost" className="rounded-md bg-white/5 px-4 text-white">Overview</Button>
            <Button size="md" variant="ghost" className="rounded-md px-4">Analytics</Button>
          </div>
          <Button variant="action" onClick={openCreateModal}>+ Add Customer</Button>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-4">
        <MetricCard label="Today's Customers" value={formatCompactNumber(salesStatsQuery.data?.today ?? 0)} caption="Direct leads" />
        <MetricCard label="Need to Call" value={formatCompactNumber(salesStatsQuery.data?.this_week ?? 0)} caption="Follow-ups required" />
        <MetricCard label="Total Leads" value={formatCompactNumber(displayedCustomers.length)} caption="System records" />
        <MetricCard label="Conversion Rate" value={`${Math.round(conversionQuery.data?.conversion_rate ?? 0)}%`} caption="Lead to project" />
      </div>

      <Card className="p-6 bg-white/5 border-white/10">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[220px] flex-1">
            <label className="grid gap-2">
              <span className="text-sm font-bold text-white tracking-tight">Search</span>
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name, phone, or notes..."
              />
            </label>
          </div>
          <div className="min-w-[180px]">
            <label className="grid gap-2">
              <span className="text-sm font-bold text-white tracking-tight">Status</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="min-h-10 rounded-xl border border-[var(--border)] bg-black/40 px-4 text-sm text-white outline-none transition focus:border-blue-500/50"
              >
                <option value="">All statuses</option>
                {(dashboardQuery.data?.status_choices ?? statusOptions).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="min-w-[180px]">
            <label className="grid gap-2">
              <span className="text-sm font-bold text-white tracking-tight">Platform</span>
              <select
                value={platformFilter}
                onChange={(event) => setPlatformFilter(event.target.value)}
                className="min-h-10 rounded-xl border border-[var(--border)] bg-black/40 px-4 text-sm text-white outline-none transition focus:border-blue-500/50"
              >
                <option value="" className="bg-black">All platforms</option>
                {availablePlatforms.map((platform) => (
                  <option key={platform} value={platform} className="bg-black">
                    {platform}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="min-w-[180px]">
            <label className="grid gap-2">
              <span className="text-sm font-bold text-white tracking-tight">Sales type</span>
              <select
                value={salesCustomerType}
                onChange={(event) => setSalesCustomerType(event.target.value)}
                className="min-h-10 rounded-xl border border-[var(--border)] bg-black/40 px-4 text-sm text-white outline-none transition focus:border-blue-500/50"
              >
                <option value="" className="bg-black">All leads</option>
                <option value="local" className="bg-black">Local</option>
                <option value="international" className="bg-black">International</option>
              </select>
            </label>
          </div>
          <label className="flex min-h-10 items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 cursor-pointer transition hover:bg-white/10">
            <input type="checkbox" className="w-4 h-4 rounded border-white/20 bg-black/40 text-blue-500 focus:ring-blue-500/50" checked={showAll} onChange={(event) => setShowAll(event.target.checked)} />
            <span className="text-sm font-bold text-white tracking-tight">Show all</span>
          </label>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Card className="p-6 bg-white/5 border-white/10">
          <SectionTitle
            eyebrow="Customers"
            title="CRM dashboard table"
            description="Advanced table with status indicators and quick actions."
          />
          <div className="mt-6">
            <DataTable
              caption="CRM customers table"
              rows={displayedCustomers}
              getRowKey={(row) => String(row.id)}
              emptyState={
                <EmptyStateBlock
                  eyebrow="CRM"
                  title="No customers found"
                  description="Current filters yielded no results or the database is empty."
                />
              }
              columns={[
                {
                  key: 'select',
                  header: (
                    <input
                      type="checkbox"
                      checked={areAllDisplayedSelected}
                      onChange={(event) => toggleAllDisplayed(event.target.checked)}
                      aria-label="Select all customers"
                    />
                  ),
                  render: (row) => (
                    <input
                      type="checkbox"
                      checked={selectedCustomerIds.includes(row.id)}
                      onChange={(event) => toggleCustomerSelection(row.id, event.target.checked)}
                      aria-label={`Select ${row.full_name}`}
                    />
                  ),
                },
                {
                  key: 'customer',
                  header: 'Customer',
                  render: (row) => (
                    <div>
                      <button
                        type="button"
                        onClick={() => navigate(`/crm/customers/${row.id}`)}
                        className="text-left font-bold text-white tracking-tight transition hover:text-blue-400"
                      >
                        {row.full_name}
                      </button>
                      <p className="text-xs font-medium text-zinc-500">{row.username || row.phone_number}</p>
                    </div>
                  ),
                },
                {
                  key: 'status',
                  header: 'Status',
                  render: (row) => <StatusPill status={row.status} statusMetaMap={statusMetaMap} />,
                },
                {
                  key: 'platform',
                  header: 'Platform',
                  render: (row) => row.platform,
                },
                {
                  key: 'assistant',
                  header: 'Assistant',
                  render: (row) => row.assistant_name || '-',
                },
                {
                  key: 'created_at',
                  header: 'Created',
                  render: (row) => formatShortDate(row.created_at),
                },
                {
                  key: 'actions',
                header: '',
                  render: (row) => (
                  <div className="flex items-center justify-end gap-3">
                    <button onClick={() => navigate(`/crm/customers/${row.id}`)} className="text-zinc-500 hover:text-white transition-colors" title="View Detail">
                       <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                       </svg>
                    </button>
                    <button onClick={() => openEditModal(row)} className="text-zinc-500 hover:text-white transition-colors" title="Edit">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button onClick={() => void handleDeleteCustomer(row)} className="text-zinc-500 hover:text-rose-500 transition-colors" title="Delete">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                    <button onClick={() => void handleBulkDelete()} className="text-zinc-500 hover:text-white transition-colors" title="Bulk Ops">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-7 0V4" />
                      </svg>
                    </button>
                    </div>
                  ),
                },
              ]}
            />
          </div>
        </Card>

        <div className="grid gap-6">
          <Card className="p-6 bg-white/5 border-white/10">
            <SectionTitle
              eyebrow="Status summary"
              title="Breakdown"
              description="Real-time status distribution percentage."
            />
            <div className="mt-5 grid gap-3">
              {Object.entries(summaryQuery.data?.status_percentages ?? {}).length > 0 ? (
                Object.entries(summaryQuery.data?.status_percentages ?? {}).map(([statusKey, value]) => (
                  <div key={statusKey} className="rounded-xl border border-white/10 bg-black/40 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <StatusPill status={statusKey} statusMetaMap={statusMetaMap} />
                      <span className="text-sm font-bold text-white">{Math.round(value)}%</span>
                    </div>
                    <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                      Volume: {dashboardQuery.data?.status_stats?.[statusKey] ?? summaryQuery.data?.status_dict?.[statusKey] ?? 0}
                    </p>
                  </div>
                ))
              ) : (
                <EmptyStateBlock
                  eyebrow="Status"
                  title="No statistics"
                  description="Status summary data unavailable."
                />
              )}
            </div>
          </Card>

          <Card className="p-6 bg-white/5 border-white/10">
            <SectionTitle
              eyebrow="Sales"
              title="Analytics"
              description="Lead flow and project conversion rates."
            />
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                ['Today', salesStatsQuery.data?.today ?? 0],
                ['Yesterday', salesStatsQuery.data?.yesterday ?? 0],
                ['This week', salesStatsQuery.data?.this_week ?? 0],
                ['Last week', salesStatsQuery.data?.last_week ?? 0],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-500">{label}</p>
                  <p className="mt-2 text-2xl font-bold text-white tracking-tight">{formatCompactNumber(Number(value))}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-xl border border-white/10 bg-black/40 p-4">
              <p className="text-xs font-bold text-white tracking-tight">Conversion period</p>
              <p className="mt-2 text-xs font-medium text-zinc-500">
                {conversionQuery.data?.period ?? 'Last 100 leads'} | Projects:{' '}
                {conversionQuery.data?.project_started_count ?? 0} | Total:{' '}
                {conversionQuery.data?.total_customers ?? 0}
              </p>
            </div>
          </Card>
        </div>
      </div>

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
