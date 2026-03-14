import { useMemo, useState, type ReactNode } from 'react'
import { updateTrackingService } from '../../../shared/api/services/updateTracking.service'
import type { DayStatus, EmployeeDayStatus, EmployeeMonthlyStats } from '../../../shared/api/types'
import { useAsyncData } from '../../../shared/hooks/useAsyncData'
import { cn } from '../../../shared/lib/cn'
import { formatShortDate } from '../../../shared/lib/format'
import { useToast } from '../../../shared/toast/useToast'
import { Badge } from '../../../shared/ui/badge'
import { Button } from '../../../shared/ui/button'
import { Card } from '../../../shared/ui/card'
import { Input } from '../../../shared/ui/input'
import { SelectField } from '../../../shared/ui/select-field'
import { SectionTitle } from '../../../shared/ui/section-title'
import { ErrorStateBlock, LoadingStateBlock } from '../../../shared/ui/state-block'

const now = new Date()
const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

const COMPLETION_ON_TRACK = 80
const recentTextKeys = ['update_content', 'update_text', 'message', 'text', 'summary', 'description', 'content', 'body', 'note', 'comment', 'remarks', 'title']

type UnknownRecord = Record<string, unknown>

/* ─── Month name helper ───────────────────────────────────── */
function getMonthName(month: number): string {
  return new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date(2024, month - 1))
}

const ALL_MONTHS = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: getMonthName(i + 1) }))
const MONTH_OPTIONS = ALL_MONTHS.map(({ value, label }) => ({ value: String(value), label }))

/* ─── Dot activity strip ──────────────────────────────────── */
const dotStatusStyle = {
  submitted: 'bg-emerald-500 shadow-[0_0_4px_rgba(34,197,94,0.6)]',
  missing:   'bg-rose-500/80',
  sunday:    'bg-amber-400/70',
  future:    'bg-white/12',
  neutral:   'bg-white/18',
} as const satisfies Record<DayStatus, string>

/* ─── SummaryCard accent maps (module-scope, not recreated per render) ─ */
type AccentKey = 'default' | 'success' | 'warning' | 'blue' | 'violet'

const summaryCardBorder = {
  default: 'border-white/8',
  success: 'border-emerald-500/20',
  warning: 'border-amber-500/20',
  blue:    'border-blue-500/20',
  violet:  'border-violet-500/20',
} as const satisfies Record<AccentKey, string>

const summaryCardIcon = {
  default: 'border-white/10 bg-white/6 text-(--muted-strong)',
  success: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
  warning: 'border-amber-500/20 bg-amber-400/10 text-amber-300',
  blue:    'border-blue-500/20 bg-blue-600/10 text-blue-300',
  violet:  'border-violet-500/20 bg-violet-500/10 text-violet-300',
} as const satisfies Record<AccentKey, string>

function ActivityStrip({ statuses }: { statuses: EmployeeMonthlyStats['daily_statuses'] }) {
  if (!statuses || statuses.length === 0) {
    return <span className="text-xs text-(--muted)">—</span>
  }

  return (
    <div className="flex flex-wrap items-center gap-0.75" aria-label="Monthly activity">
      {statuses.map((entry) => (
        <span
          key={entry.day}
          title={`Day ${entry.day}: ${entry.status}`}
          className={cn('inline-block h-2 w-2 rounded-full shrink-0', dotStatusStyle[entry.status])}
        />
      ))}
    </div>
  )
}

function TrackBadge({ pct }: { pct: number }) {
  return pct >= COMPLETION_ON_TRACK
    ? <Badge variant="success" dot>On Track</Badge>
    : <Badge variant="warning" dot>Needs Attention</Badge>
}

function CompletionPill({ pct }: { pct: number }) {
  const color =
    pct >= 90 ? 'bg-emerald-500 text-white' :
    pct >= 75 ? 'bg-amber-400/90 text-black' :
    'bg-rose-500 text-white'

  return (
    <span className={cn('inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold tabular-nums', color)}>
      {pct.toFixed(1)}%
    </span>
  )
}

function EmployeeAvatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((w) => w.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,#3b82f6,#6366f1)] text-[11px] font-bold text-white shadow-md">
      {initials}
    </div>
  )
}

function SummaryCard({ icon, label, value, accent = 'default' }: {
  icon: ReactNode
  label: string
  value: ReactNode
  accent?: AccentKey
}) {
  return (
    <div className={cn('card-base flex items-center gap-4 px-5 py-4', summaryCardBorder[accent])}>
      <div className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl border', summaryCardIcon[accent])}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-(--muted)">{label}</p>
        <p className="mt-1 truncate text-xl font-semibold leading-none text-white">{value}</p>
      </div>
    </div>
  )
}

/* ─── Parse all-users-updates response ───────────────────── */
function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const normalized = value.trim()

    if (!normalized) {
      return null
    }

    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

function toBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim().toLowerCase()

  if (['true', '1', 'yes', 'y'].includes(normalized)) {
    return true
  }

  if (['false', '0', 'no', 'n'].includes(normalized)) {
    return false
  }

  return null
}

function findFirstString(source: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    if (typeof source[key] === 'string' && source[key].trim()) {
      return source[key] as string
    }
  }

  return undefined
}

function isDateKey(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function formatDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function parseDateValue(value: string) {
  if (isDateKey(value)) {
    const [year, month, day] = value.split('-').map(Number)
    return new Date(year, month - 1, day)
  }

  return new Date(value)
}

function getFallbackDayStatus(date: Date | null): DayStatus {
  if (!date) {
    return 'neutral'
  }

  if (date > todayStart) {
    return 'future'
  }

  if (date.getDay() === 0) {
    return 'sunday'
  }

  return 'missing'
}

function normalizeDayStatus(value: unknown, date: Date | null): DayStatus {
  const fallback = getFallbackDayStatus(date)
  const booleanValue = toBoolean(value)

  if (booleanValue !== null) {
    return booleanValue ? 'submitted' : fallback
  }

  if (typeof value === 'number') {
    return value > 0 ? 'submitted' : fallback
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
      normalized.includes('sent') ||
      normalized.includes('logged')
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

    if (
      normalized.includes('sunday') ||
      normalized.includes('weekend') ||
      normalized.includes('off')
    ) {
      return 'sunday'
    }

    if (
      normalized.includes('future') ||
      normalized.includes('upcoming')
    ) {
      return 'future'
    }

    if (
      normalized.includes('neutral') ||
      normalized.includes('open') ||
      normalized.includes('pending')
    ) {
      return 'neutral'
    }
  }

  return fallback
}

function normalizeDayStatusEntry(raw: unknown): EmployeeDayStatus | null {
  if (!isRecord(raw)) {
    return null
  }

  const dateValue = findFirstString(raw, ['date', 'full_date', 'calendar_date', 'day_date'])
  const numericDay = toNumber(raw.day ?? raw.day_of_month ?? raw.day_number)
  const date = dateValue
    ? parseDateValue(dateValue)
    : numericDay
      ? new Date(now.getFullYear(), now.getMonth(), numericDay)
      : null

  if (date && Number.isNaN(date.getTime())) {
    return null
  }

  const explicitHasUpdate = toBoolean(raw.has_update ?? raw.has_updates ?? raw.is_submitted ?? raw.submitted)
  const updatesCount = toNumber(raw.updates_count ?? raw.count ?? raw.total_updates ?? raw.submitted_count)
  const updateContent = findFirstString(raw, recentTextKeys)
  const normalizedStatus = normalizeDayStatus(
    raw.status ??
      raw.day_status ??
      raw.submission_status ??
      raw.type ??
      raw.is_submitted ??
      raw.submitted ??
      raw.is_missing ??
      raw.missing ??
      raw.is_sunday ??
      raw.sunday ??
      raw.value,
    date,
  )
  const hasUpdate = explicitHasUpdate === true || (updatesCount !== null && updatesCount > 0) || Boolean(updateContent)
  const status = hasUpdate && normalizedStatus !== 'sunday' ? 'submitted' : normalizedStatus
  const resolvedDay = numericDay ?? (date ? date.getDate() : null)

  if (!resolvedDay || resolvedDay < 1) {
    return null
  }

  return {
    day: resolvedDay,
    status,
  }
}

function parseDayStatuses(raw: unknown): EmployeeDayStatus[] | null {
  const entries = Array.isArray(raw)
    ? raw
    : isRecord(raw)
      ? Object.entries(raw)
        .filter(([key]) => isDateKey(key) || /^\d{1,2}$/.test(key))
        .map(([key, value]) => (isDateKey(key) ? { date: key, status: value } : { day: Number(key), status: value }))
      : []

  const parsed = entries
    .map(normalizeDayStatusEntry)
    .filter((entry): entry is EmployeeDayStatus => Boolean(entry))
    .sort((left, right) => left.day - right.day)

  return parsed.length > 0 ? parsed : null
}

function normalizeEmployee(raw: Record<string, unknown>): EmployeeMonthlyStats {
  const name =
    typeof raw.user_name === 'string' ? raw.user_name :
    typeof raw.name      === 'string' ? raw.name :
    typeof raw.full_name === 'string' ? raw.full_name : 'Unknown'

  const dayStatuses = parseDayStatuses(
    raw.daily_statuses ??
    raw.day_statuses ??
    raw.daily_updates ??
    raw.statuses ??
    raw.days ??
    raw.calendar ??
    raw.entries ??
    raw.monthly_activity ??
    raw.activity,
  )

  const submitted =
    toNumber(raw.submitted_count ?? raw.updates_count ?? raw.total_submitted ?? raw.logged_count ?? raw.submitted) ??
    (Array.isArray(raw.updates) ? raw.updates.length : null) ??
    (dayStatuses ? dayStatuses.filter((entry) => entry.status === 'submitted').length : 0)

  const missing =
    toNumber(raw.missing_count ?? raw.total_missing ?? raw.missing_days ?? raw.missed_count ?? raw.absent_count ?? raw.missing) ??
    (dayStatuses ? dayStatuses.filter((entry) => entry.status === 'missing').length : 0)

  const rawCompletion =
    toNumber(raw.completion_percentage ?? raw.completion_rate ?? raw.percentage ?? raw.percent ?? raw.avg_percentage)
  const completion =
    rawCompletion !== null
      ? rawCompletion <= 1 ? rawCompletion * 100 : rawCompletion
      : submitted + missing > 0
        ? Math.round((submitted / (submitted + missing)) * 100)
        : 0

  const lastDate =
    findFirstString(raw, ['last_update_date', 'last_update', 'updated_at', 'submitted_at']) ?? null

  return {
    user_id: typeof raw.user_id === 'number' ? raw.user_id : 0,
    user_name: name,
    telegram_username: typeof raw.telegram_username === 'string' ? raw.telegram_username : null,
    submitted_count: submitted,
    missing_count: missing,
    completion_percentage: completion,
    last_update_date: lastDate,
    daily_statuses: dayStatuses,
  }
}

function parseAllUsersUpdates(data: unknown): EmployeeMonthlyStats[] {
  if (!data) return []

  const list: Record<string, unknown>[] = Array.isArray(data)
    ? data as Record<string, unknown>[]
    : (() => {
        const obj = data as Record<string, unknown>
        for (const key of ['employees', 'users', 'data', 'results', 'items', 'team', 'members', 'team_updates', 'all_users', 'monthly_updates']) {
          if (Array.isArray(obj[key])) return obj[key] as Record<string, unknown>[]
        }
        return []
      })()

  return list
    .filter((d): d is Record<string, unknown> => typeof d === 'object' && d !== null)
    .map(normalizeEmployee)
}

function parseEmployeeMonthlyUpdateSummary(
  data: unknown,
  fallbackEmployee: EmployeeMonthlyStats,
  month: number,
  year: number,
): EmployeeMonthlyStats {
  if (!isRecord(data)) {
    return fallbackEmployee
  }

  const employee = isRecord(data.employee) ? data.employee : null
  const updates = Array.isArray(data.updates) ? data.updates.filter(isRecord) : []
  const submittedDates = new Set<string>()

  for (const update of updates) {
    const dateValue = findFirstString(update, ['update_date', 'date', 'created_at', 'submitted_at'])

    if (!dateValue) {
      continue
    }

    const parsedDate = parseDateValue(dateValue)

    if (Number.isNaN(parsedDate.getTime())) {
      continue
    }

    if (parsedDate.getFullYear() !== year || parsedDate.getMonth() + 1 !== month) {
      continue
    }

    submittedDates.add(formatDateKey(parsedDate))
  }

  const daysInMonth = new Date(year, month, 0).getDate()
  const dailyStatuses: EmployeeDayStatus[] = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1
    const currentDate = new Date(year, month - 1, day)
    const dateKey = formatDateKey(currentDate)

    return {
      day,
      status: submittedDates.has(dateKey) ? 'submitted' : getFallbackDayStatus(currentDate),
    }
  })

  const submittedCount = dailyStatuses.filter((entry) => entry.status === 'submitted').length
  const missingCount = dailyStatuses.filter((entry) => entry.status === 'missing').length
  const rawCompletion = toNumber(data.percentage ?? data.completion_percentage ?? data.completion_rate)
  const completion =
    rawCompletion !== null
      ? rawCompletion <= 1 ? rawCompletion * 100 : rawCompletion
      : submittedCount + missingCount > 0
        ? (submittedCount / (submittedCount + missingCount)) * 100
        : 0
  const lastUpdateDate =
    [...submittedDates].sort((left, right) => left.localeCompare(right)).slice(-1)[0] ??
    fallbackEmployee.last_update_date

  return {
    user_id: toNumber(employee?.id ?? fallbackEmployee.user_id) ?? fallbackEmployee.user_id,
    user_name: findFirstString(employee ?? {}, ['full_name', 'name']) ?? fallbackEmployee.user_name,
    telegram_username: fallbackEmployee.telegram_username,
    submitted_count: submittedCount,
    missing_count: missingCount,
    completion_percentage: completion,
    last_update_date: lastUpdateDate,
    daily_statuses: dailyStatuses,
  }
}

/* ─── Sort & Filter ───────────────────────────────────────── */
type SortKey = 'submitted' | 'missing' | 'completion' | 'name'
type StatusFilter = 'all' | 'on_track' | 'needs_attention'

const SORT_OPTIONS = [
  { value: 'submitted', label: 'Most updates' },
  { value: 'missing', label: 'Most missing' },
  { value: 'completion', label: 'Completion rate' },
  { value: 'name', label: 'Name A-Z' },
] as const

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'on_track', label: 'On Track' },
  { value: 'needs_attention', label: 'Needs Attention' },
] as const

function filterAndSort(
  employees: EmployeeMonthlyStats[],
  search: string,
  sortKey: SortKey,
  statusFilter: StatusFilter,
) {
  let list = [...employees]

  if (search.trim()) {
    const q = search.toLowerCase()
    list = list.filter((e) => e.user_name.toLowerCase().includes(q))
  }

  if (statusFilter === 'on_track') {
    list = list.filter((e) => e.completion_percentage >= COMPLETION_ON_TRACK)
  } else if (statusFilter === 'needs_attention') {
    list = list.filter((e) => e.completion_percentage < COMPLETION_ON_TRACK)
  }

  list.sort((a, b) => {
    if (sortKey === 'submitted')  return b.submitted_count - a.submitted_count
    if (sortKey === 'missing')    return b.missing_count - a.missing_count
    if (sortKey === 'completion') return b.completion_percentage - a.completion_percentage
    return a.user_name.localeCompare(b.user_name)
  })

  return list
}

/* ─── Page ────────────────────────────────────────────────── */
export function CeoTeamUpdatesPage() {
  const { showToast } = useToast()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear]   = useState(now.getFullYear())
  const [search, setSearch]             = useState('')
  const [sortKey, setSortKey]           = useState<SortKey>('submitted')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const teamQuery    = useAsyncData(
    () => updateTrackingService.teamMonthly(month, year),
    [month, year],
  )
  const companyQuery = useAsyncData(() => updateTrackingService.companyStats(), [])

  const rawEmployees = useMemo(
    () => parseAllUsersUpdates(teamQuery.data),
    [teamQuery.data],
  )
  const employeeDetailsQuery = useAsyncData(
    async () => {
      const employeesWithIds = rawEmployees.filter((employee) => employee.user_id > 0)

      if (employeesWithIds.length === 0) {
        return rawEmployees
      }

      const uniqueEmployees = Array.from(
        new Map(employeesWithIds.map((employee) => [employee.user_id, employee])).values(),
      )

      const detailedEmployees = await Promise.all(
        uniqueEmployees.map(async (employee) => {
          try {
            const response = await updateTrackingService.employeeMonthlyUpdates(year, month, employee.user_id)
            return parseEmployeeMonthlyUpdateSummary(response, employee, month, year)
          } catch {
            return employee
          }
        }),
      )

      const detailedById = new Map(detailedEmployees.map((employee) => [employee.user_id, employee]))

      return rawEmployees.map((employee) => {
        if (employee.user_id <= 0) {
          return employee
        }

        return detailedById.get(employee.user_id) ?? employee
      })
    },
    [teamQuery.data, month, year],
    { enabled: rawEmployees.length > 0 },
  )

  async function handleRefresh() {
    await Promise.all([teamQuery.refetch(), companyQuery.refetch()])
    if (rawEmployees.length > 0) {
      await employeeDetailsQuery.refetch()
    }
    showToast({ title: 'Refreshed', description: 'Team monthly data reloaded.', tone: 'success' })
  }

  const sourceEmployees = employeeDetailsQuery.data?.length ? employeeDetailsQuery.data : rawEmployees
  const employees = useMemo(
    () => filterAndSort(sourceEmployees, search, sortKey, statusFilter),
    [sourceEmployees, search, sortKey, statusFilter],
  )

  if ((teamQuery.isLoading && !teamQuery.data) || (employeeDetailsQuery.isLoading && rawEmployees.length > 0 && !employeeDetailsQuery.data)) {
    return (
      <LoadingStateBlock
        eyebrow="CEO / Team Updates"
        title="Loading team monthly data"
        description="Fetching employee update statistics for the selected period."
      />
    )
  }

  if (teamQuery.isError && !teamQuery.data) {
    return (
      <ErrorStateBlock
        eyebrow="CEO / Team Updates"
        title="Team data unavailable"
        description="Could not load monthly team update statistics."
        actionLabel="Retry"
        onAction={() => void teamQuery.refetch()}
      />
    )
  }

  const totalEmployees = sourceEmployees.length || (companyQuery.data?.total_employees ?? 0)
  const totalSubmitted = sourceEmployees.reduce((s, e) => s + e.submitted_count, 0)
  const totalMissing   = sourceEmployees.reduce((s, e) => s + e.missing_count, 0)
  const avgCompletion  = sourceEmployees.length
    ? sourceEmployees.reduce((s, e) => s + e.completion_percentage, 0) / sourceEmployees.length
    : (companyQuery.data?.avg_percentage_this_month ?? 0)
  const topPerformer   = sourceEmployees.length
    ? sourceEmployees.reduce((best, e) => e.completion_percentage > best.completion_percentage ? e : best, sourceEmployees[0])
    : null
  const selectedMonthName = getMonthName(month)

  return (
    <section className="space-y-6 page-enter">
      {/* ── Header ─────────────────────────────── */}
      <Card variant="glass" noPadding className="overflow-hidden rounded-[28px] border-white/8">
        <div className="relative overflow-hidden px-6 py-6 sm:px-8 sm:py-7">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.18),transparent_70%)]" />
          <div className="pointer-events-none absolute -right-10 top-4 h-32 w-32 rounded-full bg-emerald-400/8 blur-3xl" />

          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-blue-400/80">
                CEO Dashboard
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-[1.75rem]">
                Team Monthly Updates
              </h1>
              <p className="mt-1.5 text-[13px] text-(--muted)">
                Monitor employee update activity by month.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/4 px-3 py-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-(--muted)">Year</label>
                <Input
                  type="number"
                  min="2020"
                  max="2035"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value) || now.getFullYear())}
                  className="min-h-0 h-6 w-18 border-white/10 bg-transparent px-2.5 text-sm text-white"
                />
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/4 px-3 py-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-(--muted)">Month</label>
                <SelectField
                  value={String(month)}
                  options={MONTH_OPTIONS}
                  onValueChange={(value) => setMonth(Number(value))}
                  className="min-h-0 h-9 min-w-28 border-white/10 bg-(--surface) text-sm text-white hover:border-white/15 hover:bg-white/6 focus-visible:border-white/20 focus-visible:bg-white/6 focus-visible:shadow-[inset_0_1px_2px_rgba(0,0,0,0.12),0_0_0_3px_rgba(255,255,255,0.06)]"
                />
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => void handleRefresh()}
                className="min-h-9 gap-1.5 rounded-xl"
              >
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M1.5 8a6.5 6.5 0 1 1 1.2 3.8" />
                  <path d="M1.5 12.5V8.5h4" />
                </svg>
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Metric cards ───────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5 stagger-children">
        <SummaryCard
          accent="blue"
          label="Total Employees"
          value={totalEmployees}
          icon={
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="8" cy="7" r="3" />
              <path d="M2 17c0-3.3 2.7-6 6-6" />
              <circle cx="14" cy="9" r="2.5" />
              <path d="M11 17c0-2.8 1.8-5 4.5-5" />
            </svg>
          }
        />
        <SummaryCard
          accent="success"
          label="Submitted Updates"
          value={totalSubmitted}
          icon={
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="10" cy="10" r="8" />
              <path d="m6.5 10 2.5 2.5 4.5-4.5" />
            </svg>
          }
        />
        <SummaryCard
          accent="warning"
          label="Missing Workday Updates"
          value={totalMissing}
          icon={
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 3v7l4 2" />
              <circle cx="10" cy="10" r="8" />
            </svg>
          }
        />
        <SummaryCard
          accent="violet"
          label="Average Completion Rate"
          value={`${avgCompletion.toFixed(1)}%`}
          icon={
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 10a8 8 0 1 1 16 0" />
              <path d="M10 10V4" />
              <path d="M10 10l4 2.5" />
            </svg>
          }
        />
        <SummaryCard
          accent="default"
          label="Top Performer"
          value={
            topPerformer
              ? <span className="text-sm leading-snug">{topPerformer.user_name}<span className="ml-1.5 text-[11px] font-normal text-emerald-400">({topPerformer.completion_percentage.toFixed(1)}%)</span></span>
              : '—'
          }
          icon={
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 2l2.4 4.9 5.4.8-3.9 3.8.9 5.3L10 14.3l-4.8 2.5.9-5.3L2.2 7.7l5.4-.8z" />
            </svg>
          }
        />
      </div>

      {/* ── Filters ─────────────────────────────── */}
      <Card variant="glass" className="p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <SectionTitle title="Filters and Comparison Controls" />
          <Badge variant="blue">
            Showing {employees.length} of {sourceEmployees.length} employees
          </Badge>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-(--muted)">
              Search employee
            </label>
            <div className="relative">
              <svg className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-(--muted)" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="7" cy="7" r="4.5" />
                <path d="M10.5 10.5l3 3" />
              </svg>
              <Input
                placeholder="Search by name"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-(--muted)">
              Sort by
            </label>
            <SelectField
              value={sortKey}
              options={[...SORT_OPTIONS]}
              onValueChange={(value) => setSortKey(value as SortKey)}
              className="min-h-[44px] w-full rounded-lg border border-[var(--border)] bg-[var(--input-surface)] px-3.5 py-2 text-sm text-[var(--foreground)] shadow-[inset_0_1px_2px_rgba(0,0,0,0.12)] outline-none transition-[border-color,box-shadow,background-color] duration-150 hover:border-[var(--border-hover)] hover:bg-[var(--input-surface-hover)] focus:border-[var(--border-focus)] focus:bg-[var(--input-surface-hover)] focus:shadow-[inset_0_1px_2px_rgba(0,0,0,0.12),0_0_0_3px_rgba(59,130,246,0.12)] sm:text-[15px]"
            >
              <option value="submitted">Most updates</option>
              <option value="missing">Most missing</option>
              <option value="completion">Completion rate</option>
              <option value="name">Name A–Z</option>
            </SelectField>
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-(--muted)">
              Status
            </label>
            <SelectField
              value={statusFilter}
              options={[...STATUS_OPTIONS]}
              onValueChange={(value) => setStatusFilter(value as StatusFilter)}
              className="min-h-[44px] w-full rounded-lg border border-[var(--border)] bg-[var(--input-surface)] px-3.5 py-2 text-sm text-[var(--foreground)] shadow-[inset_0_1px_2px_rgba(0,0,0,0.12)] outline-none transition-[border-color,box-shadow,background-color] duration-150 hover:border-[var(--border-hover)] hover:bg-[var(--input-surface-hover)] focus:border-[var(--border-focus)] focus:bg-[var(--input-surface-hover)] focus:shadow-[inset_0_1px_2px_rgba(0,0,0,0.12),0_0_0_3px_rgba(59,130,246,0.12)] sm:text-[15px]"
            >
              <option value="all">All</option>
              <option value="on_track">On Track</option>
              <option value="needs_attention">Needs Attention</option>
            </SelectField>
          </div>
        </div>
      </Card>

      {/* ── Table ───────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border-(--border) bg-(--card) shadow-(--shadow-sm)">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-(--muted-surface)">
                {['Employee', 'Submitted', 'Missing', 'Completion', 'Last Update', 'Monthly Activity', 'Status', 'Action'].map((col) => (
                  <th
                    key={col}
                    className="whitespace-nowrap border-b border-(--border) px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-(--caption)"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-sm text-(--muted)">
                    {search || statusFilter !== 'all'
                      ? 'No employees match the current filters.'
                      : `No data for ${selectedMonthName} ${year}.`}
                  </td>
                </tr>
              ) : (
                employees.map((emp, idx) => (
                  <tr
                    key={emp.user_id}
                    className={cn(
                      'table-row-hover border-b border-(--border) last:border-b-0',
                      idx % 2 === 0 && 'bg-white/[0.012]',
                    )}
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <EmployeeAvatar name={emp.user_name} />
                        <span className="text-sm font-semibold text-white">{emp.user_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm font-semibold text-white tabular-nums">
                      {emp.submitted_count}
                    </td>
                    <td className="px-4 py-3.5 text-sm font-semibold tabular-nums text-rose-300">
                      {emp.missing_count}
                    </td>
                    <td className="px-4 py-3.5">
                      <CompletionPill pct={emp.completion_percentage} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-sm text-(--muted-strong)">
                      {emp.last_update_date ? formatShortDate(emp.last_update_date) : '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="w-50">
                        <ActivityStrip statuses={emp.daily_statuses} />
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <TrackBadge pct={emp.completion_percentage} />
                    </td>
                    <td className="px-4 py-3.5">
                      <Button variant="secondary" size="sm" className="whitespace-nowrap rounded-lg">
                        View Details
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {employees.length > 0 && (
          <div className="flex items-center justify-between border-t border-(--border) bg-(--muted-surface) px-4 py-2.5">
            <div className="flex gap-3 text-[11px] text-(--muted)">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_4px_rgba(34,197,94,0.6)]" />
                Submitted
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-rose-500/80" />
                Missing
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-400/70" />
                Sunday
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-white/18" />
                Upcoming
              </span>
            </div>
            <p className="text-[11px] text-(--muted)">
              {selectedMonthName} {year}
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
