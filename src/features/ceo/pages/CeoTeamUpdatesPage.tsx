import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { membersService } from '../../../shared/api/services/members.service'
import {
  updateTrackingService,
  type WorkdayOverrideMemberOption,
  type WorkdayOverrideRecord,
} from '../../../shared/api/services/updateTracking.service'
import type { DayStatus, EmployeeDayStatus, EmployeeMonthlyStats } from '../../../shared/api/types'
import { useAsyncData } from '../../../shared/hooks/useAsyncData'
import { getIntlLocale } from '../../../shared/i18n/translations'
import { cn } from '../../../shared/lib/cn'
import { formatShortDate } from '../../../shared/lib/format'
import { getApiErrorMessage } from '../../../shared/lib/api-error'
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
const currentDateKey = [
  now.getFullYear(),
  String(now.getMonth() + 1).padStart(2, '0'),
  String(now.getDate()).padStart(2, '0'),
].join('-')

const COMPLETION_ON_TRACK = 80
const recentTextKeys = ['update_content', 'update_text', 'message', 'text', 'summary', 'description', 'content', 'body', 'note', 'comment', 'remarks', 'title']

type UnknownRecord = Record<string, unknown>
type TeamUpdatesSummary = {
  totalEmployees: number
  totalReports: number
  averageCompletion: number
}
type TeamSalarySummary = {
  employeesCount: number
  totalBaseSalary: number
  totalDeductionAmount: number
  totalBonusAmount: number
  totalFinalSalary: number
  totalEstimatedSalary: number
}

type TeamSalaryEntry = {
  userId: number
  baseSalary: number | null
  deductionAmount: number | null
  bonusAmount: number | null
  finalSalary: number | null
  estimatedSalary: number | null
  penaltyPoints: number | null
  penaltiesCount: number | null
  bonusesCount: number | null
}

/* ─── Month name helper ───────────────────────────────────── */
function getMonthName(month: number): string {
  return new Intl.DateTimeFormat(getIntlLocale(), { month: 'long' }).format(new Date(2024, month - 1))
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
          title={`${entry.label ?? `Slot ${entry.day}`}: ${entry.status}`}
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

function getOverrideTypeLabel(dayType: string | null | undefined) {
  return normalizeOverrideDayType(dayType) === 'short_day' ? 'Short Day' : 'Holiday'
}

function getOverrideScopeLabel(item: WorkdayOverrideRecord) {
  if (item.target_type === 'all') {
    return 'All members'
  }

  return item.member_name?.trim() || (item.member_id ? `Member #${item.member_id}` : 'Selected members')
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat(getIntlLocale(), {
    maximumFractionDigits: 0,
  }).format(value)
}

/* ─── Parse all-users-updates response ───────────────────── */
function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function parsePayload(payload: unknown): unknown {
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
    return payload
  }
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

const unknownNameLabels = new Set(['unknown', 'unknown member', 'unknown user', 'member unknown'])

function joinNameParts(...parts: Array<string | undefined>) {
  const value = parts.filter(Boolean).join(' ').trim()
  return value || undefined
}

function resolveDisplayName(...sources: Array<UnknownRecord | null | undefined>) {
  for (const source of sources) {
    if (!source) {
      continue
    }

    const directName = findFirstString(source, ['full_name', 'user_name', 'employee_name', 'member_name', 'display_name'])

    if (directName && !unknownNameLabels.has(directName.trim().toLowerCase())) {
      return directName.trim()
    }

    const composedName = joinNameParts(
      findFirstString(source, ['first_name', 'firstName', 'name']),
      findFirstString(source, ['surname', 'last_name', 'lastName']),
    )

    if (composedName && !unknownNameLabels.has(composedName.trim().toLowerCase())) {
      return composedName
    }

    const plainName = findFirstString(source, ['name'])

    if (plainName && !unknownNameLabels.has(plainName.trim().toLowerCase())) {
      return plainName.trim()
    }
  }

  return undefined
}

function isDateKey(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function parseDateValue(value: string) {
  if (isDateKey(value)) {
    const [year, month, day] = value.split('-').map(Number)
    return new Date(year, month - 1, day)
  }

  return new Date(value)
}

function normalizeOverrideDayType(value: unknown): WorkdayOverrideRecord['day_type'] {
  if (typeof value !== 'string') {
    return 'holiday'
  }

  const normalized = value.trim().toLowerCase().replace(/\s+/g, '_')
  return normalized === 'short_day' ? 'short_day' : 'holiday'
}

function extractWorkdayOverride(source: UnknownRecord): WorkdayOverrideRecord | null {
  const rawOverride = isRecord(source.workday_override)
    ? source.workday_override
    : isRecord(source.workdayOverride)
      ? source.workdayOverride
      : null

  if (!rawOverride) {
    return null
  }

  return {
    id: toNumber(rawOverride.id) ?? 0,
    special_date: findFirstString(rawOverride, ['special_date', 'date']) ?? '',
    day_type: normalizeOverrideDayType(rawOverride.day_type ?? rawOverride.type),
    title: findFirstString(rawOverride, ['title', 'label', 'name']) ?? 'Workday override',
    note: findFirstString(rawOverride, ['note', 'description', 'remarks']) ?? null,
    target_type: findFirstString(rawOverride, ['target_type']) ?? 'all',
    member_id: toNumber(rawOverride.member_id ?? rawOverride.user_id),
    member_name: findFirstString(rawOverride, ['member_name', 'member', 'user_name']) ?? null,
    workday_hours:
      typeof rawOverride.workday_hours === 'string'
        ? rawOverride.workday_hours
        : typeof rawOverride.workday_hours === 'number' && Number.isFinite(rawOverride.workday_hours)
          ? String(rawOverride.workday_hours)
          : null,
    update_required: toBoolean(rawOverride.update_required) ?? false,
    created_by: toNumber(rawOverride.created_by) ?? 0,
    created_at: findFirstString(rawOverride, ['created_at']) ?? '',
    updated_at: findFirstString(rawOverride, ['updated_at']) ?? '',
  }
}

function isWorkdayOverrideOffDay(override: WorkdayOverrideRecord | null) {
  if (!override) {
    return false
  }

  if (override.day_type === 'holiday') {
    return true
  }

  return override.update_required === false
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

function normalizeDayStatus(
  value: unknown,
  date: Date | null,
  options?: { isDayOff?: boolean | null },
): DayStatus {
  if ((date && date.getDay() === 0) || options?.isDayOff) {
    return 'sunday'
  }

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

  if (isRecord(value)) {
    const workdayOverride = extractWorkdayOverride(value)
    const sundayValue = toBoolean(value.is_sunday ?? value.sunday)

    if (sundayValue) {
      return 'sunday'
    }

    const workingDayValue = toBoolean(value.is_working_day ?? value.working_day)

    if (workingDayValue === false) {
      return 'sunday'
    }

    const isDayOff = toBoolean(value.is_day_off ?? value.day_off)

    if (isDayOff === true || isWorkdayOverrideOffDay(workdayOverride)) {
      return 'sunday'
    }

    const missingValue = toBoolean(value.is_missing ?? value.missing)

    if (missingValue === true) {
      return 'missing'
    }

    const submittedValue = toBoolean(value.is_submitted ?? value.submitted)

    if (submittedValue === true) {
      return 'submitted'
    }

    return normalizeDayStatus(
      value.status ??
        value.day_status ??
        value.submission_status ??
        value.type ??
        value.value ??
        value.result,
      date,
      { isDayOff },
    )
  }

  return fallback
}

function normalizeDayStatusEntry(
  raw: unknown,
  month: number,
  year: number,
): EmployeeDayStatus | null {
  if (!isRecord(raw)) {
    return null
  }

  const dateValue = findFirstString(raw, ['date', 'full_date', 'calendar_date', 'day_date'])
  const numericDay = toNumber(raw.day ?? raw.day_of_month ?? raw.day_number)
  const date = dateValue
    ? parseDateValue(dateValue)
    : numericDay
      ? new Date(year, month - 1, numericDay)
      : null

  if (date && Number.isNaN(date.getTime())) {
    return null
  }

  const workdayOverride = extractWorkdayOverride(raw)
  const isDayOff = toBoolean(raw.is_day_off ?? raw.day_off) ?? isWorkdayOverrideOffDay(workdayOverride)
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
    { isDayOff },
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

function parseDayStatuses(
  raw: unknown,
  month: number,
  year: number,
): EmployeeDayStatus[] | null {
  const entries = Array.isArray(raw)
    ? raw
    : isRecord(raw)
      ? Object.entries(raw)
        .filter(([key]) => isDateKey(key) || /^\d{1,2}$/.test(key))
        .map(([key, value]) => (isDateKey(key) ? { date: key, status: value } : { day: Number(key), status: value }))
      : []

  const parsed = entries
    .map((entry) => normalizeDayStatusEntry(entry, month, year))
    .filter((entry): entry is EmployeeDayStatus => Boolean(entry))
    .sort((left, right) => left.day - right.day)

  return parsed.length > 0 ? parsed : null
}

function normalizeEmployee(
  raw: Record<string, unknown>,
  month: number,
  year: number,
): EmployeeMonthlyStats {
  const userRecord = isRecord(raw.user) ? raw.user : null
  const summaryRecord = isRecord(raw.summary) ? raw.summary : null
  const name = resolveDisplayName(raw, userRecord, summaryRecord) ?? 'Unknown'

  const dayStatuses = parseDayStatuses(
    raw.daily_statuses ??
    summaryRecord?.daily_statuses ??
    raw.day_statuses ??
    summaryRecord?.day_statuses ??
    raw.daily_updates ??
    raw.statuses ??
    raw.days ??
    raw.calendar ??
    raw.entries ??
    raw.monthly_activity ??
    raw.activity,
    month,
    year,
  )

  const submitted =
    toNumber(raw.submitted_count ?? raw.updates_count ?? raw.total_submitted ?? raw.logged_count ?? raw.submitted ?? raw.total_reports ?? raw.report_count ?? raw.reports_count ?? summaryRecord?.submitted_count ?? summaryRecord?.updates_count ?? summaryRecord?.total_reports ?? summaryRecord?.report_count ?? summaryRecord?.reports_count) ??
    (Array.isArray(raw.updates) ? raw.updates.length : null) ??
    (dayStatuses ? dayStatuses.filter((entry) => entry.status === 'submitted').length : 0)

  const missing =
    toNumber(raw.missing_count ?? raw.total_missing ?? raw.missing_days ?? raw.missed_count ?? raw.absent_count ?? raw.missing ?? summaryRecord?.missing_count ?? summaryRecord?.total_missing ?? summaryRecord?.missing_days) ??
    (dayStatuses ? dayStatuses.filter((entry) => entry.status === 'missing').length : 0)

  const rawCompletion =
    toNumber(raw.completion_percentage ?? raw.completion_rate ?? raw.percentage ?? raw.percent ?? raw.avg_percentage ?? raw.update_percentage ?? raw.average_update_percentage ?? raw.salary_update_percentage ?? summaryRecord?.completion_percentage ?? summaryRecord?.completion_rate ?? summaryRecord?.percentage ?? summaryRecord?.avg_percentage ?? summaryRecord?.average_update_percentage)
  const completion =
    rawCompletion !== null
      ? rawCompletion <= 1 ? rawCompletion * 100 : rawCompletion
      : submitted + missing > 0
        ? Math.round((submitted / (submitted + missing)) * 100)
        : 0

  const lastDate =
    findFirstString(raw, ['last_update_date', 'last_update', 'updated_at', 'submitted_at', 'last_report_date']) ??
    findFirstString(summaryRecord ?? {}, ['last_update_date', 'last_update', 'updated_at', 'submitted_at', 'last_report_date']) ??
    null

  return {
    user_id: toNumber(raw.user_id ?? raw.id ?? raw.employee_id ?? raw.member_id ?? userRecord?.id) ?? 0,
    user_name: name,
    telegram_username:
      findFirstString(raw, ['telegram_username', 'telegram_id']) ??
      findFirstString(userRecord ?? {}, ['telegram_username', 'telegram_id']) ??
      null,
    submitted_count: submitted,
    missing_count: missing,
    completion_percentage: completion,
    last_update_date: lastDate,
    daily_statuses: dayStatuses,
  }
}

function parseAllUsersUpdates(
  data: unknown,
  month: number,
  year: number,
): EmployeeMonthlyStats[] {
  const parsed = parsePayload(data)

  if (!parsed) return []

  const list: Record<string, unknown>[] = Array.isArray(parsed)
    ? parsed as Record<string, unknown>[]
    : (() => {
        const obj = parsed as Record<string, unknown>
        for (const key of ['employees', 'users', 'data', 'results', 'items', 'team', 'members', 'team_updates', 'all_users', 'monthly_updates']) {
          if (Array.isArray(obj[key])) return obj[key] as Record<string, unknown>[]
        }
        return []
      })()

  return list
    .filter((d): d is Record<string, unknown> => typeof d === 'object' && d !== null)
    .map((entry) => normalizeEmployee(entry, month, year))
}

function buildEmployeesFromRoster(memberOptions: WorkdayOverrideMemberOption[]): EmployeeMonthlyStats[] {
  return memberOptions.map((member) => ({
    user_id: member.id,
    user_name: member.full_name?.trim() || `${member.name ?? ''} ${member.surname ?? ''}`.trim() || `User #${member.id}`,
    telegram_username: member.telegram_id ?? null,
    submitted_count: 0,
    missing_count: 0,
    completion_percentage: 0,
    last_update_date: null,
    daily_statuses: null,
    base_salary: null,
    estimated_salary: null,
    final_salary: null,
    deduction_amount: null,
    bonus_amount: null,
    penalty_points: null,
    penalties_count: null,
    bonuses_count: null,
  }))
}

function normalizePercentage(value: unknown) {
  const rawValue = toNumber(value)

  if (rawValue === null) {
    return null
  }

  return rawValue <= 1 ? rawValue * 100 : rawValue
}

function getEmployeePeriods(raw: unknown) {
  if (!isRecord(raw) || !Array.isArray(raw.periods)) {
    return [] as UnknownRecord[]
  }

  return raw.periods.filter(isRecord)
}

function getSelectedPeriod(periods: UnknownRecord[], month: number, year: number) {
  return periods.find((period) => (
    toNumber(period.year) === year &&
    toNumber(period.month) === month
  )) ?? null
}

function getLatestReportDate(periods: UnknownRecord[]) {
  const datedPeriods = periods
    .map((period) => findFirstString(period, ['latest_report_date', 'last_update_date', 'last_report_date', 'updated_at']))
    .filter((value): value is string => Boolean(value))

  if (datedPeriods.length === 0) {
    return null
  }

  return datedPeriods.reduce<string | null>((latest, current) => {
    if (!latest) {
      return current
    }

    const latestDate = new Date(latest)
    const currentDate = new Date(current)

    if (Number.isNaN(currentDate.getTime())) {
      return latest
    }

    if (Number.isNaN(latestDate.getTime()) || currentDate > latestDate) {
      return current
    }

    return latest
  }, null)
}

function buildMonthlyActivityFromPeriods(periods: UnknownRecord[], year: number): EmployeeDayStatus[] {
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  return ALL_MONTHS.map(({ value, label }) => {
    const period = getSelectedPeriod(periods, value, year)
    const reportsCount = toNumber(period?.reports_count ?? period?.total_reports ?? period?.submitted_count) ?? 0
    const averagePercentage = normalizePercentage(
      period?.average_update_percentage ??
      period?.completion_percentage ??
      period?.percentage,
    ) ?? 0
    const latestReportDate = findFirstString(period ?? {}, ['latest_report_date', 'last_update_date', 'last_report_date', 'updated_at'])

    let status: DayStatus = 'neutral'

    if (year > currentYear || (year === currentYear && value > currentMonth)) {
      status = 'future'
    } else if (period) {
      status = reportsCount > 0 || averagePercentage > 0 || Boolean(latestReportDate)
        ? 'submitted'
        : 'missing'
    }

    return {
      day: value,
      label: label.slice(0, 3),
      status,
    }
  })
}

function mergeEmployeeHistory(
  fallbackEmployee: EmployeeMonthlyStats,
  rawHistory: unknown,
  month: number,
  year: number,
): EmployeeMonthlyStats {
  if (!isRecord(rawHistory)) {
    return fallbackEmployee
  }

  const summary = isRecord(rawHistory.summary) ? rawHistory.summary : null
  const periods = getEmployeePeriods(rawHistory)
  const selectedPeriod = getSelectedPeriod(periods, month, year)
  const historySubmittedCount =
    toNumber(selectedPeriod?.reports_count ?? selectedPeriod?.total_reports ?? selectedPeriod?.submitted_count) ??
    toNumber(summary?.total_reports ?? summary?.reports_count ?? summary?.submitted_count) ??
    null
  const historyCompletion =
    normalizePercentage(
      selectedPeriod?.average_update_percentage ??
      selectedPeriod?.completion_percentage ??
      selectedPeriod?.percentage ??
      summary?.average_update_percentage ??
      summary?.completion_percentage ??
      summary?.percentage,
    )
  const lastUpdateDate =
    findFirstString(selectedPeriod ?? {}, ['latest_report_date', 'last_update_date', 'last_report_date', 'updated_at']) ??
    getLatestReportDate(periods) ??
    fallbackEmployee.last_update_date
  const fallbackHasLiveStats =
    fallbackEmployee.submitted_count > 0 ||
    fallbackEmployee.missing_count > 0 ||
    fallbackEmployee.completion_percentage > 0
  const fallbackHasDayStatuses = Boolean(fallbackEmployee.daily_statuses?.length)
  const historyHasUsefulStats =
    (typeof historySubmittedCount === 'number' && historySubmittedCount > 0) ||
    (typeof historyCompletion === 'number' && historyCompletion > 0)
  const historyActivity = buildMonthlyActivityFromPeriods(periods, year)

  return {
    user_id: toNumber(rawHistory.user_id ?? fallbackEmployee.user_id) ?? fallbackEmployee.user_id,
    user_name: resolveDisplayName(rawHistory, summary, selectedPeriod) ?? fallbackEmployee.user_name,
    telegram_username:
      findFirstString(rawHistory, ['telegram_username', 'telegram_id']) ??
      fallbackEmployee.telegram_username,
    submitted_count: historyHasUsefulStats ? (historySubmittedCount ?? fallbackEmployee.submitted_count) : fallbackEmployee.submitted_count,
    missing_count: fallbackEmployee.missing_count,
    completion_percentage: historyHasUsefulStats ? (historyCompletion ?? fallbackEmployee.completion_percentage) : fallbackEmployee.completion_percentage,
    last_update_date: lastUpdateDate,
    daily_statuses: fallbackHasDayStatuses || fallbackHasLiveStats ? fallbackEmployee.daily_statuses : historyActivity,
    base_salary: fallbackEmployee.base_salary ?? null,
    estimated_salary: fallbackEmployee.estimated_salary ?? null,
    final_salary: fallbackEmployee.final_salary ?? null,
    deduction_amount: fallbackEmployee.deduction_amount ?? null,
    bonus_amount: fallbackEmployee.bonus_amount ?? null,
    penalty_points: fallbackEmployee.penalty_points ?? null,
    penalties_count: fallbackEmployee.penalties_count ?? null,
    bonuses_count: fallbackEmployee.bonuses_count ?? null,
  }
}

function parseUpdatesAllByEmployee(data: unknown) {
  const parsed = parsePayload(data)

  if (!isRecord(parsed) || !Array.isArray(parsed.employees)) {
    return new Map<number, UnknownRecord>()
  }

  return new Map(
    parsed.employees
      .filter(isRecord)
      .map((employee) => [toNumber(employee.user_id) ?? 0, employee] satisfies [number, UnknownRecord])
      .filter(([userId]) => userId > 0),
  )
}

function buildEmployeesFromHistoryRecords(
  historyByEmployee: Map<number, UnknownRecord>,
  month: number,
  year: number,
): EmployeeMonthlyStats[] {
  return Array.from(historyByEmployee.values()).map((record) => (
    mergeEmployeeHistory(
      {
        user_id: toNumber(record.user_id ?? record.id ?? record.employee_id ?? record.member_id) ?? 0,
        user_name:
          resolveDisplayName(
            record,
            isRecord(record.user) ? record.user : null,
            isRecord(record.summary) ? record.summary : null,
          ) ??
          `Member #${toNumber(record.user_id ?? record.id ?? record.employee_id ?? record.member_id) ?? 0}`,
        telegram_username: findFirstString(record, ['telegram_username', 'telegram_id']) ?? null,
        submitted_count: 0,
        missing_count: 0,
        completion_percentage: 0,
        last_update_date: null,
        daily_statuses: null,
        base_salary: null,
        estimated_salary: null,
        final_salary: null,
        deduction_amount: null,
        bonus_amount: null,
        penalty_points: null,
        penalties_count: null,
        bonuses_count: null,
      },
      record,
      month,
      year,
    )
  )).filter((employee) => employee.user_id > 0)
}

function parseTeamUpdatesSummary(data: unknown): TeamUpdatesSummary | null {
  const parsed = parsePayload(data)

  if (!isRecord(parsed)) {
    return null
  }

  const summary = isRecord(parsed.summary) ? parsed.summary : parsed
  const rawAverage =
    toNumber(
      summary.average_update_percentage ??
      summary.avg_completion_percentage ??
      summary.completion_percentage ??
      summary.update_percentage,
    ) ?? 0

  return {
    totalEmployees:
      toNumber(summary.total_employees ?? summary.employees_count ?? summary.employee_count) ?? 0,
    totalReports:
      toNumber(summary.total_reports ?? summary.updates_count ?? summary.submitted_count) ?? 0,
    averageCompletion:
      rawAverage <= 1 ? rawAverage * 100 : rawAverage,
  }
}

function parseMissingEmployeesCount(data: unknown): number | null {
  const parsed = parsePayload(data)

  if (Array.isArray(parsed)) {
    return parsed.length
  }

  if (!isRecord(parsed)) {
    return null
  }

  for (const key of ['employees', 'users', 'items', 'results', 'data', 'members']) {
    if (Array.isArray(parsed[key])) {
      return parsed[key].length
    }
  }

  return toNumber(
    parsed.missing_count ??
    parsed.total_missing ??
    parsed.count ??
    parsed.total,
  )
}

function parseSalarySummary(data: unknown): TeamSalarySummary | null {
  const parsed = parsePayload(data)

  if (!isRecord(parsed)) {
    return null
  }

  const summary = isRecord(parsed.summary) ? parsed.summary : parsed

  return {
    employeesCount: toNumber(summary.employees_count ?? summary.total_employees ?? summary.employee_count) ?? 0,
    totalBaseSalary: toNumber(summary.total_base_salary ?? summary.base_salary_total) ?? 0,
    totalDeductionAmount: toNumber(summary.total_deduction_amount ?? summary.deduction_amount_total) ?? 0,
    totalBonusAmount: toNumber(summary.total_bonus_amount ?? summary.bonus_amount_total) ?? 0,
    totalFinalSalary: toNumber(summary.total_final_salary ?? summary.final_salary_total) ?? 0,
    totalEstimatedSalary: toNumber(summary.total_estimated_salary ?? summary.estimated_salary_total ?? summary.salary_estimate_total) ?? 0,
  }
}

function parseSalaryEntry(raw: unknown): TeamSalaryEntry | null {
  if (!isRecord(raw)) {
    return null
  }

  const salaryEstimate = isRecord(raw.salary_estimate)
    ? raw.salary_estimate
    : isRecord(raw.salaryEstimate)
      ? raw.salaryEstimate
      : null

  const userId = toNumber(raw.user_id ?? raw.id ?? raw.employee_id ?? raw.member_id)

  if (!userId) {
    return null
  }

  return {
    userId,
    baseSalary: toNumber(salaryEstimate?.base_salary ?? raw.base_salary ?? raw.default_salary),
    deductionAmount: toNumber(salaryEstimate?.deduction_amount ?? raw.deduction_amount),
    bonusAmount: toNumber(salaryEstimate?.total_bonus_amount ?? salaryEstimate?.bonus_amount ?? raw.total_bonus_amount ?? raw.bonus_amount),
    finalSalary: toNumber(salaryEstimate?.final_salary ?? raw.final_salary),
    estimatedSalary: toNumber(salaryEstimate?.estimated_salary ?? raw.estimated_salary),
    penaltyPoints: toNumber(salaryEstimate?.total_penalty_points ?? raw.total_penalty_points ?? raw.penalty_points),
    penaltiesCount: toNumber(raw.penalties_count ?? raw.penalty_count),
    bonusesCount: toNumber(raw.bonuses_count ?? raw.bonus_count),
  }
}

function parseSalaryEstimatesByEmployee(data: unknown) {
  const parsed = parsePayload(data)

  if (!isRecord(parsed) || !Array.isArray(parsed.employees)) {
    return new Map<number, TeamSalaryEntry>()
  }

  return new Map(
    parsed.employees
      .map((entry) => parseSalaryEntry(entry))
      .filter((entry): entry is TeamSalaryEntry => Boolean(entry))
      .map((entry) => [entry.userId, entry] satisfies [number, TeamSalaryEntry]),
  )
}

function mergeEmployeeSalary(
  employee: EmployeeMonthlyStats,
  salaryEntry: TeamSalaryEntry | undefined,
): EmployeeMonthlyStats {
  if (!salaryEntry) {
    return employee
  }

  return {
    ...employee,
    base_salary: salaryEntry.baseSalary,
    estimated_salary: salaryEntry.estimatedSalary,
    final_salary: salaryEntry.finalSalary,
    deduction_amount: salaryEntry.deductionAmount,
    bonus_amount: salaryEntry.bonusAmount,
    penalty_points: salaryEntry.penaltyPoints,
    penalties_count: salaryEntry.penaltiesCount,
    bonuses_count: salaryEntry.bonusesCount,
  }
}

function mergeEmployeeStats(
  employee: EmployeeMonthlyStats,
  statsEntry: EmployeeMonthlyStats | undefined,
): EmployeeMonthlyStats {
  if (!statsEntry) {
    return employee
  }

  const statsHasUsefulValues =
    statsEntry.submitted_count > 0 ||
    statsEntry.missing_count > 0 ||
    statsEntry.completion_percentage > 0 ||
    Boolean(statsEntry.last_update_date) ||
    Boolean(statsEntry.daily_statuses?.length)

  return {
    ...employee,
    user_id: statsEntry.user_id || employee.user_id,
    user_name: statsEntry.user_name || employee.user_name,
    telegram_username: statsEntry.telegram_username ?? employee.telegram_username,
    submitted_count: statsHasUsefulValues ? statsEntry.submitted_count : employee.submitted_count,
    missing_count: statsHasUsefulValues ? statsEntry.missing_count : employee.missing_count,
    completion_percentage: statsHasUsefulValues ? statsEntry.completion_percentage : employee.completion_percentage,
    last_update_date: statsHasUsefulValues ? (statsEntry.last_update_date ?? employee.last_update_date) : employee.last_update_date,
    daily_statuses:
      statsHasUsefulValues && statsEntry.daily_statuses && statsEntry.daily_statuses.length > 0
        ? statsEntry.daily_statuses
        : employee.daily_statuses,
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
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear]   = useState(now.getFullYear())
  const [search, setSearch]             = useState('')
  const [sortKey, setSortKey]           = useState<SortKey>('submitted')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const memberOptionsQuery = useAsyncData(() => updateTrackingService.workdayOverrideMemberOptions(), [])
  const rosterEmployees = useMemo(
    () => buildEmployeesFromRoster(memberOptionsQuery.data ?? []),
    [memberOptionsQuery.data],
  )
  const rosterEmployeeIds = useMemo(
    () => rosterEmployees.map((member) => member.user_id),
    [rosterEmployees],
  )

  const historyQuery = useAsyncData(
    () => membersService.updatesAll({
      year,
      month,
      employeeIds: rosterEmployeeIds.length > 0 ? rosterEmployeeIds : undefined,
    }),
    [year, month, rosterEmployeeIds.join(',')],
  )
  const historyByEmployee = useMemo(
    () => parseUpdatesAllByEmployee(historyQuery.data),
    [historyQuery.data],
  )
  const historyEmployees = useMemo(
    () => buildEmployeesFromHistoryRecords(historyByEmployee, month, year),
    [historyByEmployee, month, year],
  )
  const employeeIds = useMemo(
    () => (rosterEmployeeIds.length > 0 ? rosterEmployeeIds : historyEmployees.map((member) => member.user_id)),
    [historyEmployees, rosterEmployeeIds],
  )

  const trackingMonthlyQuery = useAsyncData(
    () => updateTrackingService.teamMonthly(month, year),
    [month, year],
  )
  const missingTodayQuery = useAsyncData(
    () => updateTrackingService.missing(currentDateKey),
    [],
  )
  const teamQuery    = useAsyncData(
    () => membersService.updatesStatistics({ month, year, employeeIds }),
    [month, year, employeeIds.join(',')],
    { enabled: employeeIds.length > 0 },
  )
  const salaryQuery = useAsyncData(
    () => membersService.salaryEstimates({ year, month, employeeIds }),
    [month, year, employeeIds.join(',')],
    { enabled: employeeIds.length > 0 },
  )
  const workdayOverridesQuery = useAsyncData(
    () => updateTrackingService.workdayOverrides({ month, year }),
    [month, year],
  )
  const teamSummary = useMemo(
    () => parseTeamUpdatesSummary(teamQuery.data),
    [teamQuery.data],
  )
  const teamEmployees = useMemo(
    () => parseAllUsersUpdates(teamQuery.data, month, year),
    [teamQuery.data, month, year],
  )
  const teamEmployeesById = useMemo(
    () => new Map(teamEmployees.map((employee) => [employee.user_id, employee])),
    [teamEmployees],
  )
  const missingTodayCount = useMemo(
    () => parseMissingEmployeesCount(missingTodayQuery.data),
    [missingTodayQuery.data],
  )
  const salarySummary = useMemo(
    () => parseSalarySummary(salaryQuery.data),
    [salaryQuery.data],
  )
  const rawEmployees = useMemo(
    () => {
      const parsedEmployees = parseAllUsersUpdates(trackingMonthlyQuery.data, month, year)

      if (parsedEmployees.length === 0) {
        return rosterEmployees.length > 0 ? rosterEmployees : historyEmployees
      }

      const parsedById = new Map(parsedEmployees.map((employee) => [employee.user_id, employee]))
      const fallbackEmployees = rosterEmployees.length > 0 ? rosterEmployees : historyEmployees

      return fallbackEmployees.map((employee) => parsedById.get(employee.user_id) ?? employee)
    },
    [historyEmployees, month, rosterEmployees, trackingMonthlyQuery.data, year],
  )
  const salaryByEmployee = useMemo(
    () => parseSalaryEstimatesByEmployee(salaryQuery.data),
    [salaryQuery.data],
  )
  const mergedEmployees = useMemo(
    () => rawEmployees.map((employee) => (
      mergeEmployeeSalary(
        mergeEmployeeStats(
          mergeEmployeeHistory(employee, historyByEmployee.get(employee.user_id), month, year),
          teamEmployeesById.get(employee.user_id),
        ),
        salaryByEmployee.get(employee.user_id),
      )
    )),
    [historyByEmployee, month, rawEmployees, salaryByEmployee, teamEmployeesById, year],
  )

  async function handleRefresh() {
    const results = await Promise.allSettled([
      memberOptionsQuery.refetch(),
      trackingMonthlyQuery.refetch(),
      missingTodayQuery.refetch(),
      teamQuery.refetch(),
      historyQuery.refetch(),
      salaryQuery.refetch(),
      workdayOverridesQuery.refetch(),
    ])

    const failed = results.find((result) => result.status === 'rejected')

    if (failed?.status === 'rejected') {
      showToast({
        title: 'Refresh failed',
        description: getApiErrorMessage(failed.reason),
        tone: 'error',
      })
      return
    }

    showToast({ title: 'Refreshed', description: 'Team monthly data reloaded.', tone: 'success' })
  }

  function openMemberDetail(employee: EmployeeMonthlyStats) {
    if (!Number.isFinite(employee.user_id) || employee.user_id <= 0) {
      showToast({
        title: 'Member detail unavailable',
        description: 'This employee row does not include a valid member ID.',
        tone: 'error',
      })
      return
    }

    navigate(`/faults/members/${employee.user_id}?year=${year}&month=${month}`)
  }

  const sourceEmployees = mergedEmployees.length > 0 ? mergedEmployees : rawEmployees
  const employees = useMemo(
    () => filterAndSort(sourceEmployees, search, sortKey, statusFilter),
    [sourceEmployees, search, sortKey, statusFilter],
  )
  const workdayOverrides = useMemo(
    () => [...(workdayOverridesQuery.data ?? [])].sort((left, right) => right.special_date.localeCompare(left.special_date)),
    [workdayOverridesQuery.data],
  )

  const hasRosterData = rosterEmployees.length > 0 || historyEmployees.length > 0

  if (
    (memberOptionsQuery.isLoading && historyQuery.isLoading && !hasRosterData) ||
    ((teamQuery.isLoading || trackingMonthlyQuery.isLoading) && !teamQuery.data && !trackingMonthlyQuery.data && !hasRosterData)
  ) {
    return (
      <LoadingStateBlock
        eyebrow="CEO / Team Updates"
        title="Loading team monthly data"
        description="Fetching employee update statistics for the selected period."
      />
    )
  }

  if (
    (memberOptionsQuery.isError && historyQuery.isError && !hasRosterData) ||
    (teamQuery.isError && trackingMonthlyQuery.isError && !teamQuery.data && !trackingMonthlyQuery.data && !hasRosterData)
  ) {
    return (
      <ErrorStateBlock
        eyebrow="CEO / Team Updates"
        title="Team data unavailable"
        description="Could not load monthly team update statistics."
        actionLabel="Retry"
        onAction={() => void handleRefresh()}
      />
    )
  }

  const totalEmployees = rosterEmployees.length || sourceEmployees.length || teamSummary?.totalEmployees || salarySummary?.employeesCount || 0
  const totalSubmitted = sourceEmployees.reduce((s, e) => s + e.submitted_count, 0)
  const totalMissing   = sourceEmployees.reduce((s, e) => s + e.missing_count, 0)
  const totalEstimatedSalary = salarySummary?.totalEstimatedSalary ??
    sourceEmployees.reduce((sum, employee) => sum + (employee.estimated_salary ?? 0), 0)
  const avgCompletion  = sourceEmployees.length
    ? sourceEmployees.reduce((s, e) => s + e.completion_percentage, 0) / sourceEmployees.length
    : (teamSummary?.averageCompletion ?? 0)
  const topPerformer   = sourceEmployees.length
    ? sourceEmployees.reduce((best, e) => e.completion_percentage > best.completion_percentage ? e : best, sourceEmployees[0])
    : null
  const selectedMonthName = getMonthName(month)
  const holidayOverrides = workdayOverrides.filter((item) => normalizeOverrideDayType(item.day_type) === 'holiday')
  const shortDayOverrides = workdayOverrides.filter((item) => normalizeOverrideDayType(item.day_type) === 'short_day')
  const noUpdateOverrides = workdayOverrides.filter((item) => !item.update_required)
  const scopedOverrideCount = workdayOverrides.filter((item) => item.target_type !== 'all').length

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
              {typeof missingTodayCount === 'number' ? (
                <Badge variant={missingTodayCount > 0 ? 'warning' : 'success'} dot>
                  {missingTodayCount} missing today
                </Badge>
              ) : null}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/ceo/workday-overrides')}
                className="min-h-[42px] rounded-xl border border-white/10 bg-white/4 px-3 py-1.5 text-white hover:border-white/15 hover:bg-white/6"
              >
                Workday overrides
              </Button>
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
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6 stagger-children">
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
          label="Estimated Payroll"
          value={formatCurrency(totalEstimatedSalary)}
          icon={
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 6h12" />
              <path d="M4 10h12" />
              <path d="M4 14h12" />
              <path d="M7 3v14" />
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
        <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
          <SectionTitle
            title="Workday Overrides"
            description="Holiday va short day yozuvlari monthly update expectation bilan birga ko‘rinadi."
          />
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="blue">{workdayOverrides.length} entries</Badge>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/ceo/workday-overrides')}
              className="rounded-xl"
            >
              Open overrides page
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            accent="warning"
            label="Holiday Rules"
            value={holidayOverrides.length}
            icon={
              <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 3v4" />
                <path d="M10 13v4" />
                <path d="M3 10h4" />
                <path d="M13 10h4" />
                <circle cx="10" cy="10" r="3" />
              </svg>
            }
          />
          <SummaryCard
            accent="blue"
            label="Short Day Rules"
            value={shortDayOverrides.length}
            icon={
              <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="10" cy="10" r="8" />
                <path d="M10 5v5l3 2" />
              </svg>
            }
          />
          <SummaryCard
            accent="success"
            label="No Update Required"
            value={noUpdateOverrides.length}
            icon={
              <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6.5 10 2.5 2.5 4.5-4.5" />
                <circle cx="10" cy="10" r="8" />
              </svg>
            }
          />
          <SummaryCard
            accent="default"
            label="Specific Scope"
            value={scopedOverrideCount}
            icon={
              <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="8" cy="7" r="3" />
                <path d="M2 17c0-3.3 2.7-6 6-6" />
                <path d="M13 7h4" />
                <path d="M15 5v4" />
              </svg>
            }
          />
        </div>

        <div className="mt-5">
          {workdayOverridesQuery.isError ? (
            <div className="rounded-[20px] border border-amber-500/18 bg-amber-500/[0.08] px-4 py-4 text-sm text-amber-100/82">
              Workday overrides endpointdan ma'lumot olinmadi. Team table ishlashda davom etadi, lekin override section bo‘sh qoladi.
            </div>
          ) : workdayOverrides.length > 0 ? (
            <div className="grid gap-3 xl:grid-cols-2">
              {workdayOverrides.slice(0, 4).map((item) => (
                <div
                  key={item.id}
                  className="rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    <Badge variant={normalizeOverrideDayType(item.day_type) === 'short_day' ? 'blue' : 'warning'}>
                      {getOverrideTypeLabel(item.day_type)}
                    </Badge>
                    <Badge variant={item.update_required ? 'success' : 'outline'}>
                      {item.update_required ? 'Update required' : 'No update required'}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-(--muted-strong)">{formatShortDate(item.special_date)}</p>
                  <p className="mt-2 text-sm text-white/76">{getOverrideScopeLabel(item)}</p>
                  {item.note?.trim() ? (
                    <p className="mt-2 line-clamp-2 text-sm text-white/70">{item.note}</p>
                  ) : null}
                  {item.workday_hours ? (
                    <p className="mt-2 text-xs uppercase tracking-[0.16em] text-blue-300/70">
                      {item.workday_hours}h workday
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[20px] border border-dashed border-white/10 bg-black/10 px-4 py-5 text-sm text-(--muted)">
              {selectedMonthName} {year} uchun override yozuvlari topilmadi.
            </div>
          )}
        </div>
      </Card>

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
                        <div>
                          <span className="text-sm font-semibold text-white">{emp.user_name}</span>
                          {typeof emp.estimated_salary === 'number' && emp.estimated_salary > 0 ? (
                            <p className="mt-1 text-xs text-(--muted)">
                              Est. salary: {formatCurrency(emp.estimated_salary)}
                            </p>
                          ) : null}
                        </div>
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
                      <Button
                        variant="secondary"
                        size="sm"
                        className="whitespace-nowrap rounded-lg"
                        onClick={() => openMemberDetail(emp)}
                        disabled={!Number.isFinite(emp.user_id) || emp.user_id <= 0}
                      >
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
                Active month
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-rose-500/80" />
                No reports
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-white/12" />
                No data
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-white/18" />
                Future month
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
