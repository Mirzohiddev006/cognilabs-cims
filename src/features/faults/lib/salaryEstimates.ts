import type { DayStatus } from '../../../shared/api/types'
import type { CeoUserRecord } from '../../../shared/api/services/ceo.service'
import type { WorkdayOverrideRecord } from '../../../shared/api/services/updateTracking.service'

export type UnknownRecord = Record<string, unknown>

export type SalaryEstimateSnapshot = {
  userId: number | null
  userLabel?: string
  userName?: string
  roleLabel?: string
  baseSalary?: number
  estimatedSalary?: number
  penaltyPoints?: number
  penaltyEntries?: number
  penaltyPercentage?: number
  deductionAmount?: number
  afterPenalty?: number
  bonusEntries?: number
  bonusAmount?: number
  finalSalary?: number
}

export type EmployeeSalaryReport = {
  id: number
  label: string
  fullName: string
  roleLabel: string
  baseSalary: number
  estimatedSalary: number
  deductionAmount: number
  bonusAmount: number
  afterPenalty: number
  finalSalary: number
  penaltyPoints: number
  penaltyEntries: number
  bonusEntries: number
  penaltyPercentage: number
  hasPenalty: boolean
  hasBonus: boolean
}

export type SalaryLedgerItem = {
  id: string
  title: string
  description?: string
  amount: number
  points?: number
  percentage?: number
  createdAt?: string
}

export type MemberUpdateSummary = {
  totalUpdates: number
  submittedCount: number
  missingCount: number
  completionPercentage: number
  updatePercentage?: number
  salaryAmount?: number
  nextPaymentDate?: string
  note?: string
  lastUpdateDate?: string
}

export type MemberMonthlyUpdateEntry = {
  id: string
  date: string
  createdAt?: string
  title?: string
  text?: string
}

export type MemberMonthlyUpdateDay = {
  day: number
  date: string
  status: DayStatus
  weekdayShort: string
  weekdayLabel: string
  isToday: boolean
  isFuture: boolean
  isWeekend: boolean
  isDayOff?: boolean | null
  hasUpdate: boolean
  updatesCount: number
  entries: MemberMonthlyUpdateEntry[]
  note?: string | null
  isValid?: boolean | null
  workdayOverride?: WorkdayOverrideRecord | null
}

export type MemberMonthlyUpdateCalendar = {
  month: number
  year: number
  days: MemberMonthlyUpdateDay[]
  submittedCount: number
  missingCount: number
  sundayCount: number
  futureCount: number
  totalUpdates: number
}

export type EmployeeSalaryDetail = {
  memberId: number
  year: number
  month: number
  report: EmployeeSalaryReport
  penalties: SalaryLedgerItem[]
  bonuses: SalaryLedgerItem[]
  updatesSummary: MemberUpdateSummary | null
  updateCalendar: MemberMonthlyUpdateCalendar | null
  estimateSource: 'live' | 'fallback'
  estimateError?: string | null
  updatesError?: string | null
  calendarError?: string | null
}

export const now = new Date()
export const defaultYear = now.getFullYear()
export const defaultMonth = now.getMonth() + 1
const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
const missingMetricValue = Number.NaN
const unknownNameLabels = new Set([
  'unknown',
  'unknown member',
  'unknown user',
  'member unknown',
  'n/a',
  'na',
  'none',
  'null',
  'undefined',
])
const monthlyDayCollectionKeys = [
  'daily_statuses',
  'day_statuses',
  'daily_updates',
  'statuses',
  'days',
  'calendar',
  'monthly_activity',
  'activity',
] as const
const monthlyUpdateCollectionKeys = [
  'updates',
  'recent_updates',
  'recent',
  'items',
  'results',
  'entries',
  'rows',
] as const
const updateTextKeys = [
  'update_content',
  'update_text',
  'message',
  'text',
  'summary',
  'description',
  'content',
  'body',
  'note',
  'comment',
  'remarks',
  'title',
] as const
const updateTitleKeys = ['title', 'subject', 'label', 'type', 'status'] as const
const updateDateKeys = [
  'update_date',
  'date',
  'created_at',
  'submitted_at',
  'updated_at',
  'timestamp',
] as const

export function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function parseMaybeJson(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value
  }

  const trimmed = value.trim()

  if (!trimmed) {
    return value
  }

  try {
    return JSON.parse(trimmed) as unknown
  } catch {
    return value
  }
}

export function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.replace(/\s+/g, '').replace(/,/g, '')
  const match = normalized.match(/-?\d+(?:\.\d+)?/)

  if (!match) {
    return null
  }

  const parsed = Number(match[0])
  return Number.isFinite(parsed) ? parsed : null
}

export function toBoolean(value: unknown): boolean | null {
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

export function isDateKey(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

export function parseDateValue(value: string) {
  if (isDateKey(value)) {
    const [year, month, day] = value.split('-').map(Number)
    return new Date(year, month - 1, day)
  }

  return new Date(value)
}

export function formatDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function isValidDateString(value: string) {
  return !Number.isNaN(parseDateValue(value).getTime())
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
    id: findFirstNumber(rawOverride, ['id']) ?? 0,
    special_date: findFirstString(rawOverride, ['special_date', 'date']) ?? '',
    day_type: normalizeOverrideDayType(rawOverride.day_type ?? rawOverride.type),
    title: findFirstString(rawOverride, ['title', 'label', 'name']) ?? 'Workday override',
    note: findFirstString(rawOverride, ['note', 'description', 'remarks']) ?? null,
    target_type: findFirstString(rawOverride, ['target_type']) ?? 'all',
    member_id: findFirstNumber(rawOverride, ['member_id', 'user_id']) ?? null,
    member_name: findFirstString(rawOverride, ['member_name', 'member', 'user_name']) ?? null,
    workday_hours:
      typeof rawOverride.workday_hours === 'string'
        ? rawOverride.workday_hours
        : typeof rawOverride.workday_hours === 'number' && Number.isFinite(rawOverride.workday_hours)
          ? String(rawOverride.workday_hours)
          : null,
    update_required: toBoolean(rawOverride.update_required) ?? false,
    created_by: findFirstNumber(rawOverride, ['created_by']) ?? 0,
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

export function findFirstString(source: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    const value = source[key]

    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }

  return undefined
}

function joinNameParts(...parts: Array<string | undefined>) {
  const value = parts.filter(Boolean).join(' ').trim()
  return value || undefined
}

function isUnknownName(value?: string | null) {
  if (typeof value !== 'string') {
    return false
  }

  return unknownNameLabels.has(value.trim().toLowerCase())
}

export function resolveRecordDisplayName(...sources: Array<UnknownRecord | null | undefined>) {
  for (const source of sources) {
    if (!source) {
      continue
    }

    const directName = findFirstString(source, [
      'full_name',
      'user_name',
      'employee_name',
      'member_name',
      'display_name',
    ])

    if (directName && !isUnknownName(directName)) {
      return directName
    }

    const composedName = joinNameParts(
      findFirstString(source, ['first_name', 'firstName', 'name']),
      findFirstString(source, ['surname', 'last_name', 'lastName']),
    )

    if (composedName && !isUnknownName(composedName)) {
      return composedName
    }

    const plainName = findFirstString(source, ['name'])

    if (plainName && !isUnknownName(plainName)) {
      return plainName
    }
  }

  return undefined
}

export function findFirstNumber(source: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    const value = toNumber(source[key])

    if (value !== null) {
      return value
    }
  }

  return undefined
}

export function findFirstRecord(source: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    const value = source[key]

    if (isRecord(value)) {
      return value
    }
  }

  return undefined
}

export function findFirstArray(source: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    const value = source[key]

    if (Array.isArray(value)) {
      return value
    }
  }

  return undefined
}

export function sumByKeys(items: unknown[], keys: string[]): number {
  return items.reduce<number>((total, item) => {
    if (!isRecord(item)) {
      return total
    }

    return total + (findFirstNumber(item, keys) ?? 0)
  }, 0)
}

export function getMonthName(month: number) {
  return new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date(2026, month - 1))
}

export const monthOptions = Array.from({ length: 12 }, (_, index) => ({
  value: String(index + 1),
  label: getMonthName(index + 1),
}))

export function formatAmount(value?: number | null) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '—'
  }

  return new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: 0,
  }).format(Math.round(value)).replace(/\u00A0/g, ' ')
}

export function formatPercent(value?: number | null) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '—'
  }

  return `${value.toFixed(1)}%`
}

export function formatCount(value?: number | null) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '—'
  }

  return String(Math.round(value))
}

export function formatDetailDate(value?: string | null) {
  if (!value) {
    return 'Not provided'
  }

  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(parsed)
}

export function normalizePercentageValue(value?: number | null) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined
  }

  return value <= 1 ? value * 100 : value
}

export function normalizeRoleLabel(user?: CeoUserRecord | null, snapshot?: SalaryEstimateSnapshot | null) {
  if (snapshot?.roleLabel?.trim()) {
    return snapshot.roleLabel
  }

  if (typeof user?.job_title === 'string' && user.job_title.trim()) {
    return user.job_title
  }

  if (typeof user?.role === 'string' && user.role.trim()) {
    return user.role
  }

  return 'Member'
}

export function getUserFullName(user?: CeoUserRecord | null, snapshot?: SalaryEstimateSnapshot | null) {
  if (snapshot?.userName?.trim() && !isUnknownName(snapshot.userName)) {
    return snapshot.userName
  }

  const name = `${user?.name ?? ''} ${user?.surname ?? ''}`.trim()

  if (name) {
    return name
  }

  if (snapshot?.userLabel?.trim()) {
    return snapshot.userLabel
  }

  if (typeof snapshot?.userId === 'number' && snapshot.userId > 0) {
    return `Member #${snapshot.userId}`
  }

  return 'Unknown member'
}

export function getPenaltyPercentage(baseSalary: number, deductionAmount: number, explicitPercentage?: number) {
  if (typeof explicitPercentage === 'number' && Number.isFinite(explicitPercentage)) {
    return explicitPercentage
  }

  if (baseSalary <= 0 || deductionAmount <= 0) {
    return 0
  }

  return (deductionAmount / baseSalary) * 100
}

function getOptionalMetric(value?: number | null) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : missingMetricValue
}

function getOptionalCount(value?: number | null) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.round(value)) : missingMetricValue
}

function isFiniteMetric(value: number) {
  return Number.isFinite(value)
}

function areAmountsEquivalent(left: number, right: number) {
  return isFiniteMetric(left) && isFiniteMetric(right) && Math.abs(left - right) < 0.5
}

function resolveSalaryMetrics(snapshot?: SalaryEstimateSnapshot | null) {
  const baseSalary = getOptionalMetric(snapshot?.baseSalary)
  const deductionAmount = getOptionalMetric(snapshot?.deductionAmount)
  const bonusAmount = getOptionalMetric(snapshot?.bonusAmount)
  const snapshotAfterPenalty = getOptionalMetric(snapshot?.afterPenalty)
  const snapshotFinalSalary = getOptionalMetric(snapshot?.finalSalary)
  const snapshotEstimatedSalary = getOptionalMetric(snapshot?.estimatedSalary)

  const computedAfterPenalty =
    isFiniteMetric(baseSalary) && isFiniteMetric(deductionAmount)
      ? Math.max(0, baseSalary - deductionAmount)
      : missingMetricValue
  const afterPenalty =
    isFiniteMetric(computedAfterPenalty)
      ? computedAfterPenalty
      : snapshotAfterPenalty
  const computedFinalSalary =
    isFiniteMetric(afterPenalty) && isFiniteMetric(bonusAmount)
      ? Math.max(0, afterPenalty + bonusAmount)
      : missingMetricValue
  const finalSalary =
    isFiniteMetric(computedFinalSalary)
      ? computedFinalSalary
      : snapshotFinalSalary

  let estimatedSalary = snapshotEstimatedSalary

  if (!isFiniteMetric(estimatedSalary) && isFiniteMetric(finalSalary)) {
    estimatedSalary = finalSalary
  } else if (
    isFiniteMetric(snapshotEstimatedSalary) &&
    isFiniteMetric(snapshotFinalSalary) &&
    isFiniteMetric(finalSalary) &&
    areAmountsEquivalent(snapshotEstimatedSalary, snapshotFinalSalary) &&
    !areAmountsEquivalent(snapshotFinalSalary, finalSalary)
  ) {
    estimatedSalary = finalSalary
  }

  return {
    baseSalary,
    deductionAmount,
    bonusAmount,
    afterPenalty,
    finalSalary,
    estimatedSalary,
  }
}

function looksLikeEstimateEntry(value: UnknownRecord) {
  return [
    'user_id',
    'employee_id',
    'member_id',
    'base_salary',
    'salary_amount',
    'estimated_salary',
    'final_salary',
    'bonus_amount',
    'deduction_amount',
    'penalty_points',
  ].some((key) => key in value)
}

export function extractEstimateEntries(payload: unknown): UnknownRecord[] {
  const data = parseMaybeJson(payload)

  if (Array.isArray(data)) {
    return data.filter(isRecord)
  }

  if (!isRecord(data)) {
    return []
  }

  for (const key of [
    'employees',
    'members',
    'items',
    'results',
    'data',
    'salary_estimates',
    'salaryEstimates',
    'estimates',
    'rows',
  ]) {
    const candidate = data[key]

    if (Array.isArray(candidate)) {
      return candidate.filter(isRecord)
    }

    if (isRecord(candidate)) {
      const nestedItems = Object.values(candidate).filter(isRecord)

      if (nestedItems.length > 0) {
        return nestedItems
      }
    }
  }

  if (looksLikeEstimateEntry(data)) {
    return [data]
  }

  return Object.values(data).filter(isRecord).filter(looksLikeEstimateEntry)
}

export function normalizeEstimateEntry(entry: UnknownRecord): SalaryEstimateSnapshot {
  const parsedEntry = parseMaybeJson(entry)

  if (!isRecord(parsedEntry)) {
    return { userId: null }
  }

  const userRecord =
    findFirstRecord(parsedEntry, ['user', 'employee', 'member']) ??
    findFirstRecord(parsedEntry, ['member_data', 'user_data'])
  const salaryRecord = findFirstRecord(parsedEntry, ['salary', 'estimate', 'salary_estimate', 'summary'])
  const sources = [parsedEntry, userRecord, salaryRecord].filter(Boolean) as UnknownRecord[]

  const penalties =
    findFirstArray(parsedEntry, ['penalties', 'penalty_entries', 'deductions']) ??
    findFirstArray(salaryRecord ?? {}, ['penalties', 'penalty_entries', 'deductions']) ??
    []
  const bonuses =
    findFirstArray(parsedEntry, ['bonuses', 'bonus_entries']) ??
    findFirstArray(salaryRecord ?? {}, ['bonuses', 'bonus_entries']) ??
    []

  const userId =
    sources.map((source) => findFirstNumber(source, ['user_id', 'employee_id', 'member_id', 'id'])).find((value) => value !== undefined) ?? null
  const baseSalary =
    sources.map((source) => findFirstNumber(source, ['base_salary', 'default_salary', 'salary_amount', 'base'])).find((value) => value !== undefined)
  const deductionAmount =
    sources.map((source) => findFirstNumber(source, ['deduction_amount', 'deduction', 'total_deduction', 'penalty_amount'])).find((value) => value !== undefined) ??
    sumByKeys(penalties, ['deduction_amount', 'deduction', 'amount', 'penalty_amount'])
  const bonusAmount =
    sources.map((source) => findFirstNumber(source, ['bonus_amount', 'total_bonus', 'bonus'])).find((value) => value !== undefined) ??
    sumByKeys(bonuses, ['bonus_amount', 'amount', 'bonus'])
  const penaltyPoints =
    sources.map((source) => findFirstNumber(source, ['penalty_points', 'points', 'total_penalty_points'])).find((value) => value !== undefined) ??
    sumByKeys(penalties, ['penalty_points', 'points', 'value'])
  const penaltyEntries =
    sources.map((source) => findFirstNumber(source, ['penalty_entries', 'penalties_count', 'penalty_count'])).find((value) => value !== undefined) ??
    penalties.length
  const bonusEntries =
    sources.map((source) => findFirstNumber(source, ['bonus_entries', 'bonuses_count', 'bonus_count'])).find((value) => value !== undefined) ??
    bonuses.length
  const penaltyPercentage =
    sources.map((source) => findFirstNumber(source, ['penalty_percentage', 'deduction_percentage'])).find((value) => value !== undefined)
  const afterPenalty =
    sources.map((source) => findFirstNumber(source, ['after_penalty', 'salary_after_penalty'])).find((value) => value !== undefined)
  const finalSalary =
    sources.map((source) => findFirstNumber(source, ['final_salary', 'final_amount', 'payable_salary'])).find((value) => value !== undefined)
  const estimatedSalary =
    sources.map((source) => findFirstNumber(source, ['estimated_salary', 'salary_estimate', 'salary_amount'])).find((value) => value !== undefined)
  const userName = resolveRecordDisplayName(...sources)
  const roleLabel =
    sources.map((source) => findFirstString(source, ['job_title', 'role_name', 'role'])).find(Boolean)
  const userLabel =
    typeof userId === 'number' && Number.isFinite(userId) ? `User #${userId}` : undefined

  return {
    userId,
    userLabel,
    userName,
    roleLabel,
    baseSalary,
    estimatedSalary,
    penaltyPoints,
    penaltyEntries,
    penaltyPercentage,
    deductionAmount,
    afterPenalty,
    bonusEntries,
    bonusAmount,
    finalSalary,
  }
}

export function isEmployeeUser(user: CeoUserRecord) {
  const roleLabel = String(user.role ?? '').toLowerCase()
  return Boolean(user.is_active) && roleLabel !== 'customer'
}

export function buildReportFromUser(user: CeoUserRecord, snapshot?: SalaryEstimateSnapshot | null): EmployeeSalaryReport {
  const {
    baseSalary,
    deductionAmount,
    bonusAmount,
    afterPenalty,
    finalSalary,
    estimatedSalary,
  } = resolveSalaryMetrics(snapshot)
  const penaltyPoints = getOptionalCount(snapshot?.penaltyPoints)
  const penaltyEntries = getOptionalCount(snapshot?.penaltyEntries)
  const bonusEntries = getOptionalCount(snapshot?.bonusEntries)
  const penaltyPercentage = getOptionalMetric(normalizePercentageValue(snapshot?.penaltyPercentage))

  return {
    id: user.id,
    label: snapshot?.userLabel ?? `User #${user.id}`,
    fullName: getUserFullName(user, snapshot),
    roleLabel: normalizeRoleLabel(user, snapshot),
    baseSalary,
    estimatedSalary,
    deductionAmount,
    bonusAmount,
    afterPenalty,
    finalSalary,
    penaltyPoints,
    penaltyEntries,
    bonusEntries,
    penaltyPercentage,
    hasPenalty:
      (Number.isFinite(deductionAmount) && deductionAmount > 0) ||
      (Number.isFinite(penaltyPoints) && penaltyPoints > 0) ||
      (Number.isFinite(penaltyEntries) && penaltyEntries > 0) ||
      (Number.isFinite(penaltyPercentage) && penaltyPercentage > 0),
    hasBonus:
      (Number.isFinite(bonusAmount) && bonusAmount > 0) ||
      (Number.isFinite(bonusEntries) && bonusEntries > 0),
  }
}

export function createVirtualUser(snapshot: SalaryEstimateSnapshot): CeoUserRecord {
  const fullName =
    (snapshot.userName?.trim() && !isUnknownName(snapshot.userName)
      ? snapshot.userName.trim()
      : undefined) ??
    snapshot.userLabel?.trim() ??
    (typeof snapshot.userId === 'number' && snapshot.userId > 0
      ? `Member #${snapshot.userId}`
      : 'Unknown member')
  const parts = fullName.split(/\s+/)
  const name = parts.shift() ?? 'Unknown'

  return {
    id: snapshot.userId ?? 0,
    email: '',
    name,
    surname: parts.join(' '),
    company_code: '',
    telegram_id: null,
    default_salary: snapshot.baseSalary ?? 0,
    role: snapshot.roleLabel ?? 'Member',
    job_title: snapshot.roleLabel ?? null,
    is_active: true,
  }
}

export function buildEmployeeReports(
  users: CeoUserRecord[],
  payload: unknown,
  options?: {
    includeFallbackUsers?: boolean
  },
) {
  const snapshots = extractEstimateEntries(payload).map(normalizeEstimateEntry)
  const includeFallbackUsers = options?.includeFallbackUsers ?? snapshots.length === 0
  const snapshotsById = new Map<number, SalaryEstimateSnapshot>()
  const snapshotsByName = new Map<string, SalaryEstimateSnapshot>()
  const matchedSnapshotKeys = new Set<string>()
  const usersById = new Map<number, CeoUserRecord>()
  const usersByName = new Map<string, CeoUserRecord>()

  for (const snapshot of snapshots) {
    if (typeof snapshot.userId === 'number' && snapshot.userId > 0) {
      snapshotsById.set(snapshot.userId, snapshot)
    }

    if (snapshot.userName?.trim()) {
      snapshotsByName.set(snapshot.userName.trim().toLowerCase(), snapshot)
    }
  }

  for (const user of users) {
    usersById.set(user.id, user)
    usersByName.set(`${user.name} ${user.surname}`.trim().toLowerCase(), user)
  }

  if (!includeFallbackUsers) {
    return snapshots
      .map((snapshot) => {
        const matchedUser =
          (typeof snapshot.userId === 'number' && snapshot.userId > 0
            ? usersById.get(snapshot.userId)
            : undefined) ??
          (snapshot.userName?.trim()
            ? usersByName.get(snapshot.userName.trim().toLowerCase())
            : undefined) ??
          null

        return buildReportFromUser(matchedUser ?? createVirtualUser(snapshot), snapshot)
      })
      .sort((left, right) => left.fullName.localeCompare(right.fullName))
  }

  const reports = users
    .map((user) => {
      const fullName = `${user.name} ${user.surname}`.trim().toLowerCase()
      const snapshot = snapshotsById.get(user.id) ?? snapshotsByName.get(fullName) ?? null

      if (snapshot) {
        matchedSnapshotKeys.add(`${snapshot.userId ?? 0}:${snapshot.userName ?? ''}`)
      }

      return buildReportFromUser(user, snapshot)
    })
    .sort((left, right) => left.fullName.localeCompare(right.fullName))

  const extraReports = snapshots
    .filter((snapshot) => !matchedSnapshotKeys.has(`${snapshot.userId ?? 0}:${snapshot.userName ?? ''}`))
    .map((snapshot) => buildReportFromUser(createVirtualUser(snapshot), snapshot))

  return [...reports, ...extraReports].sort((left, right) => left.fullName.localeCompare(right.fullName))
}

export function mergeReportWithSnapshot(
  report: EmployeeSalaryReport,
  user: CeoUserRecord | null,
  snapshot?: SalaryEstimateSnapshot | null,
) {
  const resolvedSalaryMetrics = snapshot ? resolveSalaryMetrics(snapshot) : null
  const baseSalary = resolvedSalaryMetrics?.baseSalary ?? report.baseSalary
  const deductionAmount = resolvedSalaryMetrics?.deductionAmount ?? report.deductionAmount
  const bonusAmount = resolvedSalaryMetrics?.bonusAmount ?? report.bonusAmount
  const penaltyPoints = snapshot ? getOptionalCount(snapshot.penaltyPoints) : report.penaltyPoints
  const penaltyEntries = snapshot ? getOptionalCount(snapshot.penaltyEntries) : report.penaltyEntries
  const bonusEntries = snapshot ? getOptionalCount(snapshot.bonusEntries) : report.bonusEntries
  const penaltyPercentage = snapshot
    ? getOptionalMetric(normalizePercentageValue(snapshot.penaltyPercentage))
    : report.penaltyPercentage
  const afterPenalty = resolvedSalaryMetrics?.afterPenalty ?? report.afterPenalty
  const finalSalary = resolvedSalaryMetrics?.finalSalary ?? report.finalSalary
  const estimatedSalary = resolvedSalaryMetrics?.estimatedSalary ?? report.estimatedSalary

  return {
    ...report,
    label: snapshot?.userLabel ?? report.label,
    fullName: getUserFullName(user, snapshot) || report.fullName,
    roleLabel: normalizeRoleLabel(user, snapshot) || report.roleLabel,
    baseSalary,
    estimatedSalary,
    deductionAmount,
    bonusAmount,
    afterPenalty,
    finalSalary,
    penaltyPoints,
    penaltyEntries,
    bonusEntries,
    penaltyPercentage,
    hasPenalty:
      (Number.isFinite(deductionAmount) && deductionAmount > 0) ||
      (Number.isFinite(penaltyPoints) && penaltyPoints > 0) ||
      (Number.isFinite(penaltyEntries) && penaltyEntries > 0) ||
      (Number.isFinite(penaltyPercentage) && penaltyPercentage > 0),
    hasBonus:
      (Number.isFinite(bonusAmount) && bonusAmount > 0) ||
      (Number.isFinite(bonusEntries) && bonusEntries > 0),
  } satisfies EmployeeSalaryReport
}

export function getPrimaryEstimateRecord(payload: unknown) {
  const parsedPayload = parseMaybeJson(payload)
  const entries = extractEstimateEntries(parsedPayload)

  if (entries.length > 0) {
    return entries[0]
  }

  return isRecord(parsedPayload) ? parsedPayload : null
}

export function getEstimateRecordForMember(
  payload: unknown,
  memberId?: number | null,
  memberName?: string | null,
) {
  const parsedPayload = parseMaybeJson(payload)
  const entries = extractEstimateEntries(parsedPayload)

  if (entries.length === 0) {
    return isRecord(parsedPayload) ? parsedPayload : null
  }

  if (typeof memberId === 'number' && Number.isFinite(memberId) && memberId > 0) {
    const matchedById = entries.find((entry) => normalizeEstimateEntry(entry).userId === memberId)

    if (matchedById) {
      return matchedById
    }
  }

  const normalizedMemberName = memberName?.trim().toLowerCase()

  if (normalizedMemberName) {
    const matchedByName = entries.find((entry) => normalizeEstimateEntry(entry).userName?.trim().toLowerCase() === normalizedMemberName)

    if (matchedByName) {
      return matchedByName
    }
  }

  return entries[0]
}

export function buildSalaryLedgerItems(
  payload: unknown,
  kind: 'penalty' | 'bonus',
  report: EmployeeSalaryReport,
) {
  const root = getEstimateRecordForMember(payload, report.id, report.fullName)

  if (!root) {
    return []
  }

  const nestedSummary = findFirstRecord(root, ['salary', 'estimate', 'salary_estimate', 'summary'])
  const candidateItems =
    findFirstArray(root, kind === 'penalty' ? ['penalties', 'penalty_entries', 'deductions'] : ['bonuses', 'bonus_entries']) ??
    findFirstArray(nestedSummary ?? {}, kind === 'penalty' ? ['penalties', 'penalty_entries', 'deductions'] : ['bonuses', 'bonus_entries']) ??
    []

  const items = candidateItems
    .filter(isRecord)
    .map((item, index) => {
      const title =
        findFirstString(item, ['reason', 'title', 'label', 'name', 'note', 'description']) ??
        `${kind === 'penalty' ? 'Penalty' : 'Bonus'} #${index + 1}`
      const description = findFirstString(item, ['description', 'note', 'remarks', 'comment'])
      const amount = Math.max(
        0,
        findFirstNumber(
          item,
          kind === 'penalty'
            ? ['deduction_amount', 'deduction', 'amount', 'penalty_amount', 'value']
            : ['bonus_amount', 'amount', 'bonus', 'value'],
        ) ?? 0,
      )
      const points =
        kind === 'penalty'
          ? Math.max(0, findFirstNumber(item, ['penalty_points', 'points', 'score', 'value']) ?? 0)
          : undefined
      const percentage = normalizePercentageValue(findFirstNumber(item, ['penalty_percentage', 'deduction_percentage', 'percentage', 'percent']))
      const createdAt = findFirstString(item, ['created_at', 'date', 'added_at', 'issued_at', 'updated_at'])

      return {
        id: `${kind}-${index}-${title}`,
        title,
        description: description && description !== title ? description : undefined,
        amount,
        points: points && points > 0 ? points : undefined,
        percentage,
        createdAt,
      } satisfies SalaryLedgerItem
    })
    .filter((item) => item.amount > 0 || (item.points ?? 0) > 0)

  return items
}

function getPrimaryUpdateRecord(payload: unknown) {
  const parsedPayload = parseMaybeJson(payload)

  if (Array.isArray(parsedPayload)) {
    return parsedPayload.find(isRecord) ?? null
  }

  if (!isRecord(parsedPayload)) {
    return null
  }

  for (const key of ['employees', 'members', 'items', 'results', 'data', 'statistics', 'rows', 'updates']) {
    const candidate = parsedPayload[key]

    if (Array.isArray(candidate)) {
      const firstRecord = candidate.find(isRecord)

      if (firstRecord) {
        return firstRecord
      }
    }

    if (isRecord(candidate)) {
      return candidate
    }
  }

  const nestedRecords = Object.values(parsedPayload).filter(isRecord)

  return nestedRecords[0] ?? parsedPayload
}

function getMonthlyDayFallbackStatus(date: Date): DayStatus {
  if (date.getDay() === 0) {
    return 'sunday'
  }

  if (date > todayStart) {
    return 'future'
  }

  if (date < todayStart) {
    return 'missing'
  }

  return 'neutral'
}

function normalizeMonthlyDayStatus(
  value: unknown,
  date: Date,
  options?: { isDayOff?: boolean | null },
): DayStatus {
  if (date.getDay() === 0 || options?.isDayOff) {
    return 'sunday'
  }

  const fallback = getMonthlyDayFallbackStatus(date)
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

    return normalizeMonthlyDayStatus(
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

function extractArrayFromRecord(source: UnknownRecord, keys: readonly string[]) {
  for (const key of keys) {
    const value = source[key]

    if (Array.isArray(value)) {
      return value
    }
  }

  return []
}

function objectDateEntriesToArray(source: UnknownRecord) {
  return Object.entries(source)
    .filter(([key]) => isDateKey(key) || /^\d{1,2}$/.test(key))
    .map(([key, value]) => (
      isDateKey(key)
        ? { date: key, status: value }
        : { day: Number(key), status: value }
    ))
}

function extractMonthlyDayEntries(payload: unknown): UnknownRecord[] {
  const parsedPayload = parseMaybeJson(payload)

  if (!isRecord(parsedPayload)) {
    return []
  }

  const directEntries = extractArrayFromRecord(parsedPayload, monthlyDayCollectionKeys)

  if (directEntries.length > 0) {
    return directEntries.filter(isRecord)
  }

  for (const key of ['data', 'summary', 'statistics', 'calendar', 'monthly_summary']) {
    const nestedRecord = parsedPayload[key]

    if (!isRecord(nestedRecord)) {
      continue
    }

    const nestedEntries = extractArrayFromRecord(nestedRecord, monthlyDayCollectionKeys)

    if (nestedEntries.length > 0) {
      return nestedEntries.filter(isRecord)
    }

    const keyedEntries = objectDateEntriesToArray(nestedRecord)

    if (keyedEntries.length > 0) {
      return keyedEntries.filter(isRecord)
    }
  }

  return objectDateEntriesToArray(parsedPayload).filter(isRecord)
}

function extractMonthlyUpdateItems(payload: unknown): UnknownRecord[] {
  const parsedPayload = parseMaybeJson(payload)

  if (Array.isArray(parsedPayload)) {
    return parsedPayload.filter(isRecord)
  }

  if (!isRecord(parsedPayload)) {
    return []
  }

  const directEntries = extractArrayFromRecord(parsedPayload, monthlyUpdateCollectionKeys)

  if (directEntries.length > 0) {
    return directEntries.filter(isRecord)
  }

  if (Array.isArray(parsedPayload.data)) {
    return parsedPayload.data.filter(isRecord)
  }

  for (const key of ['data', 'summary', 'statistics', 'employee', 'member']) {
    const nestedRecord = parsedPayload[key]

    if (!isRecord(nestedRecord)) {
      continue
    }

    const nestedEntries = extractArrayFromRecord(nestedRecord, monthlyUpdateCollectionKeys)

    if (nestedEntries.length > 0) {
      return nestedEntries.filter(isRecord)
    }
  }

  return []
}

function extractUpdateEntryText(source: UnknownRecord) {
  const directText = findFirstString(source, [...updateTextKeys])

  if (directText) {
    return directText
  }

  const fallbackEntry = Object.entries(source).find(([key, value]) => (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    !updateDateKeys.includes(key as (typeof updateDateKeys)[number]) &&
    !isValidDateString(value)
  ))

  return typeof fallbackEntry?.[1] === 'string' ? fallbackEntry[1].trim() : undefined
}

function parseMonthlyUpdateEntry(
  source: UnknownRecord,
  index: number,
  month: number,
  year: number,
): MemberMonthlyUpdateEntry | null {
  const dateValue = findFirstString(source, [...updateDateKeys])

  if (!dateValue) {
    return null
  }

  const parsedDate = parseDateValue(dateValue)

  if (Number.isNaN(parsedDate.getTime())) {
    return null
  }

  if (parsedDate.getFullYear() !== year || parsedDate.getMonth() + 1 !== month) {
    return null
  }

  const dateKey = formatDateKey(parsedDate)
  const rawId = source.id ?? source.update_id ?? source.uuid
  const title = findFirstString(source, [...updateTitleKeys])
  const text = extractUpdateEntryText(source)

  return {
    id:
      typeof rawId === 'number' || typeof rawId === 'string'
        ? String(rawId)
        : `${dateKey}-${index}`,
    date: dateKey,
    createdAt: dateValue,
    title,
    text,
  }
}

function parseMonthlyDaySeed(
  source: UnknownRecord,
  month: number,
  year: number,
) {
  const dateValue = findFirstString(source, ['date', 'full_date', 'calendar_date', 'day_date'])
  const numericDay = toNumber(source.day ?? source.day_of_month ?? source.day_number)
  const date = dateValue
    ? parseDateValue(dateValue)
    : numericDay
      ? new Date(year, month - 1, numericDay)
      : null

  if (!date || Number.isNaN(date.getTime())) {
    return null
  }

  if (date.getFullYear() !== year || date.getMonth() + 1 !== month) {
    return null
  }

  const workdayOverride = extractWorkdayOverride(source)
  const isDayOff = toBoolean(source.is_day_off ?? source.day_off) ?? isWorkdayOverrideOffDay(workdayOverride)
  const explicitHasUpdate = toBoolean(source.has_update ?? source.has_updates ?? source.is_submitted ?? source.submitted)
  const updatesCount = toNumber(source.updates_count ?? source.count ?? source.total_updates ?? source.submitted_count)
  const note = extractUpdateEntryText(source) ?? null
  const normalizedStatus = normalizeMonthlyDayStatus(
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
    { isDayOff },
  )
  const hasUpdate = explicitHasUpdate === true || (updatesCount !== null && updatesCount > 0)

  return {
    day: date.getDate(),
    date: formatDateKey(date),
    status: hasUpdate && normalizedStatus !== 'sunday' ? 'submitted' as const : normalizedStatus,
    isDayOff,
    hasUpdate,
    updatesCount: updatesCount ?? (hasUpdate ? 1 : 0),
    note,
    isValid: toBoolean(source.is_valid ?? source.valid),
    workdayOverride,
  }
}

export function buildMemberMonthlyUpdateCalendar(
  payload: unknown,
  month: number,
  year: number,
  includeFallback = false,
): MemberMonthlyUpdateCalendar | null {
  const daySeeds = extractMonthlyDayEntries(payload)
    .map((entry) => parseMonthlyDaySeed(entry, month, year))
    .filter((entry): entry is NonNullable<ReturnType<typeof parseMonthlyDaySeed>> => Boolean(entry))
  const daySeedMap = new Map(daySeeds.map((entry) => [entry.day, entry]))

  const updatesByDate = new Map<string, MemberMonthlyUpdateEntry[]>()

  extractMonthlyUpdateItems(payload)
    .map((entry, index) => parseMonthlyUpdateEntry(entry, index, month, year))
    .filter((entry): entry is MemberMonthlyUpdateEntry => Boolean(entry))
    .forEach((entry) => {
      const bucket = updatesByDate.get(entry.date)

      if (bucket) {
        bucket.push(entry)
        return
      }

      updatesByDate.set(entry.date, [entry])
    })

  if (!includeFallback && daySeedMap.size === 0 && updatesByDate.size === 0) {
    return null
  }

  const daysInMonth = new Date(year, month, 0).getDate()
  const days = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1
    const currentDate = new Date(year, month - 1, day)
    const dateKey = formatDateKey(currentDate)
    const daySeed = daySeedMap.get(day)
    const entries = updatesByDate.get(dateKey) ?? []
    const hasUpdate = daySeed?.hasUpdate === true || entries.length > 0
    const resolvedStatus = daySeed?.status ?? getMonthlyDayFallbackStatus(currentDate)
    const status = hasUpdate && resolvedStatus !== 'sunday' ? 'submitted' : resolvedStatus
    const updatesCount = Math.max(daySeed?.updatesCount ?? 0, entries.length)

    return {
      day,
      date: dateKey,
      status,
      weekdayShort: new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(currentDate),
      weekdayLabel: new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(currentDate),
      isToday: dateKey === formatDateKey(todayStart),
      isFuture: currentDate > todayStart,
      isWeekend: currentDate.getDay() === 0,
      isDayOff: daySeed?.isDayOff ?? null,
      hasUpdate,
      updatesCount,
      entries,
      note: daySeed?.note ?? entries[0]?.text ?? null,
      isValid: daySeed?.isValid ?? null,
      workdayOverride: daySeed?.workdayOverride ?? null,
    } satisfies MemberMonthlyUpdateDay
  })

  return {
    month,
    year,
    days,
    submittedCount: days.filter((day) => day.status === 'submitted').length,
    missingCount: days.filter((day) => day.status === 'missing').length,
    sundayCount: days.filter((day) => day.status === 'sunday').length,
    futureCount: days.filter((day) => day.status === 'future').length,
    totalUpdates: days.reduce((total, day) => total + day.updatesCount, 0),
  }
}

export function parseMemberUpdateSummary(
  payload: unknown,
  calendar?: MemberMonthlyUpdateCalendar | null,
): MemberUpdateSummary | null {
  const primaryRecord = getPrimaryUpdateRecord(payload)

  if (!primaryRecord && !calendar) {
    return null
  }

  const nestedSummary = primaryRecord
    ? findFirstRecord(primaryRecord, ['summary', 'statistics', 'update_stats', 'monthly_stats', 'salary_update'])
    : null
  const sources = [primaryRecord, nestedSummary].filter(Boolean) as UnknownRecord[]

  const submittedCount =
    sources.map((source) => findFirstNumber(source, ['submitted_count', 'updates_count', 'total_submitted', 'logged_count', 'submitted'])).find((value) => value !== undefined)
  const missingCount =
    sources.map((source) => findFirstNumber(source, ['missing_count', 'total_missing', 'missing_days', 'missed_count', 'absent_count', 'missing'])).find((value) => value !== undefined)
  const totalUpdates =
    sources.map((source) => findFirstNumber(source, ['total_updates', 'updates_count', 'submitted_count', 'updates_this_month'])).find((value) => value !== undefined)
  const completionPercentage =
    normalizePercentageValue(
      sources.map((source) => findFirstNumber(source, ['completion_percentage', 'completion_rate', 'percentage', 'percent', 'avg_percentage'])).find((value) => value !== undefined),
    )
  const updatePercentage = normalizePercentageValue(
    sources.map((source) => findFirstNumber(source, ['update_percentage', 'salary_update_percentage'])).find((value) => value !== undefined),
  )
  const salaryAmount = sources.map((source) => findFirstNumber(source, ['salary_amount', 'estimated_salary', 'final_salary', 'payable_salary'])).find((value) => value !== undefined)
  const nextPaymentDate = sources.map((source) => findFirstString(source, ['next_payment_date', 'payment_date'])).find(Boolean)
  const note = sources.map((source) => findFirstString(source, ['note', 'summary', 'description', 'remarks'])).find(Boolean)
  const lastUpdateDate = sources.map((source) => findFirstString(source, ['last_update_date', 'last_update', 'updated_at', 'submitted_at'])).find(Boolean)
  const isCurrentPeriod = calendar !== null && calendar !== undefined && calendar.month === defaultMonth && calendar.year === defaultYear
  const calendarSummary = calendar
    ? (() => {
        const activeCalendar = calendar
        const completedDays = activeCalendar.days.filter((day) => day.status === 'submitted' || day.status === 'missing')
        const lastSubmittedDay = [...activeCalendar.days]
          .reverse()
          .find((day) => day.status === 'submitted' || day.entries.length > 0 || day.hasUpdate)
        const latestEntryTimestamp = lastSubmittedDay?.entries
          ?.map((entry) => entry.createdAt)
          .filter((value): value is string => Boolean(value))
          .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0]

        return {
          submittedCount: activeCalendar.submittedCount,
          missingCount: activeCalendar.missingCount,
          totalUpdates: activeCalendar.totalUpdates,
          completionPercentage:
            completedDays.length > 0
              ? (activeCalendar.submittedCount / completedDays.length) * 100
              : 0,
          lastUpdateDate: latestEntryTimestamp ?? lastSubmittedDay?.date,
        }
      })()
    : null
  const shouldUseCalendarSummary =
    Boolean(calendarSummary) && (
      isCurrentPeriod ||
      submittedCount === undefined ||
      missingCount === undefined ||
      totalUpdates === undefined ||
      completionPercentage === undefined
    )

  if (
    submittedCount === undefined &&
    missingCount === undefined &&
    totalUpdates === undefined &&
    completionPercentage === undefined &&
    updatePercentage === undefined &&
    salaryAmount === undefined &&
    !nextPaymentDate &&
    !note &&
    !lastUpdateDate &&
    !calendarSummary
  ) {
    return null
  }

  return {
    totalUpdates: shouldUseCalendarSummary ? calendarSummary!.totalUpdates : totalUpdates ?? missingMetricValue,
    submittedCount: shouldUseCalendarSummary ? calendarSummary!.submittedCount : submittedCount ?? missingMetricValue,
    missingCount: shouldUseCalendarSummary ? calendarSummary!.missingCount : missingCount ?? missingMetricValue,
    completionPercentage: shouldUseCalendarSummary ? calendarSummary!.completionPercentage : completionPercentage ?? missingMetricValue,
    updatePercentage: updatePercentage ?? (shouldUseCalendarSummary ? calendarSummary!.completionPercentage : undefined),
    salaryAmount,
    nextPaymentDate,
    note,
    lastUpdateDate: lastUpdateDate ?? calendarSummary?.lastUpdateDate,
  }
}

export function buildEmployeeSalaryDetail({
  report,
  user,
  estimatePayload,
  updatesPayload,
  calendarPayload,
  estimateError,
  updatesError,
  calendarError,
  year,
  month,
}: {
  report: EmployeeSalaryReport
  user: CeoUserRecord | null
  estimatePayload: unknown
  updatesPayload: unknown
  calendarPayload: unknown
  estimateError?: string | null
  updatesError?: string | null
  calendarError?: string | null
  year: number
  month: number
}): EmployeeSalaryDetail {
  const estimateRecord = getEstimateRecordForMember(estimatePayload, report.id, report.fullName)
  const snapshot = estimateRecord ? normalizeEstimateEntry(estimateRecord) : null
  const mergedReport = mergeReportWithSnapshot(report, user, snapshot)
  const updateCalendar = calendarError
    ? null
    : buildMemberMonthlyUpdateCalendar(calendarPayload, month, year, true)

  return {
    memberId: mergedReport.id,
    year,
    month,
    report: mergedReport,
    penalties: buildSalaryLedgerItems(estimatePayload, 'penalty', mergedReport),
    bonuses: buildSalaryLedgerItems(estimatePayload, 'bonus', mergedReport),
    updatesSummary: parseMemberUpdateSummary(updatesPayload, updateCalendar),
    updateCalendar,
    estimateSource: estimateRecord ? 'live' : 'fallback',
    estimateError,
    updatesError,
    calendarError,
  }
}

export function getSuccessMessage(payload: unknown, fallback: string) {
  const data = parseMaybeJson(payload)

  if (typeof data === 'string' && data.trim()) {
    return data
  }

  if (isRecord(data)) {
    return findFirstString(data, ['message', 'detail', 'status']) ?? fallback
  }

  return fallback
}
