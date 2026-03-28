import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { useAppShell } from '../../../app/hooks/useAppShell'
import { crmService } from '../../../shared/api/services/crm.service'
import { env } from '../../../shared/config/env'
import type { CustomerSummary, DynamicStatusOption } from '../../../shared/api/types'
import { useConfirm } from '../../../shared/confirm/useConfirm'
import { useAsyncData } from '../../../shared/hooks/useAsyncData'
import { getIntlLocale } from '../../../shared/i18n/translations'
import { getApiErrorMessage } from '../../../shared/lib/api-error'
import { cn } from '../../../shared/lib/cn'
import {
  formatUsernameHandle,
  getCustomerDisplayName,
  getCustomerDisplayPlatform,
  getCustomerPlatforms,
} from '../../../shared/lib/customer-display'
import { formatCompactNumber } from '../../../shared/lib/format'
import { useToast } from '../../../shared/toast/useToast'
import { Badge } from '../../../shared/ui/badge'
import { Button } from '../../../shared/ui/button'
import { Card } from '../../../shared/ui/card'
import { ActionsMenu } from '../../../shared/ui/actions-menu'
import { DataTable } from '../../../shared/ui/data-table'
import { Input } from '../../../shared/ui/input'
import { PageHeader } from '../../../shared/ui/page-header'
import { SelectField, type SelectFieldOption } from '../../../shared/ui/select-field'
import { EmptyStateBlock, ErrorStateBlock, LoadingStateBlock } from '../../../shared/ui/state-block'
import { CustomerDetailDrawer } from '../components/CustomerDetailDrawer'
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

function toApiDateTimeWithOffset(value: string) {
  const [datePart, timePart] = value.split('T')

  if (!datePart || !timePart) {
    return value
  }

  const [year, month, day] = datePart.split('-').map(Number)
  const [hours, minutes] = timePart.split(':').map(Number)
  const date = new Date(year, month - 1, day, hours, minutes, 0)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  const offsetMinutes = -date.getTimezoneOffset()
  const sign = offsetMinutes >= 0 ? '+' : '-'
  const absoluteOffset = Math.abs(offsetMinutes)
  const offsetHours = String(Math.floor(absoluteOffset / 60)).padStart(2, '0')
  const offsetMins = String(absoluteOffset % 60).padStart(2, '0')

  return `${datePart}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00${sign}${offsetHours}:${offsetMins}`
}

function toFormValues(customer?: CustomerSummary | null): CustomerFormValues {
  if (!customer) {
    return initialFormValues
  }

  return {
    full_name: customer.full_name ?? '',
    platform: getCustomerDisplayPlatform(customer) ?? '',
    phone_number: customer.phone_number ?? customer.phone ?? '',
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
  const normalizedStatus = values.status.trim()

  const mappedFields: Array<[string, string]> = [
    ['full_name', values.full_name.trim()],
    ['platform', values.platform.trim()],
    ['phone_number', values.phone_number.trim()],
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

  if (normalizedStatus) {
    formData.append('status', normalizedStatus)

    // Some CRM update endpoints still expect the legacy field name on edit.
    if (mode === 'edit') {
      formData.append('customer_status', normalizedStatus)
    }
  }

  if (values.recall_time) {
    formData.append('recall_time', toApiDateTimeWithOffset(values.recall_time))
  }

  if (mode === 'edit' && values.clear_recall_time) {
    formData.append('clear_recall_time', 'true')
  }

  if (audioFile) {
    formData.append('audio', audioFile)
  }

  return formData
}

function buildCustomerDraft(customer: CustomerSummary, values: CustomerFormValues) {
  const normalizedRecallTime = values.clear_recall_time
    ? null
    : values.recall_time
      ? toApiDateTimeWithOffset(values.recall_time)
      : customer.recall_time ?? null

  return {
    ...customer,
    full_name: values.full_name.trim(),
    platform: values.platform.trim(),
    phone_number: values.phone_number.trim(),
    status: values.status.trim(),
    username: values.username.trim(),
    assistant_name: values.assistant_name.trim(),
    notes: values.notes.trim(),
    recall_time: normalizedRecallTime,
    conversation_language: values.conversation_language.trim(),
  }
}

function getInitials(name: string) {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .map((part) => part.replace(/^[@+]+/, ''))
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

  return new Intl.DateTimeFormat(getIntlLocale(), {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(parsed)
}

function resolveAudioUrl(customer: CustomerSummary) {
  if (customer.audio_url) {
    return customer.audio_url
  }

  if (!customer.audio_file_id) {
    return null
  }

  return new URL(`/crm/customers/audio/${customer.audio_file_id}`, env.apiBaseUrl).toString()
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

function normalizeFilterValue(value?: string | null) {
  return (value ?? '').trim().toLowerCase()
}

function normalizePhoneValue(value?: string | null) {
  return (value ?? '').replace(/\D/g, '')
}

function buildNormalizedStatusMetaMap(statusOptions: DynamicStatusOption[]) {
  const map = new Map<string, DynamicStatusOption>()

  for (const option of statusOptions) {
    const normalizedValue = normalizeStatusKey(option.value)
    const normalizedLabel = normalizeStatusKey(option.label)

    if (normalizedValue) {
      map.set(normalizedValue, option)
    }

    if (normalizedLabel) {
      map.set(normalizedLabel, option)
    }
  }

  return map
}

function buildStatusFilterOptions(
  statusChoices: Array<{ value?: string | null; label?: string | null }>,
  statusOptions: DynamicStatusOption[],
  customers: CustomerSummary[],
) {
  const optionsByKey = new Map<string, SelectFieldOption>()

  const registerOption = (rawValue?: string | null, rawLabel?: string | null) => {
    const label = (rawLabel ?? rawValue ?? '').trim()
    const normalizedValue = normalizeStatusKey(rawValue ?? rawLabel ?? '')

    if (!label || !normalizedValue || optionsByKey.has(normalizedValue)) {
      return
    }

    optionsByKey.set(normalizedValue, {
      value: normalizedValue,
      label,
    })
  }

  statusChoices.forEach((option) => registerOption(option.value, option.label))
  statusOptions.forEach((option) => registerOption(option.value, option.label))
  customers.forEach((customer) => registerOption(customer.status, customer.status))

  return [
    { value: '', label: 'All statuses' },
    ...Array.from(optionsByKey.values()).sort((left, right) => left.label.localeCompare(right.label)),
  ]
}

function getCustomerStatusKeys(customer: CustomerSummary, statusMetaMap: Map<string, DynamicStatusOption>) {
  const keys = new Set<string>()
  const rawStatusKey = normalizeStatusKey(customer.status)

  if (rawStatusKey) {
    keys.add(rawStatusKey)
  }

  const meta = statusMetaMap.get(rawStatusKey)

  if (meta) {
    const metaValueKey = normalizeStatusKey(meta.value)
    const metaLabelKey = normalizeStatusKey(meta.label)

    if (metaValueKey) {
      keys.add(metaValueKey)
    }

    if (metaLabelKey) {
      keys.add(metaLabelKey)
    }
  }

  return keys
}

function StatusBadge({
  status,
  statusMetaMap,
}: {
  status: string
  statusMetaMap: Map<string, DynamicStatusOption>
}) {
  const meta = statusMetaMap.get(normalizeStatusKey(status))

  return (
    <span
      className="inline-flex items-center rounded-md border px-2.5 py-1 text-[13px] font-medium capitalize"
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

function TableAudioControl({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  useEffect(() => {
    const audio = audioRef.current

    if (!audio) {
      return
    }

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleEnded = () => setIsPlaying(false)

    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.pause()
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [])

  function togglePlayback() {
    const audio = audioRef.current

    if (!audio) {
      return
    }

    if (audio.paused) {
      void audio.play()
      return
    }

    audio.pause()
  }

  return (
    <div className="flex items-center" onClick={(event) => event.stopPropagation()}>
      <audio ref={audioRef} preload="none" src={src} className="hidden" />
      <button
        type="button"
        onClick={togglePlayback}
        className={cn(
          'inline-flex min-h-9 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition',
          isPlaying
            ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
            : 'border-[var(--border)] bg-[var(--input-surface)] text-[var(--foreground)] hover:border-[var(--border-hover)] hover:bg-[var(--input-surface-hover)]',
        )}
        aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
      >
        <span className="grid h-5 w-5 place-items-center rounded-full bg-white/8">
          {isPlaying ? (
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-current" aria-hidden="true">
              <path d="M4.5 3.5h2v9h-2zm5 0h2v9h-2z" />
            </svg>
          ) : (
            <svg viewBox="0 0 16 16" className="ml-0.5 h-3.5 w-3.5 fill-current" aria-hidden="true">
              <path d="M5 3.8v8.4a.6.6 0 0 0 .93.5l6.2-4.2a.6.6 0 0 0 0-1L5.93 3.3A.6.6 0 0 0 5 3.8Z" />
            </svg>
          )}
        </span>
        {isPlaying ? 'Pause' : 'Play'}
      </button>
    </div>
  )
}

function MetricCard({
  label,
  value,
  description,
  tone = 'blue',
}: {
  label: string
  value: string | number
  description: string
  tone?: 'blue' | 'success' | 'warning' | 'violet' | 'danger'
}) {
  const toneClassNames = {
    blue: 'border-blue-500/15 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.10),0_0_20px_rgba(59,130,246,0.06)]',
    success: 'border-emerald-500/15 shadow-[inset_0_0_0_1px_rgba(34,197,94,0.10),0_0_20px_rgba(34,197,94,0.05)]',
    warning: 'border-amber-500/15 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.10),0_0_20px_rgba(245,158,11,0.05)]',
    violet: 'border-violet-500/15 shadow-[inset_0_0_0_1px_rgba(139,92,246,0.10),0_0_20px_rgba(139,92,246,0.05)]',
    danger: 'border-rose-500/15 shadow-[inset_0_0_0_1px_rgba(244,63,94,0.10),0_0_20px_rgba(244,63,94,0.05)]',
  }
  const toneLabelClassNames = {
    blue: 'text-blue-300/80',
    success: 'text-emerald-300/80',
    warning: 'text-amber-300/80',
    violet: 'text-violet-300/80',
    danger: 'text-rose-300/80',
  }

  return (
    <Card variant="metric" className={cn('flex min-h-30 flex-col justify-between p-4', toneClassNames[tone])}>
      <div>
        <p className={cn('text-[10px] font-semibold uppercase tracking-[0.28em]', toneLabelClassNames[tone])}>{label}</p>
        <p className="mt-3 text-2xl leading-none font-semibold text-white tracking-tight">
          {typeof value === 'number' ? formatCompactNumber(value) : value}
        </p>
      </div>
      <p className="text-xs leading-5 text-(--muted)">{description}</p>
    </Card>
  )
}


export function CrmDashboardPage() {
  const { isSidebarCollapsed } = useAppShell()
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
  const [pageSize, setPageSize] = useState('75')

  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSummary | null>(null)
  const [detailCustomer, setDetailCustomer] = useState<CustomerSummary | null>(null)
  const [formValues, setFormValues] = useState<CustomerFormValues>(initialFormValues)
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isFormSubmitting, setIsFormSubmitting] = useState(false)

  const pageSizeValue = Number(pageSize) || 75

  const dashboardQuery = useAsyncData(() => crmService.dashboardWithAllCustomers(), [])
  const statusesQuery = useAsyncData(() => crmService.dynamicStatuses(), [])
  const summaryQuery = useAsyncData(() => crmService.summaryStats(), [])

  const customers = dashboardQuery.data?.customers ?? emptyCustomers
  const statusOptions = statusesQuery.data ?? emptyStatuses

  const statusMetaMap = useMemo(() => buildNormalizedStatusMetaMap(statusOptions), [statusOptions])
  const statusFilterOptions = useMemo(
    () => buildStatusFilterOptions(dashboardQuery.data?.status_choices ?? [], statusOptions, customers),
    [customers, dashboardQuery.data?.status_choices, statusOptions],
  )

  const availablePlatforms = useMemo(() => {
    return Array.from(
      new Set(
        customers
          .flatMap((item) => getCustomerPlatforms(item))
          .filter(Boolean),
      ),
    ).sort((a, b) => a.localeCompare(b))
  }, [customers])

  const displayedCustomers = useMemo(() => {
    const normalizedSearch = normalizeFilterValue(deferredSearch)
    const normalizedPhone = normalizePhoneValue(deferredPhoneFilter)
    const normalizedStatusFilter = normalizeStatusKey(statusFilter)
    const normalizedPlatformFilter = normalizeFilterValue(platformFilter)
    const startDate = dateStart ? new Date(`${dateStart}T00:00:00`) : null
    const endDate = dateEnd ? new Date(`${dateEnd}T23:59:59.999`) : null

    return customers.filter((customer) => {
      const customerPlatforms = getCustomerPlatforms(customer)
      const matchesSearch = normalizedSearch
        ? [
            getCustomerDisplayName(customer),
            formatUsernameHandle(customer.username),
            customer.phone_number,
            customer.phone,
            customer.notes,
            getCustomerDisplayPlatform(customer),
            customer.status,
            customer.assistant_name,
            customer.conversation_language,
          ]
            .filter(Boolean)
            .some((value) => normalizeFilterValue(String(value)).includes(normalizedSearch))
        : true

      const matchesPhone = normalizedPhone
        ? normalizePhoneValue(customer.phone_number ?? customer.phone).includes(normalizedPhone)
        : true

      const matchesStatus = normalizedStatusFilter
        ? getCustomerStatusKeys(customer, statusMetaMap).has(normalizedStatusFilter)
        : true
      const matchesPlatform = normalizedPlatformFilter
        ? customerPlatforms.some((platform) => normalizeFilterValue(platform) === normalizedPlatformFilter)
        : true

      const createdAt = normalizeDateValue(customer.created_at)
      const matchesStart = startDate && createdAt ? createdAt >= startDate : !startDate
      const matchesEnd = endDate && createdAt ? createdAt <= endDate : !endDate

      return matchesSearch && matchesPhone && matchesStatus && matchesPlatform && matchesStart && matchesEnd
    })
  }, [customers, dateEnd, dateStart, deferredPhoneFilter, deferredSearch, platformFilter, statusFilter, statusMetaMap])

  async function refreshAll() {
    await Promise.allSettled([
      dashboardQuery.refetch(),
      statusesQuery.refetch(),
      summaryQuery.refetch(),
    ])
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

  function openCustomerDrawer(customer: CustomerSummary) {
    setDetailCustomer(customer)
  }

  function syncCustomerInUi(nextCustomer: CustomerSummary) {
    dashboardQuery.setData((current) => {
      if (!current) {
        return current
      }

      return {
        ...current,
        customers: current.customers.map((customer) =>
          customer.id === nextCustomer.id ? { ...customer, ...nextCustomer } : customer,
        ),
      }
    })

    setSelectedCustomer((current) => (current?.id === nextCustomer.id ? nextCustomer : current))
    setDetailCustomer((current) => (current?.id === nextCustomer.id ? nextCustomer : current))
  }

  async function handleDeleteCustomer(customer: CustomerSummary) {
    const customerName = getCustomerDisplayName(customer)
    const approved = await confirm({
      title: `Delete ${customerName}?`,
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
      await Promise.allSettled([dashboardQuery.refetch(), summaryQuery.refetch()])
      showToast({
        title: 'Customer deleted',
        description: `${customerName} has been removed from the CRM list.`,
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
      let updatedCustomer: CustomerSummary | null = null

      if (modalMode === 'create') {
        await crmService.createCustomer(formData)
      } else if (selectedCustomer) {
        const draftedCustomer = buildCustomerDraft(selectedCustomer, formValues)

        await crmService.patchCustomer(selectedCustomer.id, formData)
        try {
          updatedCustomer = buildCustomerDraft(await crmService.detail(selectedCustomer.id), formValues)
        } catch {
          updatedCustomer = draftedCustomer
        }

        syncCustomerInUi(updatedCustomer)
      }

      setIsFormOpen(false)
      setAudioFile(null)
      await Promise.allSettled([
        dashboardQuery.refetch(),
        summaryQuery.refetch(),
        statusesQuery.refetch(),
      ])

      if (updatedCustomer) {
        syncCustomerInUi(updatedCustomer)
      }

      showToast({
        title: modalMode === 'create' ? 'Customer created' : 'Customer updated',
        description: updatedCustomer
          ? 'Customer row and detail panel were refreshed.'
          : 'The CRM list has been refreshed.',
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
  const platformFilterOptions = [
    { value: '', label: 'All platforms' },
    ...availablePlatforms.map((platform) => ({ value: platform, label: platform })),
  ]
  const pageSizeOptions: SelectFieldOption[] = [
    { value: '10', label: '10 per page' },
    { value: '20', label: '20 per page' },
    { value: '50', label: '50 per page' },
    { value: '75', label: '75 per page' },
  ]
  const activeFilterCount = [search, phoneFilter, statusFilter, platformFilter, dateStart, dateEnd].filter(Boolean).length
  const totalCustomerCount = dashboardQuery.data?.total_items ?? customers.length

  return (
    <section className="flex min-h-[calc(100vh-10rem)] flex-col gap-6">
      <PageHeader
        eyebrow="CRM workspace"
        title="Client operations dashboard"
        actions={
          <>
            <Button variant="secondary" onClick={() => void refreshAll()}>
              Refresh
            </Button>
            <Button onClick={openCreateModal}>Add client</Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 stagger-children">
        <MetricCard
          label="Total Customers"
          value={typeof stats?.total_customers === 'number' ? stats.total_customers : '—'}
          description="Total clients in CRM"
          tone="blue"
        />
        <MetricCard
          label="Need to Call"
          value={typeof stats?.need_to_call === 'number' ? stats.need_to_call : '—'}
          description="Leads to be contacted"
          tone="warning"
        />
        <MetricCard
          label="Contacted"
          value={typeof stats?.contacted === 'number' ? stats.contacted : '—'}
          description="Initial contact made"
          tone="blue"
        />
        <MetricCard
          label="Project Started"
          value={typeof stats?.project_started === 'number' ? stats.project_started : '—'}
          description="Projects in kickoff phase"
          tone="violet"
        />
        <MetricCard
          label="Continuing"
          value={typeof stats?.continuing === 'number' ? stats.continuing : '—'}
          description="Ongoing projects"
          tone="success"
        />
        <MetricCard
          label="Finished"
          value={typeof stats?.finished === 'number' ? stats.finished : '—'}
          description="Projects successfully completed"
          tone="success"
        />
        <MetricCard
          label="Rejected"
          value={typeof stats?.rejected === 'number' ? stats.rejected : '—'}
          description="Deals not closed"
          tone="danger"
        />
      </div>

      <Card noPadding className="flex flex-1 flex-col overflow-hidden">
        {/* ── Card header ─────────────────────────── */}
        <div
          className={cn(
            'flex flex-wrap items-center justify-between gap-3 border-b border-(--border) py-5',
            isSidebarCollapsed ? 'px-4 xl:px-5' : 'px-6',
          )}
        >
          <div>
            <h2 className="text-lg font-semibold text-white">Clients</h2>
            <p className="mt-0.5 text-[13px] text-(--muted)">
              Manage your clients ({formatCompactNumber(displayedCustomers.length)} of {formatCompactNumber(totalCustomerCount)} records)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="blue" dot>{displayedCustomers.length} visible</Badge>
            <Badge variant={activeFilterCount > 0 ? 'warning' : 'outline'} dot={activeFilterCount > 0}>
              {activeFilterCount} filters
            </Badge>
          </div>
        </div>

        {/* ── Filters ─────────────────────────────── */}
        <div
          className={cn(
            'border-b border-(--border) bg-(--muted-surface)/40 py-4',
            isSidebarCollapsed ? 'px-4 xl:px-5' : 'px-6',
          )}
        >
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-(--muted)">Filters</p>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={resetFilters} className="h-7 px-2 text-xs">
                Clear
              </Button>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-(--muted)">Search</label>
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Name or username"
                className="h-9"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-(--muted)">Status</label>
              <SelectField
                key={`crm-status-filter-${statusFilter || 'all'}`}
                value={statusFilter}
                options={statusFilterOptions}
                onValueChange={setStatusFilter}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-(--muted)">Platform</label>
              <SelectField
                key={`crm-platform-filter-${platformFilter || 'all'}`}
                value={platformFilter}
                options={platformFilterOptions}
                onValueChange={setPlatformFilter}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-(--muted)">Phone</label>
              <Input
                value={phoneFilter}
                onChange={(event) => setPhoneFilter(event.target.value)}
                placeholder="Search by phone"
                className="h-9"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-(--muted)">Start date</label>
              <Input type="date" value={dateStart} onChange={(event) => setDateStart(event.target.value)} className="h-9" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-(--muted)">End date</label>
              <Input type="date" value={dateEnd} onChange={(event) => setDateEnd(event.target.value)} className="h-9" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-(--muted)">Pagination</label>
              <SelectField
                key={`crm-page-size-${pageSize}`}
                value={pageSize}
                options={pageSizeOptions}
                onValueChange={setPageSize}
              />
            </div>
          </div>
        </div>

        <div
          className={cn(
            'flex min-h-0 flex-1 flex-col py-5',
            isSidebarCollapsed ? 'px-2 xl:px-3' : 'px-0',
          )}
        >
          <DataTable
            key={`crm-table-${pageSizeValue}`}
            caption="CRM customers table"
            rows={displayedCustomers}
            getRowKey={(row) => String(row.id)}
            pageSize={pageSizeValue}
            zebra
            fillHeight
            onRowClick={openCustomerDrawer}
            className="rounded-none border-x-0 border-b-0"
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
                render: (row) => {
                  const displayName = getCustomerDisplayName(row)
                  const secondaryLine = formatUsernameHandle(row.username) ?? row.phone_number ?? row.phone ?? 'none'

                  return (
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-(--muted-surface) text-sm font-semibold text-white">
                        {getInitials(displayName)}
                      </div>
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            openCustomerDrawer(row)
                          }}
                          className="block truncate text-left text-sm font-semibold text-white transition hover:text-zinc-300 sm:text-[15px]"
                        >
                          {displayName}
                        </button>
                        <span className="block truncate text-[13px] text-(--muted)">{secondaryLine}</span>
                      </div>
                    </div>
                  )
                },
              },
              {
                key: 'platform',
                header: 'Platform',
                render: (row) => getCustomerDisplayPlatform(row) || '-',
              },
              {
                key: 'phone',
                header: 'Phone',
                render: (row) => row.phone_number ?? row.phone ?? '-',
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
                width: '140px',
                render: (row) => {
                  const audioSource = resolveAudioUrl(row)

                  if (!audioSource) {
                    return '-'
                  }

                  return <TableAudioControl src={audioSource} />
                },
              },
              {
                key: 'notes',
                header: 'Notes',
                width: '320px',
                render: (row) => (
                  <span className="block max-w-[320px] truncate text-sm text-(--muted-strong) sm:text-[15px]">
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
                  <div onClick={(event) => event.stopPropagation()}>
                    <ActionsMenu
                      label={`Open actions for ${getCustomerDisplayName(row)}`}
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
                  </div>
                ),
              },
            ]}
          />
        </div>
      </Card>

      <CustomerDetailDrawer
        open={detailCustomer !== null}
        customerId={detailCustomer?.id ?? null}
        initialCustomer={detailCustomer}
        onClose={() => setDetailCustomer(null)}
      />

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
