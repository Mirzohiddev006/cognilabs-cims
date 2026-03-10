import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { updateTrackingService } from '../../../shared/api/services/updateTracking.service'
import { useAsyncData } from '../../../shared/hooks/useAsyncData'
import { cn } from '../../../shared/lib/cn'
import { formatCompactNumber } from '../../../shared/lib/format'
import { useToast } from '../../../shared/toast/useToast'
import { Badge } from '../../../shared/ui/badge'
import { Button } from '../../../shared/ui/button'
import { Card } from '../../../shared/ui/card'
import { DataTable } from '../../../shared/ui/data-table'
import { Input } from '../../../shared/ui/input'
import { SectionTitle } from '../../../shared/ui/section-title'
import { EmptyStateBlock, ErrorStateBlock, LoadingStateBlock } from '../../../shared/ui/state-block'

const now = new Date()
const tableCollectionKeys = ['updates', 'items', 'results', 'records', 'employees', 'missing', 'data', 'rows']
const calendarCollectionKeys = ['calendar', 'days', 'entries', 'items', 'data', 'results']
const recentPreferredColumns = ['id', 'user_id', 'user_name', 'telegram_username', 'update_date']
const missingPreferredColumns = ['id', 'user_id', 'user_name', 'telegram_username', 'date']
const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

type DisplayValue = string | number | boolean | null
type TableRow = Record<string, DisplayValue>
type CalendarStatus = 'submitted' | 'missing' | 'sunday' | 'future' | 'neutral'
type CalendarDay = {
  day: number
  dateKey: string
  status: CalendarStatus
  label: string
  updatesCount?: number | null
  note?: string | null
}

function parsePayload(payload: unknown) {
  if (typeof payload !== 'string') {
    return payload
  }

  const trimmed = payload.trim()

  if (!trimmed) {
    return ''
  }

  try {
    return JSON.parse(trimmed) as unknown
  } catch {
    return trimmed
  }
}

function toDisplayValue(value: unknown): DisplayValue {
  if (value === null || value === undefined || value === '') {
    return null
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return null
    }

    return value
      .map((item) => {
        if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
          return String(item)
        }

        try {
          return JSON.stringify(item)
        } catch {
          return String(item)
        }
      })
      .join(', ')
  }

  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function toTableRow(value: unknown): TableRow | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  const entries = Object.entries(value).map(([key, entryValue]) => [key, toDisplayValue(entryValue)] as const)

  if (entries.length === 0) {
    return null
  }

  return Object.fromEntries(entries)
}

function normalizeRows(payload: unknown) {
  const parsed = parsePayload(payload)

  if (Array.isArray(parsed)) {
    return parsed.map(toTableRow).filter((row): row is TableRow => Boolean(row))
  }

  if (!parsed || typeof parsed !== 'object') {
    return [] as TableRow[]
  }

  const source = parsed as Record<string, unknown>

  for (const key of tableCollectionKeys) {
    if (Array.isArray(source[key])) {
      return source[key].map(toTableRow).filter((row): row is TableRow => Boolean(row))
    }
  }

  const firstArray = Object.values(source).find((value) => Array.isArray(value))

  if (Array.isArray(firstArray)) {
    return firstArray.map(toTableRow).filter((row): row is TableRow => Boolean(row))
  }

  return []
}

function normalizeRecord(payload: unknown) {
  const parsed = parsePayload(payload)

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null
  }

  return toTableRow(parsed)
}

function normalizeText(payload: unknown) {
  const parsed = parsePayload(payload)
  return typeof parsed === 'string' ? parsed : ''
}

function formatLocalDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function isDateKey(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function calendarStatusLabel(status: CalendarStatus) {
  switch (status) {
    case 'submitted':
      return 'Submitted'
    case 'missing':
      return 'Missing'
    case 'sunday':
      return 'Sunday'
    case 'future':
      return 'Upcoming'
    default:
      return 'No data'
  }
}

function normalizeCalendarStatus(value: unknown, date: Date): CalendarStatus {
  const fallback = date.getDay() === 0 ? 'sunday' : 'neutral'

  if (typeof value === 'boolean') {
    return value ? 'submitted' : 'missing'
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()

    if (!normalized) {
      return fallback
    }

    if (
      normalized.includes('submitted') ||
      normalized.includes('complete') ||
      normalized.includes('done') ||
      normalized.includes('present') ||
      normalized.includes('sent')
    ) {
      return 'submitted'
    }

    if (
      normalized.includes('missing') ||
      normalized.includes('absent') ||
      normalized.includes('not submitted') ||
      normalized.includes('missed')
    ) {
      return 'missing'
    }

    if (normalized.includes('sunday') || normalized.includes('weekend')) {
      return 'sunday'
    }

    if (normalized.includes('future') || normalized.includes('upcoming')) {
      return 'future'
    }
  }

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const source = value as Record<string, unknown>

    if (typeof source.is_sunday === 'boolean' && source.is_sunday) {
      return 'sunday'
    }

    if (typeof source.is_missing === 'boolean') {
      return source.is_missing ? 'missing' : 'submitted'
    }

    if (typeof source.missing === 'boolean') {
      return source.missing ? 'missing' : 'submitted'
    }

    if (typeof source.is_submitted === 'boolean') {
      return source.is_submitted ? 'submitted' : 'missing'
    }

    if (typeof source.submitted === 'boolean') {
      return source.submitted ? 'submitted' : 'missing'
    }

    const candidate =
      source.status ??
      source.day_status ??
      source.submission_status ??
      source.type ??
      source.value ??
      source.result

    return normalizeCalendarStatus(candidate, date)
  }

  return fallback
}

function extractCalendarSource(payload: unknown) {
  const parsed = parsePayload(payload)

  if (Array.isArray(parsed)) {
    return {
      entries: parsed,
      month: undefined as number | undefined,
      year: undefined as number | undefined,
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    return {
      entries: [] as unknown[],
      month: undefined as number | undefined,
      year: undefined as number | undefined,
    }
  }

  const source = parsed as Record<string, unknown>
  const month = typeof source.month === 'number' ? source.month : undefined
  const year = typeof source.year === 'number' ? source.year : undefined

  for (const key of calendarCollectionKeys) {
    if (Array.isArray(source[key])) {
      return {
        entries: source[key],
        month,
        year,
      }
    }
  }

  const mappedEntries = Object.entries(source)
    .filter(([key]) => isDateKey(key) || /^\d{1,2}$/.test(key))
    .map(([key, value]) => {
      if (isDateKey(key)) {
        return { date: key, status: value }
      }

      return { day: Number(key), status: value }
    })

  return {
    entries: mappedEntries,
    month,
    year,
  }
}

function toCalendarDay(entry: unknown, selectedMonth: number, selectedYear: number): CalendarDay | null {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    return null
  }

  const source = entry as Record<string, unknown>
  const dateValue =
    typeof source.date === 'string'
      ? source.date
      : typeof source.full_date === 'string'
        ? source.full_date
        : typeof source.calendar_date === 'string'
          ? source.calendar_date
          : typeof source.day_date === 'string'
            ? source.day_date
            : null
  const numericDay =
    typeof source.day === 'number'
      ? source.day
      : typeof source.day === 'string' && /^\d{1,2}$/.test(source.day)
        ? Number(source.day)
        : null

  const date = dateValue
    ? new Date(dateValue)
    : numericDay
      ? new Date(selectedYear, selectedMonth - 1, numericDay)
      : null

  if (!date || Number.isNaN(date.getTime())) {
    return null
  }

  if (date.getMonth() + 1 !== selectedMonth || date.getFullYear() !== selectedYear) {
    return null
  }

  const status = normalizeCalendarStatus(
    source.status ??
      source.day_status ??
      source.submission_status ??
      source.type ??
      source.is_submitted ??
      source.submitted ??
      source.is_missing ??
      source.missing ??
      source.is_sunday ??
      source.sunday ??
      source.value,
    date,
  )
  const updatesCount =
    typeof source.updates_count === 'number'
      ? source.updates_count
      : typeof source.count === 'number'
        ? source.count
        : typeof source.total_updates === 'number'
          ? source.total_updates
          : null
  const noteCandidates = [source.note, source.message, source.summary, source.label]
  const note = noteCandidates.find((item): item is string => typeof item === 'string' && item.trim().length > 0) ?? null

  return {
    day: date.getDate(),
    dateKey: formatLocalDateKey(date),
    status,
    label: calendarStatusLabel(status),
    updatesCount,
    note,
  }
}

function buildCalendarDays(payload: unknown, selectedMonth: number, selectedYear: number) {
  const { entries, month: payloadMonth, year: payloadYear } = extractCalendarSource(payload)
  const resolvedMonth = payloadMonth ?? selectedMonth
  const resolvedYear = payloadYear ?? selectedYear
  const parsedEntries = entries
    .map((entry) => toCalendarDay(entry, resolvedMonth, resolvedYear))
    .filter((entry): entry is CalendarDay => Boolean(entry))

  if (parsedEntries.length === 0) {
    return null
  }

  const daysInMonth = new Date(resolvedYear, resolvedMonth, 0).getDate()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const entryMap = new Map(parsedEntries.map((entry) => [entry.day, entry]))

  const days = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1
    const currentDate = new Date(resolvedYear, resolvedMonth - 1, day)
    const fallbackStatus: CalendarStatus =
      currentDate > today ? 'future' : currentDate.getDay() === 0 ? 'sunday' : 'neutral'

    return (
      entryMap.get(day) ?? {
        day,
        dateKey: formatLocalDateKey(currentDate),
        status: fallbackStatus,
        label: calendarStatusLabel(fallbackStatus),
      }
    )
  })

  return {
    month: resolvedMonth,
    year: resolvedYear,
    days,
  }
}

function humanizeKey(key: string) {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatCellValue(value: DisplayValue) {
  if (value === null || value === undefined || value === '') {
    return '-'
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }

  return String(value)
}

function getColumnKeys(rows: TableRow[], preferredKeys: string[] = [], limit = 5) {
  if (rows.length === 0) {
    return [] as string[]
  }

  const allKeys = Array.from(new Set(rows.flatMap((row) => Object.keys(row))))
  const preferred = preferredKeys.filter((key) => allKeys.includes(key))
  const remaining = allKeys.filter((key) => !preferred.includes(key)).slice(0, Math.max(limit - preferred.length, 0))

  return [...preferred, ...remaining]
}

function getTableRowKey(row: TableRow) {
  return String(row.id ?? row.user_id ?? row.user_name ?? row.email ?? JSON.stringify(row))
}

function buildTableColumns(columnKeys: string[]) {
  return columnKeys.map((column) => ({
    key: column,
    header: humanizeKey(column),
    render: (row: TableRow) => (
      <span className="block max-w-[260px] truncate" title={formatCellValue(row[column])}>
        {formatCellValue(row[column])}
      </span>
    ),
  }))
}

function MetricCard({
  label,
  value,
  description,
}: {
  label: string
  value: ReactNode
  description: string
}) {
  return (
    <Card className="flex min-h-[140px] flex-col justify-between p-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#3b82f6]">{label}</p>
        <p className="mt-5 text-[2.125rem] leading-none font-semibold text-white tracking-tight">{value}</p>
      </div>
      <p className="text-sm leading-6 text-[var(--muted)]">{description}</p>
    </Card>
  )
}

function CalendarPayloadCard({
  eyebrow,
  title,
  description,
  payload,
  month,
  year,
  emptyTitle,
  emptyDescription,
}: {
  eyebrow: string
  title: string
  description: string
  payload: unknown
  month: number
  year: number
  emptyTitle: string
  emptyDescription: string
}) {
  const calendar = buildCalendarDays(payload, month, year)

  if (!calendar) {
    return (
      <StructuredPayloadCard
        eyebrow={eyebrow}
        title={title}
        description={description}
        payload={payload}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
      />
    )
  }

  const monthLabel = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(calendar.year, calendar.month - 1, 1))
  const firstDayOffset = (new Date(calendar.year, calendar.month - 1, 1).getDay() + 6) % 7
  const cells = [...Array.from({ length: firstDayOffset }, () => null), ...calendar.days]
  const submittedCount = calendar.days.filter((day) => day.status === 'submitted').length
  const missingCount = calendar.days.filter((day) => day.status === 'missing').length
  const sundayCount = calendar.days.filter((day) => day.status === 'sunday').length
  const statusStyles: Record<CalendarStatus, string> = {
    submitted: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-100',
    missing: 'border-rose-500/20 bg-rose-500/10 text-rose-100',
    sunday: 'border-amber-500/20 bg-amber-500/10 text-amber-100',
    future: 'border-white/10 bg-[var(--surface)] text-[var(--muted)] opacity-70',
    neutral: 'border-[var(--border)] bg-[var(--surface)] text-white',
  }

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-[var(--border)] px-6 py-6">
        <SectionTitle eyebrow={eyebrow} title={title} description={description} />
      </div>

      <div className="space-y-5 px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white">{monthLabel}</p>
            <p className="text-xs text-[var(--muted)]">Submission status for each day of the selected month.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-200">{`${submittedCount} submitted`}</Badge>
            <Badge className="border-rose-500/20 bg-rose-500/10 text-rose-200">{`${missingCount} missing`}</Badge>
            <Badge className="border-amber-500/20 bg-amber-500/10 text-amber-200">{`${sundayCount} sundays`}</Badge>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {weekdayLabels.map((weekday) => (
            <div
              key={weekday}
              className="rounded-md border border-[var(--border)] bg-[var(--muted-surface)] px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]"
            >
              {weekday}
            </div>
          ))}

          {cells.map((cell, index) =>
            cell ? (
              <div
                key={cell.dateKey}
                title={cell.note ? `${cell.label} - ${cell.note}` : cell.label}
                className={cn(
                  'flex min-h-[92px] flex-col justify-between rounded-xl border px-3 py-3 transition hover:translate-y-[-1px]',
                  statusStyles[cell.status],
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-semibold">{cell.day}</span>
                  {typeof cell.updatesCount === 'number' && cell.updatesCount > 0 ? (
                    <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-semibold">
                      {cell.updatesCount}
                    </span>
                  ) : null}
                </div>

                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em]">{cell.label}</p>
                  {cell.note ? <p className="line-clamp-2 text-[11px] leading-4 opacity-80">{cell.note}</p> : null}
                </div>
              </div>
            ) : (
              <div
                key={`blank-${index}`}
                className="min-h-[92px] rounded-xl border border-dashed border-white/6 bg-transparent"
              />
            ),
          )}
        </div>
      </div>
    </Card>
  )
}

function StructuredPayloadCard({
  eyebrow,
  title,
  description,
  payload,
  preferredColumns = [],
  emptyTitle,
  emptyDescription,
}: {
  eyebrow: string
  title: string
  description: string
  payload: unknown
  preferredColumns?: string[]
  emptyTitle: string
  emptyDescription: string
}) {
  const rows = normalizeRows(payload)
  const columnKeys = getColumnKeys(rows, preferredColumns)
  const record = rows.length === 0 ? normalizeRecord(payload) : null
  const text = rows.length === 0 && !record ? normalizeText(payload) : ''

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-[var(--border)] px-6 py-6">
        <SectionTitle eyebrow={eyebrow} title={title} description={description} />
      </div>

      <div className="px-6 py-5">
        {rows.length > 0 ? (
          <DataTable<TableRow>
            caption={title}
            rows={rows}
            getRowKey={getTableRowKey}
            columns={buildTableColumns(columnKeys)}
          />
        ) : record ? (
          <div className="grid gap-3 md:grid-cols-2">
            {Object.entries(record).map(([key, value]) => (
              <div
                key={key}
                className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
              >
                <span className="text-sm text-[var(--muted)]">{humanizeKey(key)}</span>
                <span className="max-w-[60%] truncate text-right text-sm font-semibold text-white" title={formatCellValue(value)}>
                  {formatCellValue(value)}
                </span>
              </div>
            ))}
          </div>
        ) : text ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4 text-sm leading-6 text-[var(--muted-strong)] whitespace-pre-wrap">
            {text}
          </div>
        ) : (
          <EmptyStateBlock eyebrow={eyebrow} title={emptyTitle} description={emptyDescription} />
        )}
      </div>
    </Card>
  )
}

export function UpdateTrackingPage() {
  const { showToast } = useToast()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [dateCheck, setDateCheck] = useState(now.toISOString().slice(0, 10))
  const [recentLimit, setRecentLimit] = useState(20)

  const myStatsQuery = useAsyncData(() => updateTrackingService.myStats(), [])
  const companyStatsQuery = useAsyncData(() => updateTrackingService.companyStats(), [])
  const myProfileQuery = useAsyncData(() => updateTrackingService.myProfile(), [])
  const monthlyReportQuery = useAsyncData(() => updateTrackingService.monthlyReport(month, year), [month, year])
  const calendarQuery = useAsyncData(() => updateTrackingService.calendar(month, year), [month, year])
  const trendsQuery = useAsyncData(() => updateTrackingService.trends(), [])
  const recentQuery = useAsyncData(() => updateTrackingService.recent(recentLimit), [recentLimit])
  const missingQuery = useAsyncData(() => updateTrackingService.missing(dateCheck), [dateCheck])

  const monthlyCompletion = useMemo(() => {
    return Math.round(myStatsQuery.data?.percentage_this_month ?? 0)
  }, [myStatsQuery.data?.percentage_this_month])

  const recentRows = useMemo(() => normalizeRows(recentQuery.data), [recentQuery.data])
  const recentColumns = useMemo(() => getColumnKeys(recentRows, recentPreferredColumns), [recentRows])
  const missingRows = useMemo(() => normalizeRows(missingQuery.data), [missingQuery.data])
  const missingColumns = useMemo(() => getColumnKeys(missingRows, missingPreferredColumns), [missingRows])

  async function refreshAll() {
    await Promise.all([
      myStatsQuery.refetch(),
      companyStatsQuery.refetch(),
      myProfileQuery.refetch(),
      monthlyReportQuery.refetch(),
      calendarQuery.refetch(),
      trendsQuery.refetch(),
      recentQuery.refetch(),
      missingQuery.refetch(),
    ])
    showToast({
      title: 'Tracking data updated',
      description: 'All update-tracking blocks have been reloaded.',
      tone: 'success',
    })
  }

  if (myStatsQuery.isLoading && !myStatsQuery.data) {
    return (
      <LoadingStateBlock
        eyebrow="Updates / Tracking"
        title="Tracking data loading"
        description="Fetching statistics, company metrics, and report data."
      />
    )
  }

  if (myStatsQuery.isError && !myStatsQuery.data) {
    return (
      <ErrorStateBlock
        eyebrow="Updates / Tracking"
        title="Tracking data unavailable"
        description="Could not retrieve core update-tracking statistics."
        actionLabel="Retry"
        onAction={() => {
          void refreshAll()
        }}
      />
    )
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">Updates / Tracking</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Update List</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
            Team submissions, compliance metrics, recent updates va missing entries bitta sahifada yig'ildi.
          </p>
        </div>
        <Button variant="secondary" onClick={() => void refreshAll()}>
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total Employees"
          value={formatCompactNumber(companyStatsQuery.data?.total_employees ?? 0)}
          description="Active employees in system"
        />
        <MetricCard
          label="Updates Today"
          value={formatCompactNumber(companyStatsQuery.data?.total_updates_today ?? 0)}
          description="Submitted entries today"
        />
        <MetricCard
          label="This Week"
          value={formatCompactNumber(companyStatsQuery.data?.total_updates_this_week ?? 0)}
          description="Company updates this week"
        />
        <MetricCard
          label="My Weekly Completion"
          value={`${Math.round(myStatsQuery.data?.percentage_this_week ?? 0)}%`}
          description="Current weekly completion"
        />
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-[var(--border)] px-6 py-6">
          <SectionTitle
            eyebrow="Filters"
            title="Tracking controls"
            description="Monthly report, calendar, recent limit va missing date uchun filterlar."
          />
        </div>
        <div className="grid gap-4 px-6 py-5 md:grid-cols-2 xl:grid-cols-4">
          <div className="min-w-[140px]">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-white">Month</span>
              <Input
                type="number"
                min="1"
                max="12"
                value={month}
                onChange={(event) => setMonth(Number(event.target.value) || now.getMonth() + 1)}
              />
            </label>
          </div>
          <div className="min-w-[140px]">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-white">Year</span>
              <Input
                type="number"
                min="2020"
                max="2035"
                value={year}
                onChange={(event) => setYear(Number(event.target.value) || now.getFullYear())}
              />
            </label>
          </div>
          <div className="min-w-[180px]">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-white">Missing date</span>
              <Input type="date" value={dateCheck} onChange={(event) => setDateCheck(event.target.value)} />
            </label>
          </div>
          <div className="min-w-[140px]">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-white">Recent limit</span>
              <Input
                type="number"
                min="1"
                max="100"
                value={recentLimit}
                onChange={(event) => setRecentLimit(Number(event.target.value) || 20)}
              />
            </label>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <Card className="overflow-hidden">
          <div className="border-b border-[var(--border)] px-6 py-6">
            <SectionTitle
              eyebrow="Recent"
              title="Recent updates"
              description="Latest submitted update entries returned by the API."
            />
          </div>
          <div className="px-6 py-5">
            {recentRows.length > 0 ? (
              <DataTable<TableRow>
                caption="Recent updates table"
                rows={recentRows}
                getRowKey={getTableRowKey}
                columns={buildTableColumns(recentColumns)}
                emptyState={
                  <EmptyStateBlock
                    eyebrow="Recent"
                    title="No recent updates"
                    description="The API did not return recent update rows."
                  />
                }
              />
            ) : (
              <EmptyStateBlock
                eyebrow="Recent"
                title="No recent updates"
                description="The API did not return recent update rows."
              />
            )}
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-[var(--border)] px-6 py-6">
            <SectionTitle
              eyebrow="My stats"
              title="My tracking stats"
              description="Current authenticated user performance snapshot."
            />
          </div>
          <div className="grid gap-3 px-6 py-5">
            <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
              <span className="text-sm text-[var(--muted)]">User</span>
              <Badge>{myStatsQuery.data?.user_name ?? '-'}</Badge>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
              <span className="text-sm text-[var(--muted)]">Total updates</span>
              <span className="text-lg font-semibold text-white">{myStatsQuery.data?.total_updates ?? 0}</span>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
              <span className="text-sm text-[var(--muted)]">This week</span>
              <span className="text-lg font-semibold text-white">{myStatsQuery.data?.updates_this_week ?? 0}</span>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
              <span className="text-sm text-[var(--muted)]">This month</span>
              <span className="text-lg font-semibold text-white">{myStatsQuery.data?.updates_this_month ?? 0}</span>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
              <span className="text-sm text-[var(--muted)]">Expected / week</span>
              <span className="text-lg font-semibold text-white">{myStatsQuery.data?.expected_updates_per_week ?? 0}</span>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
              <span className="text-sm text-[var(--muted)]">This month completion</span>
              <span className="text-lg font-semibold text-white">{monthlyCompletion}%</span>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="border-b border-[var(--border)] px-6 py-6">
            <SectionTitle
              eyebrow="Missing"
              title="Missing submissions"
              description="Employees or rows missing updates for the selected date."
            />
          </div>
          <div className="px-6 py-5">
            {missingRows.length > 0 ? (
              <DataTable<TableRow>
                caption="Missing submissions table"
                rows={missingRows}
                getRowKey={getTableRowKey}
                columns={buildTableColumns(missingColumns)}
                emptyState={
                  <EmptyStateBlock
                    eyebrow="Missing"
                    title="No missing rows"
                    description="Everyone appears to have submitted updates for this date."
                  />
                }
              />
            ) : (
              <EmptyStateBlock
                eyebrow="Missing"
                title="No missing rows"
                description="Everyone appears to have submitted updates for this date."
              />
            )}
          </div>
        </Card>

        <StructuredPayloadCard
          eyebrow="Profile"
          title="My profile"
          description="Authenticated user metadata from update tracking service."
          payload={myProfileQuery.data}
          emptyTitle="Profile unavailable"
          emptyDescription="The service returned no profile data for the current user."
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <StructuredPayloadCard
          eyebrow="Monthly"
          title="Monthly report"
          description="Generated monthly report for the selected period."
          payload={monthlyReportQuery.data}
          emptyTitle="Monthly report unavailable"
          emptyDescription="No monthly report data was returned for the selected month."
        />
        <StructuredPayloadCard
          eyebrow="Trends"
          title="Performance trends"
          description="Trend summary returned by the update tracking API."
          payload={trendsQuery.data}
          emptyTitle="Trend data unavailable"
          emptyDescription="No performance trend data was returned by the service."
        />
      </div>

      <CalendarPayloadCard
        eyebrow="Calendar"
        title="Daily calendar"
        description="Calendar-style daily submission data for the selected month."
        payload={calendarQuery.data}
        month={month}
        year={year}
        emptyTitle="Calendar data unavailable"
        emptyDescription="The service returned no daily calendar rows for this month."
      />

      <Card className="overflow-hidden">
        <div className="border-b border-[var(--border)] px-6 py-6">
          <SectionTitle
            eyebrow="Company"
            title="Company completion snapshot"
            description="Weekly and monthly completion averages across the team."
          />
        </div>
        <div className="grid gap-3 px-6 py-5 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
            <p className="text-sm text-[var(--muted)]">Weekly average</p>
            <p className="mt-2 text-xl font-semibold text-white">
              {Math.round(companyStatsQuery.data?.avg_percentage_this_week ?? 0)}%
            </p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
            <p className="text-sm text-[var(--muted)]">Last week average</p>
            <p className="mt-2 text-xl font-semibold text-white">
              {Math.round(companyStatsQuery.data?.avg_percentage_last_week ?? 0)}%
            </p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
            <p className="text-sm text-[var(--muted)]">Monthly average</p>
            <p className="mt-2 text-xl font-semibold text-white">
              {Math.round(companyStatsQuery.data?.avg_percentage_this_month ?? 0)}%
            </p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
            <p className="text-sm text-[var(--muted)]">Last 3 months</p>
            <p className="mt-2 text-xl font-semibold text-white">
              {Math.round(companyStatsQuery.data?.avg_percentage_last_3_months ?? 0)}%
            </p>
          </div>
        </div>
      </Card>
      
    </section>
  )
}
