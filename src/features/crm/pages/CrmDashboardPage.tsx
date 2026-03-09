import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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

const selectClassName =
  'min-h-10 rounded-md border border-[var(--border)] bg-white px-3 text-sm text-[var(--foreground)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgba(15,23,42,0.08)]'

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
      title: `${customer.full_name} o'chirilsinmi?`,
      description: "Mijoz yozuvi butunlay o'chiriladi va ortga qaytarilmaydi.",
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
        title: "Customer o'chirildi",
        description: `${customer.full_name} CRM ro'yxatidan olib tashlandi.`,
        tone: 'success',
      })
    } catch (error) {
      showToast({
        title: "Customer o'chirilmadi",
        description: getApiErrorMessage(error),
        tone: 'error',
      })
    }
  }

  async function handleBulkDelete() {
    if (selectedCustomerIds.length === 0) {
      showToast({
        title: 'Customer tanlanmagan',
        description: "Bulk delete uchun kamida bitta customer belgilang.",
        tone: 'info',
      })
      return
    }

    const approved = await confirm({
      title: `${selectedCustomerIds.length} ta customer o'chirilsinmi?`,
      description: "Bulk delete tasdiqlansa barcha tanlangan customerlar tizimdan o'chiriladi.",
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
        title: 'Bulk delete bajarildi',
        description: "Tanlangan customerlar muvaffaqiyatli o'chirildi.",
        tone: 'success',
      })
    } catch (error) {
      showToast({
        title: 'Bulk delete bajarilmadi',
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
        title: "Majburiy maydonlar to'liq emas",
        description: 'Full name, platform, phone number va status kiritilishi kerak.',
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
        title: modalMode === 'create' ? 'Customer yaratildi' : 'Customer yangilandi',
        description: "CRM dashboard ro'yxati yangilandi.",
        tone: 'success',
      })
    } catch (error) {
      showToast({
        title: 'Customer saqlanmadi',
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
        eyebrow="CRM / Day 7"
        title="CRM dashboard yuklanmoqda"
        description="Customers, status stats va sales bloklari backenddan olinmoqda."
      />
    )
  }

  if (dashboardQuery.isError && !dashboardQuery.data) {
    return (
      <ErrorStateBlock
        eyebrow="CRM / Day 7"
        title="CRM dashboard ochilmadi"
        description="CRM dashboard endpoint xatolik qaytardi. Retry qilib qayta urinib ko'ring."
        actionLabel="Retry"
        onAction={() => {
          void refreshAll()
        }}
      />
    )
  }

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-[var(--muted)]">CRM / Day 7</p>
          <h1 className="mt-2 text-4xl font-semibold text-[var(--foreground)]">Customers va sales analytics</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted-strong)]">
            Search, status/platform filter, create-edit multipart form, bulk delete, detail sahifa va sales bloklari
            shu dashboard ichida ishlaydi.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => void refreshAll()}>
            Refresh
          </Button>
          <Button variant="ghost" onClick={() => void handleBulkDelete()}>
            Delete selected
          </Button>
          <Button onClick={openCreateModal}>Add customer</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Visible customers</p>
          <p className="mt-3 text-3xl font-semibold text-[var(--foreground)]">
            {formatCompactNumber(displayedCustomers.length)}
          </p>
          <p className="mt-2 text-sm text-[var(--muted)]">Dashboard query va platform filter asosida.</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Today leads</p>
          <p className="mt-3 text-3xl font-semibold text-[var(--foreground)]">
            {formatCompactNumber(salesStatsQuery.data?.today ?? 0)}
          </p>
          <p className="mt-2 text-sm text-[var(--muted)]">Daily sales stats endpoint.</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">This week</p>
          <p className="mt-3 text-3xl font-semibold text-[var(--foreground)]">
            {formatCompactNumber(salesStatsQuery.data?.this_week ?? 0)}
          </p>
          <p className="mt-2 text-sm text-[var(--muted)]">Local/international filter bilan.</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Conversion</p>
          <p className="mt-3 text-3xl font-semibold text-[var(--foreground)]">
            {`${Math.round(conversionQuery.data?.conversion_rate ?? 0)}%`}
          </p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {conversionQuery.data?.project_started_count ?? 0} / {conversionQuery.data?.total_customers ?? 0} lead.
          </p>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-[var(--foreground)]">Search</span>
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Name, phone, username yoki note bo'yicha qidirish"
              />
            </label>
          </div>
          <div className="min-w-[180px]">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-[var(--foreground)]">Status</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className={selectClassName}
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
              <span className="text-sm font-medium text-[var(--foreground)]">Platform</span>
              <select
                value={platformFilter}
                onChange={(event) => setPlatformFilter(event.target.value)}
                className={selectClassName}
              >
                <option value="">All platforms</option>
                {availablePlatforms.map((platform) => (
                  <option key={platform} value={platform}>
                    {platform}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="min-w-[180px]">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-[var(--foreground)]">Sales type</span>
              <select
                value={salesCustomerType}
                onChange={(event) => setSalesCustomerType(event.target.value)}
                className={selectClassName}
              >
                <option value="">All leads</option>
                <option value="local">Local</option>
                <option value="international">International</option>
              </select>
            </label>
          </div>
          <label className="flex min-h-10 items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--accent-soft)]/55 px-3">
            <input type="checkbox" checked={showAll} onChange={(event) => setShowAll(event.target.checked)} />
            <span className="text-sm text-[var(--muted-strong)]">Show all</span>
          </label>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Card className="p-6">
          <SectionTitle
            eyebrow="Customers"
            title="CRM dashboard table"
            description="Checkbox selection, detail route, edit/delete actionlari va dynamic status ranglari shu yerda."
          />
          <div className="mt-6">
            <DataTable
              caption="CRM customers table"
              rows={displayedCustomers}
              getRowKey={(row) => String(row.id)}
              emptyState={
                <EmptyStateBlock
                  eyebrow="CRM"
                  title="Customer topilmadi"
                  description="Filterlar hozircha natija qaytarmadi yoki dashboard bo'sh."
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
                        className="text-left font-semibold text-[var(--foreground)] transition hover:text-[var(--accent)]"
                      >
                        {row.full_name}
                      </button>
                      <p className="text-xs text-[var(--muted)]">{row.username || row.phone_number}</p>
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
                  header: 'Actions',
                  render: (row) => (
                    <div className="flex flex-wrap gap-2">
                      <Button className="px-3 text-xs" variant="secondary" onClick={() => navigate(`/crm/customers/${row.id}`)}>
                        View
                      </Button>
                      <Button className="px-3 text-xs" variant="ghost" onClick={() => openEditModal(row)}>
                        Edit
                      </Button>
                      <Button className="px-3 text-xs" variant="danger" onClick={() => void handleDeleteCustomer(row)}>
                        Delete
                      </Button>
                    </div>
                  ),
                },
              ]}
            />
          </div>
        </Card>

        <div className="grid gap-6">
          <Card className="p-6">
            <SectionTitle
              eyebrow="Status summary"
              title="Dynamic status breakdown"
              description="Backenddan kelgan status foizlari va count ko'rinishi."
            />
            <div className="mt-5 grid gap-3">
              {Object.entries(summaryQuery.data?.status_percentages ?? {}).length > 0 ? (
                Object.entries(summaryQuery.data?.status_percentages ?? {}).map(([statusKey, value]) => (
                  <div key={statusKey} className="rounded-lg border border-[var(--border)] bg-[var(--accent-soft)]/45 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <StatusPill status={statusKey} statusMetaMap={statusMetaMap} />
                      <span className="text-sm font-semibold text-[var(--foreground)]">{Math.round(value)}%</span>
                    </div>
                    <p className="mt-2 text-sm text-[var(--muted)]">
                      Count: {dashboardQuery.data?.status_stats?.[statusKey] ?? summaryQuery.data?.status_dict?.[statusKey] ?? 0}
                    </p>
                  </div>
                ))
              ) : (
                <EmptyStateBlock
                  eyebrow="Status"
                  title="Status statistikasi yo'q"
                  description="Status summary endpointdan ma'lumot kelmadi."
                />
              )}
            </div>
          </Card>

          <Card className="p-6">
            <SectionTitle
              eyebrow="Sales"
              title="Sales stats va conversion"
              description="Leadlar oqimi va project_started conversion ko'rsatkichlari."
            />
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                ['Today', salesStatsQuery.data?.today ?? 0],
                ['Yesterday', salesStatsQuery.data?.yesterday ?? 0],
                ['This week', salesStatsQuery.data?.this_week ?? 0],
                ['Last week', salesStatsQuery.data?.last_week ?? 0],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-[var(--border)] bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">{label}</p>
                  <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{formatCompactNumber(Number(value))}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--accent-soft)]/45 p-4">
              <p className="text-sm font-semibold text-[var(--foreground)]">Conversion period</p>
              <p className="mt-2 text-sm text-[var(--muted-strong)]">
                {conversionQuery.data?.period ?? 'Last 100 leads'} | Started:{' '}
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
