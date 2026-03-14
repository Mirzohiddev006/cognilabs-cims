import { useMemo, useState, type KeyboardEvent, type ReactNode } from 'react'
import { updateTrackingService } from '../../../shared/api/services/updateTracking.service'
import type { DayStatus } from '../../../shared/api/types'
import { useAsyncData } from '../../../shared/hooks/useAsyncData'
import { cn } from '../../../shared/lib/cn'
import { useToast } from '../../../shared/toast/useToast'
import { Badge } from '../../../shared/ui/badge'
import { Button } from '../../../shared/ui/button'
import { Card } from '../../../shared/ui/card'
import { Input } from '../../../shared/ui/input'
import { SectionTitle } from '../../../shared/ui/section-title'
import { ErrorStateBlock, LoadingStateBlock } from '../../../shared/ui/state-block'

const now = new Date()
const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const calendarCollectionKeys = ['calendar', 'days', 'entries', 'items', 'data', 'results']
const recentCollectionKeys = ['updates', 'items', 'results', 'data', 'recent', 'recent_updates', 'entries', 'rows']
const trendCollectionKeys = ['trends', 'months', 'items', 'data', 'results']
const recentTextKeys = ['update_content', 'update_text', 'message', 'text', 'summary', 'description', 'content', 'body', 'note', 'comment', 'remarks', 'title']
const recentDateKeys = ['update_date', 'date', 'created_at', 'submitted_at', 'updated_at', 'timestamp']
const recentIgnoredTextKeys = new Set([
  'id',
  'user_id',
  'user_name',
  'telegram_username',
  'email',
  'status',
  'role',
  'month_name',
])

type UnknownRecord = Record<string, unknown>

type CalendarDay = {
  day: number
  date?: string
  status: DayStatus
  updates_count?: number | null
  weekday?: string
  hasUpdate?: boolean | null
  updateContent?: string | null
  isValid?: boolean | null
}

type CalendarData = {
  month: number
  year: number
  days: CalendarDay[]
}

type RecentUpdate = {
  id?: number | string
  update_date?: string
  date?: string
  message?: string
  text?: string
  update_text?: string
  [key: string]: unknown
}

type TrendMonth = {
  month: number
  year: number
  month_name?: string
  submitted_count?: number
  missing_count?: number
  completion_percentage?: number
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

function isDateKey(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function isValidDateString(value: string) {
  return !Number.isNaN(new Date(value).getTime())
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

function findFirstString(source: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    if (typeof source[key] === 'string' && source[key].trim()) {
      return source[key] as string
    }
  }

  return undefined
}

function getFirstArray(source: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    if (Array.isArray(source[key])) {
      return source[key] as unknown[]
    }
  }

  const fallback = Object.values(source).find((value) => Array.isArray(value))
  return Array.isArray(fallback) ? fallback : []
}

function getMonthName(month: number): string {
  return new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date(2024, month - 1))
}

function monthNameToNumber(value: string): number | null {
  const normalized = value.trim().toLowerCase()

  if (!normalized) {
    return null
  }

  const months = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december',
  ]
  const shortMonths = months.map((monthName) => monthName.slice(0, 3))
  const combined = [...months, ...shortMonths]
  const index = combined.findIndex((monthName) => normalized.startsWith(monthName))

  if (index >= 0) {
    return (index % 12) + 1
  }

  return null
}

const ALL_MONTHS = Array.from({ length: 12 }, (_, index) => ({
  value: index + 1,
  label: getMonthName(index + 1),
}))

function getFallbackDayStatus(date: Date): DayStatus {
  if (date > todayStart) {
    return 'future'
  }

  if (date.getDay() === 0) {
    return 'sunday'
  }

  if (date < todayStart) {
    return 'missing'
  }

  return 'neutral'
}

function normalizeDayStatus(value: unknown, date: Date): DayStatus {
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

    return fallback
  }

  if (isRecord(value)) {
    const sundayValue = toBoolean(value.is_sunday ?? value.sunday)
    if (sundayValue) {
      return 'sunday'
    }

    const workingDayValue = toBoolean(value.is_working_day ?? value.working_day)
    if (workingDayValue === false) {
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
    )
  }

  return fallback
}

function extractCalendarEntries(payload: unknown) {
  const parsed = parsePayload(payload)

  if (Array.isArray(parsed)) {
    return {
      entries: parsed,
      month: undefined as number | undefined,
      year: undefined as number | undefined,
    }
  }

  if (!isRecord(parsed)) {
    return {
      entries: [] as unknown[],
      month: undefined as number | undefined,
      year: undefined as number | undefined,
    }
  }

  const month = toNumber(parsed.month) ?? undefined
  const year = toNumber(parsed.year) ?? undefined
  const entries = getFirstArray(parsed, calendarCollectionKeys)

  if (entries.length > 0) {
    return { entries, month, year }
  }

  return {
    entries: Object.entries(parsed)
      .filter(([key]) => isDateKey(key) || /^\d{1,2}$/.test(key))
      .map(([key, value]) => (isDateKey(key) ? { date: key, status: value } : { day: Number(key), status: value })),
    month,
    year,
  }
}

function toCalendarDay(entry: unknown, selectedMonth: number, selectedYear: number): CalendarDay | null {
  if (!isRecord(entry)) {
    return null
  }

  const dateValue = findFirstString(entry, ['date', 'full_date', 'calendar_date', 'day_date'])
  const numericDay = toNumber(entry.day ?? entry.day_of_month ?? entry.day_number)
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

  const explicitHasUpdate = toBoolean(entry.has_update ?? entry.has_updates ?? entry.is_submitted ?? entry.submitted)
  const updateContent = findFirstString(entry, recentTextKeys) ?? null
  const updatesCount =
    toNumber(entry.updates_count ?? entry.count ?? entry.total_updates ?? entry.submitted_count) ??
    (explicitHasUpdate === true || Boolean(updateContent) ? 1 : null)
  const normalizedStatus = normalizeDayStatus(
    entry.status ??
      entry.day_status ??
      entry.submission_status ??
      entry.type ??
      entry.is_submitted ??
      entry.submitted ??
      entry.is_missing ??
      entry.missing ??
      entry.is_sunday ??
      entry.sunday ??
      entry.value,
    date,
  )
  const hasUpdate = explicitHasUpdate === true || (updatesCount !== null && updatesCount > 0) || Boolean(updateContent)
  const status = hasUpdate && normalizedStatus !== 'sunday' ? 'submitted' : normalizedStatus

  return {
    day: date.getDate(),
    date: formatDateKey(date),
    status,
    updates_count: updatesCount,
    weekday: findFirstString(entry, ['weekday', 'weekday_name', 'day_name']),
    hasUpdate: explicitHasUpdate ?? hasUpdate,
    updateContent,
    isValid: toBoolean(entry.is_valid ?? entry.valid),
  }
}

function parseCalendar(data: unknown, selectedMonth: number, selectedYear: number): CalendarData | null {
  const { entries, month, year } = extractCalendarEntries(data)
  const resolvedMonth = month ?? selectedMonth
  const resolvedYear = year ?? selectedYear
  const daysInMonth = new Date(resolvedYear, resolvedMonth, 0).getDate()

  if (entries.length === 0) {
    return null
  }

  const entryMap = new Map(
    entries
      .map((entry) => toCalendarDay(entry, resolvedMonth, resolvedYear))
      .filter((entry): entry is CalendarDay => Boolean(entry))
      .map((entry) => [entry.day, entry]),
  )

  if (entryMap.size === 0) {
    return null
  }

  const days = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1
    const currentDate = new Date(resolvedYear, resolvedMonth - 1, day)

    return entryMap.get(day) ?? {
      day,
      date: formatDateKey(currentDate),
      status: getFallbackDayStatus(currentDate),
      updates_count: null,
      weekday: undefined,
      hasUpdate: null,
      updateContent: null,
      isValid: null,
    }
  })

  return {
    month: resolvedMonth,
    year: resolvedYear,
    days,
  }
}

function extractRecentDate(source: UnknownRecord) {
  const directDate = findFirstString(source, recentDateKeys)

  if (directDate && isValidDateString(directDate)) {
    return directDate
  }

  const fallbackDate = Object.values(source).find(
    (value): value is string => typeof value === 'string' && isValidDateString(value),
  )

  return fallbackDate
}

function extractRecentText(source: UnknownRecord) {
  const directText = findFirstString(source, recentTextKeys)

  if (directText) {
    return directText
  }

  const fallbackText = Object.entries(source).find(
    ([key, value]) =>
      typeof value === 'string' &&
      value.trim().length > 0 &&
      !recentIgnoredTextKeys.has(key) &&
      !recentDateKeys.includes(key) &&
      !isValidDateString(value),
  )

  return typeof fallbackText?.[1] === 'string' ? fallbackText[1] : ''
}

function normalizeRecentUpdate(source: UnknownRecord, index: number): RecentUpdate {
  return {
    ...source,
    id:
      (typeof source.id === 'number' || typeof source.id === 'string' ? source.id : undefined) ??
      (typeof source.update_id === 'number' || typeof source.update_id === 'string' ? source.update_id : undefined) ??
      (typeof source.uuid === 'string' ? source.uuid : undefined) ??
      index,
    update_date: extractRecentDate(source),
    update_text: extractRecentText(source),
  }
}

function parseRecent(data: unknown): RecentUpdate[] {
  const parsed = parsePayload(data)

  if (Array.isArray(parsed)) {
    return parsed.filter(isRecord).map(normalizeRecentUpdate)
  }

  if (isRecord(parsed)) {
    return getFirstArray(parsed, recentCollectionKeys).filter(isRecord).map(normalizeRecentUpdate)
  }

  return []
}

function normalizeTrend(entry: unknown): TrendMonth | null {
  if (!isRecord(entry)) {
    return null
  }

  const month =
    toNumber(entry.month ?? entry.month_number ?? entry.month_index) ??
    (typeof entry.month_name === 'string' ? monthNameToNumber(entry.month_name) : null)
  const year = toNumber(entry.year ?? entry.trend_year) ?? now.getFullYear()
  const submittedCount = toNumber(entry.submitted_count ?? entry.submitted ?? entry.total_submitted ?? entry.updates_count)
  const missingCount = toNumber(entry.missing_count ?? entry.missing ?? entry.total_missing)
  const rawCompletion =
    toNumber(entry.completion_percentage ?? entry.completion_rate ?? entry.percentage ?? entry.percent ?? entry.avg_percentage)
  const completion =
    rawCompletion !== null
      ? rawCompletion <= 1 ? rawCompletion * 100 : rawCompletion
      : submittedCount !== null && missingCount !== null && submittedCount + missingCount > 0
        ? (submittedCount / (submittedCount + missingCount)) * 100
        : 0

  if (!month || month < 1 || month > 12) {
    return null
  }

  return {
    month,
    year,
    month_name: typeof entry.month_name === 'string' ? entry.month_name : undefined,
    submitted_count: submittedCount ?? undefined,
    missing_count: missingCount ?? undefined,
    completion_percentage: completion,
  }
}

function parseTrends(data: unknown): TrendMonth[] {
  const parsed = parsePayload(data)
  const entries = Array.isArray(parsed)
    ? parsed
    : isRecord(parsed)
      ? getFirstArray(parsed, trendCollectionKeys)
      : []

  return entries
    .map(normalizeTrend)
    .filter((entry): entry is TrendMonth => Boolean(entry))
    .sort((left, right) => left.year - right.year || left.month - right.month)
}

function formatRecentDate(value?: string) {
  if (!value || !isValidDateString(value)) {
    return ''
  }

  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getCalendarCounts(calendar: CalendarData | null) {
  if (!calendar) {
    return { submitted: 0, missing: 0, sunday: 0, upcoming: 0, open: 0 }
  }

  return calendar.days.reduce(
    (counts, day) => {
      if (day.status === 'submitted') {
        counts.submitted += 1
      } else if (day.status === 'missing') {
        counts.missing += 1
      } else if (day.status === 'sunday') {
        counts.sunday += 1
      } else if (day.status === 'future') {
        counts.upcoming += 1
      } else if (day.status === 'neutral') {
        counts.open += 1
      }

      return counts
    },
    { submitted: 0, missing: 0, sunday: 0, upcoming: 0, open: 0 },
  )
}

function getSelectedCalendarDay(calendar: CalendarData | null, selectedDate: string | null) {
  if (!calendar || calendar.days.length === 0) {
    return null
  }

  if (selectedDate) {
    const matchedDay = calendar.days.find((day) => day.date === selectedDate)
    if (matchedDay) {
      return matchedDay
    }
  }

  const todayKey = formatDateKey(todayStart)

  return (
    calendar.days.find((day) => day.date === todayKey) ??
    calendar.days.find((day) => day.updateContent?.trim()) ??
    calendar.days.find((day) => day.status === 'submitted') ??
    calendar.days.find((day) => day.status === 'missing') ??
    calendar.days[0] ??
    null
  )
}

function formatCalendarDayLabel(day: CalendarDay | null) {
  if (!day?.date) {
    return ''
  }

  const parsedDate = parseDateValue(day.date)

  if (Number.isNaN(parsedDate.getTime())) {
    return day.date
  }

  return parsedDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function getCalendarStatusLabel(status: DayStatus) {
  if (status === 'submitted') return 'Submitted'
  if (status === 'missing') return 'Missing'
  if (status === 'sunday') return 'Sunday'
  if (status === 'future') return 'Upcoming'
  return 'No status'
}

function getCalendarStatusVariant(status: DayStatus) {
  if (status === 'submitted') return 'success'
  if (status === 'missing') return 'danger'
  if (status === 'sunday') return 'warning'
  return 'secondary'
}

function getCalendarDetailText(day: CalendarDay | null) {
  const content = day?.updateContent?.trim()

  if (content) {
    return content
  }

  if (!day) {
    return 'Select a calendar day to inspect the update returned by the API.'
  }

  if (day.status === 'missing') {
    return 'No update was submitted for this working day.'
  }

  if (day.status === 'sunday') {
    return 'This day is marked as Sunday.'
  }

  if (day.status === 'future') {
    return 'This date is still in the future.'
  }

  return 'No update content was returned by the API for this date.'
}

function getCalendarCellStatusLabel(status: DayStatus) {
  if (status === 'submitted') return 'Logged'
  if (status === 'missing') return 'Missed'
  if (status === 'sunday') return 'Off Day'
  if (status === 'future') return 'Soon'
  return 'Open'
}

function getCalendarShortWeekday(day: CalendarDay) {
  if (day.weekday?.trim()) {
    return day.weekday.slice(0, 3)
  }

  if (!day.date) {
    return ''
  }

  const parsedDate = parseDateValue(day.date)

  if (Number.isNaN(parsedDate.getTime())) {
    return ''
  }

  return weekdayLabels[(parsedDate.getDay() + 6) % 7]
}

function getCalendarBoardWeekday(day: CalendarDay) {
  const weekdayMap: Record<string, string> = {
    mon: 'DUS',
    tue: 'SES',
    wed: 'CHO',
    thu: 'PAY',
    fri: 'JUM',
    sat: 'SHA',
    sun: 'YAK',
  }

  if (day.date) {
    const parsedDate = parseDateValue(day.date)

    if (!Number.isNaN(parsedDate.getTime())) {
      return ['YAK', 'DUS', 'SES', 'CHO', 'PAY', 'JUM', 'SHA'][parsedDate.getDay()]
    }
  }

  if (day.weekday?.trim()) {
    return weekdayMap[day.weekday.trim().slice(0, 3).toLowerCase()] ?? day.weekday.trim().slice(0, 3).toUpperCase()
  }

  return ''
}

function getCalendarEntryCount(day: CalendarDay) {
  return day.updates_count ?? (day.hasUpdate ? 1 : 0)
}

function getCalendarCellHint(day: CalendarDay) {
  if (day.hasUpdate) {
    if ((day.updates_count ?? 0) > 1) {
      return `${day.updates_count} updates logged`
    }

    return 'Update captured'
  }

  if (day.status === 'missing') {
    return 'Needs submission'
  }

  if (day.status === 'sunday') {
    return 'Recovery day'
  }

  if (day.status === 'future') {
    return 'Awaiting date'
  }

  return 'No update yet'
}

function getCalendarAgendaEyebrow(day: CalendarDay, todayKey: string, selectedDate: string | null) {
  if (day.date && day.date === selectedDate) {
    return 'Selected'
  }

  if (day.date === todayKey) {
    return 'Today'
  }

  if (day.status === 'missing') {
    return 'Needs follow-up'
  }

  if (day.status === 'submitted') {
    return 'Latest log'
  }

  if (day.status === 'future') {
    return 'Upcoming'
  }

  if (day.status === 'sunday') {
    return 'Off day'
  }

  return 'Calendar day'
}

function getCalendarAgendaDays(calendar: CalendarData | null, todayKey: string, selectedDate: string | null) {
  if (!calendar) {
    return []
  }

  const selectedDay = selectedDate
    ? calendar.days.find((day) => day.date === selectedDate) ?? null
    : null
  const todayDay = calendar.days.find((day) => day.date === todayKey) ?? null
  const missingDays = calendar.days
    .filter((day) => day.status === 'missing' && day.date)
    .sort((left, right) => (right.date ?? '').localeCompare(left.date ?? ''))
  const submittedDays = calendar.days
    .filter((day) => day.status === 'submitted' && day.date)
    .sort((left, right) => (right.date ?? '').localeCompare(left.date ?? ''))
  const upcomingDays = calendar.days
    .filter((day) => day.status === 'future' && day.date)
    .sort((left, right) => (left.date ?? '').localeCompare(right.date ?? ''))

  const seen = new Set<string>()
  const result: CalendarDay[] = []

  for (const day of [selectedDay, todayDay, ...missingDays, ...submittedDays, ...upcomingDays]) {
    if (!day?.date || seen.has(day.date)) {
      continue
    }

    seen.add(day.date)
    result.push(day)

    if (result.length === 6) {
      break
    }
  }

  return result
}

function shiftCalendarMonth(month: number, year: number, delta: number) {
  const nextDate = new Date(year, month - 1 + delta, 1)

  return {
    month: nextDate.getMonth() + 1,
    year: nextDate.getFullYear(),
  }
}

const dayStyle: Record<DayStatus, string> = {
  submitted: 'border-emerald-400/30 bg-[linear-gradient(180deg,rgba(15,53,45,0.98),rgba(11,39,33,0.96))] text-emerald-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_20px_36px_rgba(0,0,0,0.16)]',
  missing: 'border-rose-400/34 bg-[linear-gradient(180deg,rgba(73,22,37,0.98),rgba(49,18,28,0.96))] text-rose-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_20px_36px_rgba(0,0,0,0.16)]',
  sunday: 'border-white/10 bg-[linear-gradient(180deg,rgba(35,36,44,0.98),rgba(25,26,34,0.98))] text-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
  future: 'border-white/10 bg-[linear-gradient(180deg,rgba(35,36,44,0.98),rgba(25,26,34,0.98))] text-white/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
  neutral: 'border-white/10 bg-[linear-gradient(180deg,rgba(35,36,44,0.98),rgba(25,26,34,0.98))] text-white/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
}

const dayAccentStyle: Record<DayStatus, string> = {
  submitted: 'bg-emerald-300 shadow-[0_0_16px_rgba(52,211,153,0.55)]',
  missing: 'bg-rose-300 shadow-[0_0_16px_rgba(253,164,175,0.35)]',
  sunday: 'bg-amber-300/70',
  future: 'bg-white/14',
  neutral: 'bg-white/14',
}

const dayPillStyle: Record<DayStatus, string> = {
  submitted: 'border-emerald-400/22 bg-emerald-400/10 text-emerald-100',
  missing: 'border-rose-400/22 bg-rose-400/10 text-rose-100',
  sunday: 'border-amber-300/18 bg-amber-300/10 text-amber-100/85',
  future: 'border-white/10 bg-white/[0.04] text-white/60',
  neutral: 'border-white/10 bg-white/[0.04] text-white/60',
}

const dayDotStyle: Record<DayStatus, string> = {
  submitted: 'bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.55)]',
  missing: 'bg-rose-300 shadow-[0_0_10px_rgba(253,164,175,0.38)]',
  sunday: 'bg-amber-300/80',
  future: 'bg-white/24',
  neutral: 'bg-white/24',
}

const dayStatusTextStyle: Record<DayStatus, string> = {
  submitted: 'text-emerald-100/88',
  missing: 'text-rose-100/88',
  sunday: 'text-amber-100/75',
  future: 'text-white/46',
  neutral: 'text-white/46',
}

const dayFocusStyle: Record<DayStatus, string> = {
  submitted: 'border-emerald-400/30 bg-[linear-gradient(180deg,rgba(15,53,45,0.98),rgba(11,39,33,0.96))] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
  missing: 'border-rose-400/32 bg-[linear-gradient(180deg,rgba(73,22,37,0.98),rgba(49,18,28,0.96))] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
  sunday: 'border-amber-300/20 bg-[linear-gradient(180deg,rgba(58,45,23,0.92),rgba(45,33,17,0.92))] text-amber-50/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
  future: 'border-white/10 bg-[linear-gradient(180deg,rgba(35,36,44,0.98),rgba(25,26,34,0.98))] text-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
  neutral: 'border-white/10 bg-[linear-gradient(180deg,rgba(35,36,44,0.98),rgba(25,26,34,0.98))] text-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
}

type AccentKey = 'default' | 'success' | 'warning' | 'blue' | 'violet'

const cardBorder: Record<AccentKey, string> = {
  default: 'border-white/8',
  success: 'border-emerald-500/20',
  warning: 'border-amber-500/20',
  blue: 'border-blue-500/20',
  violet: 'border-violet-500/20',
}

const cardIcon: Record<AccentKey, string> = {
  default: 'border-white/10 bg-white/6 text-(--muted-strong)',
  success: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
  warning: 'border-amber-500/20 bg-amber-400/10 text-amber-300',
  blue: 'border-blue-500/20 bg-blue-600/10 text-blue-300',
  violet: 'border-violet-500/20 bg-violet-500/10 text-violet-300',
}

function SummaryCard({ icon, label, value, accent = 'default' }: {
  icon: ReactNode
  label: string
  value: ReactNode
  accent?: AccentKey
}) {
  return (
    <div className={cn('card-base flex items-center gap-4 px-5 py-4', cardBorder[accent])}>
      <div className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl border', cardIcon[accent])}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-(--muted)">{label}</p>
        <p className="mt-1 truncate text-xl font-semibold leading-none text-white">{value}</p>
      </div>
    </div>
  )
}

function CompletionBar({ pct }: { pct: number }) {
  const color = pct >= 90 ? 'bg-emerald-500' : pct >= 75 ? 'bg-amber-400' : 'bg-rose-500'

  return (
    <div className="h-1.5 w-full rounded-full bg-white/8">
      <div className={cn('h-full rounded-full transition-all duration-500', color)} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  )
}

function clampYear(value: number) {
  if (!Number.isFinite(value)) {
    return now.getFullYear()
  }

  return Math.min(2035, Math.max(2020, Math.round(value)))
}

export function UpdateTrackingPage() {
  const { showToast } = useToast()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [yearInput, setYearInput] = useState(String(now.getFullYear()))
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const todayKey = formatDateKey(todayStart)

  const statsQuery = useAsyncData(() => updateTrackingService.myStats(), [])
  const calendarQuery = useAsyncData(() => updateTrackingService.calendar(month, year), [month, year])
  const trendsQuery = useAsyncData(() => updateTrackingService.trends(), [])
  const recentQuery = useAsyncData(() => updateTrackingService.recent(20), [])

  const stats = statsQuery.data
  const calendar = useMemo(() => parseCalendar(calendarQuery.data, month, year), [calendarQuery.data, month, year])
  const trends = useMemo(() => parseTrends(trendsQuery.data), [trendsQuery.data])
  const recent = useMemo(() => parseRecent(recentQuery.data), [recentQuery.data])
  const calendarCounts = useMemo(() => getCalendarCounts(calendar), [calendar])
  const selectedCalendarDay = useMemo(() => getSelectedCalendarDay(calendar, selectedDate), [calendar, selectedDate])
  const selectedCalendarDayLabel = useMemo(() => formatCalendarDayLabel(selectedCalendarDay), [selectedCalendarDay])
  const calendarAgendaDays = useMemo(() => getCalendarAgendaDays(calendar, todayKey, selectedDate), [calendar, todayKey, selectedDate])
  const latestSubmittedDay = useMemo(() => (
    calendar?.days
      .slice()
      .reverse()
      .find((day) => day.status === 'submitted') ?? null
  ), [calendar])
  const nextUpcomingDay = useMemo(() => calendar?.days.find((day) => day.status === 'future') ?? null, [calendar])

  async function handleRefresh() {
    await Promise.all([
      statsQuery.refetch(),
      calendarQuery.refetch(),
      trendsQuery.refetch(),
      recentQuery.refetch(),
    ])
    showToast({ title: 'Refreshed', description: 'Your update data has been reloaded.', tone: 'success' })
  }

  function applyYearInput() {
    const nextYear = clampYear(Number(yearInput))
    setYearInput(String(nextYear))

    if (nextYear !== year) {
      setYear(nextYear)
      setSelectedDate(null)
    }
  }

  function handleYearKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      applyYearInput()
    }
  }

  function handleMonthChange(nextMonth: number) {
    if (nextMonth === month) {
      return
    }

    setMonth(nextMonth)
    setSelectedDate(null)
  }

  function handleMonthShift(delta: number) {
    const nextPeriod = shiftCalendarMonth(month, year, delta)
    setMonth(nextPeriod.month)
    setYear(nextPeriod.year)
    setYearInput(String(nextPeriod.year))
    setSelectedDate(null)
  }

  function handleJumpToToday() {
    setMonth(todayStart.getMonth() + 1)
    setYear(todayStart.getFullYear())
    setYearInput(String(todayStart.getFullYear()))
    setSelectedDate(todayKey)
  }

  if (statsQuery.isLoading && !stats) {
    return (
      <LoadingStateBlock
        eyebrow="Updates"
        title="Loading your updates"
        description="Fetching your personal update statistics."
      />
    )
  }

  if (statsQuery.isError && !stats) {
    return (
      <ErrorStateBlock
        eyebrow="Updates"
        title="Updates unavailable"
        description="Could not load your update statistics."
        actionLabel="Retry"
        onAction={() => void statsQuery.refetch()}
      />
    )
  }

  const monthlyPct = stats?.percentage_this_month ?? 0
  const weeklyPct = stats?.percentage_this_week ?? 0
  const selectedMonthName = getMonthName(month)
  const firstDayOffset = calendar
    ? (new Date(calendar.year, calendar.month - 1, 1).getDay() + 6) % 7
    : 0
  const calendarCells = calendar
    ? [...Array.from<null>({ length: firstDayOffset }).fill(null), ...calendar.days]
    : []
  const calendarWeeks = Array.from({ length: Math.ceil(calendarCells.length / 7) }, (_, index) => (
    calendarCells.slice(index * 7, index * 7 + 7)
  ))
  const elapsedWorkingDays = calendarCounts.submitted + calendarCounts.missing + calendarCounts.open
  const attentionDaysCount = calendarCounts.missing + calendarCounts.open
  const monthProgressPct = elapsedWorkingDays > 0
    ? (calendarCounts.submitted / elapsedWorkingDays) * 100
    : 0

  return (
    <section className="space-y-6 page-enter">
      <Card variant="glass" noPadding className="overflow-hidden rounded-[28px] border-white/8">
        <div className="relative overflow-hidden px-6 py-6 sm:px-8 sm:py-7">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.15),transparent_70%)]" />
          <div className="pointer-events-none absolute -right-10 top-4 h-32 w-32 rounded-full bg-violet-400/8 blur-3xl" />

          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-violet-400/80">
                Personal
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-[1.75rem]">
                My Updates
              </h1>
              <p className="mt-1.5 text-[13px] text-(--muted)">
                Track your daily update submissions and performance.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/4 px-3 py-2">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-(--muted)">Year</label>
                <Input
                  type="number"
                  min="2020"
                  max="2035"
                  value={yearInput}
                  onChange={(event) => setYearInput(event.target.value)}
                  onBlur={applyYearInput}
                  onKeyDown={handleYearKeyDown}
                  className="h-7 w-18 border-white/10 bg-transparent px-2 text-sm text-white"
                />
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/4 px-3 py-2">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-(--muted)">Month</label>
                <select
                  value={month}
                  onChange={(event) => handleMonthChange(Number(event.target.value))}
                  className="h-7 rounded-lg border border-white/10 bg-(--surface) px-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/20"
                >
                  {ALL_MONTHS.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 stagger-children">
        <SummaryCard
          accent="violet"
          label="Monthly Completion"
          value={`${monthlyPct.toFixed(1)}%`}
          icon={(
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 10a8 8 0 1 1 16 0" />
              <path d="M10 10V4" />
              <path d="M10 10l4 2.5" />
            </svg>
          )}
        />
        <SummaryCard
          accent={weeklyPct >= 80 ? 'success' : weeklyPct >= 50 ? 'warning' : 'default'}
          label="Weekly Completion"
          value={`${weeklyPct.toFixed(1)}%`}
          icon={(
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="16" height="14" rx="2" />
              <path d="M7 3v14M13 3v14M2 9h16M2 13h16" />
            </svg>
          )}
        />
        <SummaryCard
          accent="blue"
          label="Updates This Month"
          value={stats?.updates_this_month ?? 0}
          icon={(
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="10" cy="10" r="8" />
              <path d="m6.5 10 2.5 2.5 4.5-4.5" />
            </svg>
          )}
        />
        <SummaryCard
          accent="default"
          label="Updates This Week"
          value={stats?.updates_this_week ?? 0}
          icon={(
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="2 15 7 8 11 12 15 6 18 9" />
            </svg>
          )}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.92fr)]">
        <Card variant="glass" className="overflow-hidden p-0">
          <div className="border-b border-(--border) px-5 py-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <SectionTitle
                title={`${selectedMonthName} ${year} Calendar`}
                description="Reference-driven monthly board with dense day cards, week rails, and one-click inspection."
              />
              {calendar ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="success" dot>{calendarCounts.submitted} submitted</Badge>
                  <Badge variant="danger" dot>{calendarCounts.missing} missing</Badge>
                  {calendarCounts.open > 0 ? (
                    <Badge variant="secondary">{calendarCounts.open} open</Badge>
                  ) : null}
                  <Badge variant="warning" dot>{calendarCounts.sunday} sundays</Badge>
                  {calendarCounts.upcoming > 0 ? (
                    <Badge variant="secondary">{calendarCounts.upcoming} upcoming</Badge>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
          <div className="px-5 py-4">
            {calendarQuery.isLoading ? (
              <div className="py-10 text-center text-sm text-(--muted)">Loading calendar...</div>
            ) : !calendar ? (
              <div className="py-10 text-center text-sm text-(--muted)">No calendar data for this period.</div>
            ) : (
              <>
                <div className="rounded-[28px] border border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.10),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(139,92,246,0.10),transparent_24%),linear-gradient(180deg,rgba(22,23,31,0.98),rgba(14,15,20,0.98))] p-3 sm:p-4">
                  <div className="overflow-hidden rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(24,25,33,0.98),rgba(17,18,24,0.98))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-5">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                      <div className="max-w-xl">
                        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-300/72">
                          Calendar System
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <h3 className="text-[1.45rem] font-semibold tracking-tight text-white sm:text-[1.65rem]">
                            {selectedMonthName} {year}
                          </h3>
                          <Badge
                            variant="violet"
                            className="rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]"
                          >
                            {monthProgressPct.toFixed(0)}% pace
                          </Badge>
                        </div>
                        <p className="mt-2 text-[12px] leading-5 text-(--muted)">
                          Dense monthly board for fast scanning, modeled after the reference calendar layout.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleMonthShift(-1)}
                          className="min-h-9 rounded-full border-white/10 bg-white/[0.03] px-3"
                        >
                          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M10 3.5 5.5 8 10 12.5" />
                          </svg>
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handleJumpToToday}
                          className="min-h-9 rounded-full border-emerald-400/18 bg-emerald-400/10 px-4 text-emerald-50 hover:border-emerald-300/30 hover:bg-emerald-400/14"
                        >
                          Today
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleMonthShift(1)}
                          className="min-h-9 rounded-full border-white/10 bg-white/[0.03] px-3"
                        >
                          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M6 3.5 10.5 8 6 12.5" />
                          </svg>
                        </Button>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <Badge variant="success" dot className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.18em]">
                        {calendarCounts.submitted} logged
                      </Badge>
                      <Badge variant="danger" dot className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.18em]">
                        {calendarCounts.missing} missed
                      </Badge>
                      <Badge variant="secondary" className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.18em]">
                        {attentionDaysCount} attention
                      </Badge>
                      <Badge variant="secondary" className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.18em]">
                        Next:{' '}
                        {nextUpcomingDay
                          ? `${getCalendarShortWeekday(nextUpcomingDay)} ${nextUpcomingDay.day}`
                          : latestSubmittedDay
                            ? `${getCalendarShortWeekday(latestSubmittedDay)} ${latestSubmittedDay.day}`
                            : 'None'}
                      </Badge>
                      <div className="ml-auto flex w-full items-center gap-3 rounded-full border border-white/8 bg-white/[0.04] px-3 py-2 sm:w-auto sm:min-w-[250px]">
                        <div className="min-w-0 flex-1">
                          <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/36">
                            Completion To Date
                          </p>
                          <p className="mt-1 text-[11px] text-white/72">
                            {elapsedWorkingDays > 0 ? `${calendarCounts.submitted} of ${elapsedWorkingDays} elapsed workdays logged.` : 'No elapsed workdays yet.'}
                          </p>
                        </div>
                        <div className="w-22 shrink-0">
                          <div className="mb-1 flex items-center justify-between text-[10px] text-white/68">
                            <span>{calendarCounts.submitted}/{elapsedWorkingDays || 0}</span>
                            <span>{monthProgressPct.toFixed(0)}%</span>
                          </div>
                          <CompletionBar pct={monthProgressPct} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 overflow-x-auto pb-1">
                    <div className="min-w-[860px]">
                      <div className="grid grid-cols-[68px_repeat(7,minmax(104px,1fr))] gap-2">
                        <div aria-hidden="true" />
                        {weekdayLabels.map((label) => (
                          <div
                            key={label}
                            className="rounded-full border border-white/8 bg-[linear-gradient(180deg,rgba(34,35,43,0.96),rgba(24,25,32,0.98))] px-3 py-3 text-center text-[10px] font-bold uppercase tracking-[0.26em] text-white/42 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
                          >
                            {label}
                          </div>
                        ))}
                      </div>

                      <div className="mt-2.5 space-y-2.5">
                        {calendarWeeks.map((week, weekIndex) => (
                          <div key={`week-${weekIndex + 1}`} className="grid grid-cols-[68px_repeat(7,minmax(104px,1fr))] gap-2">
                            <div className="flex min-h-[114px] flex-col items-center justify-center rounded-[20px] border border-white/8 bg-[linear-gradient(180deg,rgba(32,33,41,0.98),rgba(22,23,30,0.98))] px-2 py-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                              <span className="text-[9px] font-bold uppercase tracking-[0.26em] text-white/34">Week</span>
                              <span className="mt-2 text-base font-semibold tabular-nums text-white/82">{weekIndex + 1}</span>
                            </div>

                            {week.map((day, dayIndex) => {
                              if (!day) {
                                return (
                                  <div
                                    key={`empty-${weekIndex}-${dayIndex}`}
                                    className="min-h-[114px] rounded-[20px] border border-dashed border-white/6 bg-[linear-gradient(180deg,rgba(20,21,27,0.82),rgba(15,16,21,0.78))]"
                                    aria-hidden="true"
                                  />
                                )
                              }

                              const entryCount = getCalendarEntryCount(day)
                              const isSelected = selectedCalendarDay?.date === day.date
                              const isToday = day.date === todayKey

                              return (
                                <button
                                  key={day.date ?? `${weekIndex}-${dayIndex}`}
                                  type="button"
                                  onClick={() => setSelectedDate(day.date ?? null)}
                                  aria-pressed={isSelected}
                                  className={cn(
                                    'group relative flex min-h-[114px] min-w-0 flex-col overflow-hidden rounded-[20px] border px-3.5 py-2.5 text-left transition-all duration-200',
                                    dayStyle[day.status],
                                    isSelected
                                      ? 'border-violet-400/65 ring-2 ring-violet-400/55 ring-offset-2 ring-offset-[var(--background)] shadow-[0_0_0_1px_rgba(167,139,250,0.20),0_18px_40px_rgba(8,8,12,0.34)]'
                                      : 'hover:-translate-y-[1px] hover:border-white/14',
                                    isToday && !isSelected && 'shadow-[inset_0_0_0_1px_rgba(125,211,252,0.24)]',
                                  )}
                                  title={`${isSelected ? 'Selected: ' : ''}${formatCalendarDayLabel(day) || `Day ${day.day}`}: ${getCalendarStatusLabel(day.status)}`}
                                >
                                  <span className={cn('absolute inset-x-3.5 top-0 h-[2px] rounded-full', dayAccentStyle[day.status])} />
                                  <span className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),transparent_42%)] opacity-0 transition group-hover:opacity-100" />

                                  <div className="relative flex items-start justify-between gap-3">
                                    <div>
                                      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/34">
                                        {getCalendarBoardWeekday(day)}
                                      </p>
                                      <p className={cn(
                                        'mt-1.5 text-[1.75rem] font-semibold leading-none tabular-nums tracking-tight',
                                        day.status === 'submitted' || day.status === 'missing' ? 'text-white' : 'text-white/82',
                                      )}>
                                        {day.day}
                                      </p>
                                    </div>

                                    <div className="flex flex-col items-end gap-1.5">
                                      {entryCount > 0 ? (
                                        <span className="inline-flex min-w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.75 text-[9px] font-semibold tabular-nums text-white/72">
                                          {entryCount}x
                                        </span>
                                      ) : null}
                                      {isToday ? (
                                        <span className="grid h-6 w-6 place-items-center rounded-full border border-sky-400/30 bg-sky-500/10">
                                          <span className="h-2 w-2 rounded-full bg-sky-300 shadow-[0_0_12px_rgba(125,211,252,0.70)]" />
                                        </span>
                                      ) : null}
                                    </div>
                                  </div>

                                  <div className="relative mt-auto">
                                    <span className={cn(
                                      'inline-flex max-w-full items-center gap-1 rounded-full border px-2.5 py-0.75 text-[9px] font-semibold uppercase tracking-[0.14em]',
                                      dayPillStyle[day.status],
                                    )}>
                                      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', dayDotStyle[day.status])} />
                                      {getCalendarCellStatusLabel(day.status)}
                                    </span>
                                    <p className={cn('mt-1.5 text-[9px] leading-3.5', dayStatusTextStyle[day.status])}>
                                      {getCalendarCellHint(day)}
                                    </p>
                                  </div>
                                </button>
                              )
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px] text-(--muted)">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.55)]" />
                      Selected
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-sky-300 shadow-[0_0_8px_rgba(125,211,252,0.55)]" />
                      Today
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-sm border border-emerald-500/35 bg-emerald-500/25" />
                      Logged
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-sm border border-rose-500/30 bg-rose-500/20" />
                      Missed
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-sm border border-white/10 bg-white/4" />
                      Open or upcoming
                    </span>
                  </div>
                </div>

                <div className="mt-4 rounded-[22px] border border-white/8 bg-[linear-gradient(180deg,rgba(23,24,31,0.92),rgba(16,17,22,0.92))] px-4 py-3.5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-(--muted)">
                    Right rail inspector
                  </p>
                  <p className="mt-1 text-[12px] leading-5 text-white/75">
                    Pick any card in the board to inspect returned content, validation and queue priority without losing monthly context.
                  </p>
                </div>
              </>
            )}
          </div>
        </Card>

        <div className="flex flex-col gap-6">
          <Card variant="glass" className="overflow-hidden p-0">
            <div className="border-b border-(--border) px-5 py-4">
              <SectionTitle
                title="Focus Day"
                description="Selected-date inspector with status, validation, and returned content."
              />
            </div>
            <div className="space-y-4 px-5 py-4">
              <div className="flex items-start gap-4">
                <div className={cn(
                  'grid h-18 w-18 shrink-0 place-items-center rounded-[22px] border text-[1.75rem] font-semibold tabular-nums shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
                  selectedCalendarDay ? dayFocusStyle[selectedCalendarDay.status] : dayFocusStyle.neutral,
                )}>
                  {selectedCalendarDay?.day ?? '--'}
                </div>

                <div className="min-w-0">
                  <h3 className="text-base font-semibold tracking-tight text-white">
                    {selectedCalendarDayLabel || 'No date selected'}
                  </h3>
                  <p className="mt-1 text-[12px] leading-5 text-(--muted)">
                    {selectedCalendarDay ? getCalendarCellHint(selectedCalendarDay) : 'Pick a date from the month grid to inspect details.'}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedCalendarDay ? (
                      <Badge variant={getCalendarStatusVariant(selectedCalendarDay.status)} dot>
                        {getCalendarStatusLabel(selectedCalendarDay.status)}
                      </Badge>
                    ) : null}
                    {selectedCalendarDay?.weekday ? (
                      <Badge variant="secondary">{selectedCalendarDay.weekday}</Badge>
                    ) : null}
                    {selectedCalendarDay?.date === todayKey ? (
                      <Badge variant="blue">Today</Badge>
                    ) : null}
                    {selectedCalendarDay?.hasUpdate ? (
                      <Badge variant="violet">Payload available</Badge>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-[18px] border border-white/8 bg-black/10 px-3 py-3 text-[12px] text-(--muted)">
                  <p>Status</p>
                  <p className="mt-1 font-medium text-white/85">
                    {selectedCalendarDay ? getCalendarStatusLabel(selectedCalendarDay.status) : 'N/A'}
                  </p>
                </div>
                <div className="rounded-[18px] border border-white/8 bg-black/10 px-3 py-3 text-[12px] text-(--muted)">
                  <p>Submission</p>
                  <p className="mt-1 font-medium text-white/85">
                    {selectedCalendarDay?.hasUpdate ? 'Available' : 'None'}
                  </p>
                </div>
                <div className="rounded-[18px] border border-white/8 bg-black/10 px-3 py-3 text-[12px] text-(--muted)">
                  <p>Validation</p>
                  <p className={cn(
                    'mt-1 font-medium',
                    selectedCalendarDay?.isValid === false
                      ? 'text-amber-300'
                      : selectedCalendarDay?.isValid === true
                        ? 'text-emerald-300'
                        : 'text-white/60',
                  )}>
                    {selectedCalendarDay?.isValid === false ? 'Needs review' : selectedCalendarDay?.isValid === true ? 'Valid' : 'N/A'}
                  </p>
                </div>
                <div className="rounded-[18px] border border-white/8 bg-black/10 px-3 py-3 text-[12px] text-(--muted)">
                  <p>Entries</p>
                  <p className="mt-1 font-medium text-white/85">
                    {selectedCalendarDay ? getCalendarEntryCount(selectedCalendarDay) : 0}
                  </p>
                </div>
              </div>

              <div className="rounded-[20px] border border-white/8 bg-black/15 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-(--muted)">
                      {selectedCalendarDay?.hasUpdate ? 'Update Content' : 'Day Note'}
                    </p>
                    <h3 className="mt-2 text-base font-semibold tracking-tight text-white">
                      {selectedCalendarDay?.hasUpdate ? 'Returned content for this date' : 'No returned content for this date'}
                    </h3>
                  </div>
                  {selectedCalendarDay?.hasUpdate ? (
                    <Badge variant="blue">API payload</Badge>
                  ) : null}
                </div>

                <div className="mt-4 max-h-[280px] overflow-y-auto rounded-[18px] border border-white/8 bg-black/20 p-4">
                  <p className="whitespace-pre-wrap text-[13px] leading-6 text-white/85">
                    {getCalendarDetailText(selectedCalendarDay)}
                  </p>
                </div>

                {selectedCalendarDay?.isValid === false ? (
                  <p className="mt-3 text-xs text-amber-300">
                    This update was returned with an invalid flag by the API.
                  </p>
                ) : null}
              </div>
            </div>
          </Card>

          <Card variant="glass" className="overflow-hidden p-0">
            <div className="border-b border-(--border) px-5 py-4">
              <SectionTitle
                title="Action Queue"
                description="Recent misses, today, and the next upcoming dates stay one click away."
              />
            </div>
            <div className="space-y-2.5 px-5 py-4">
              {calendarAgendaDays.length > 0 ? calendarAgendaDays.map((day) => (
                <button
                  key={`agenda-${day.date ?? day.day}`}
                  type="button"
                  onClick={() => setSelectedDate(day.date ?? null)}
                  className={cn(
                    'w-full rounded-[18px] border px-3.5 py-3 text-left transition',
                    selectedCalendarDay?.date === day.date
                      ? 'border-violet-400/45 bg-violet-500/[0.08] shadow-[0_10px_24px_rgba(76,29,149,0.20)]'
                      : 'border-white/8 bg-white/[0.02] hover:border-white/14 hover:bg-white/[0.04]',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-(--muted)">
                        {getCalendarAgendaEyebrow(day, todayKey, selectedDate)}
                      </p>
                      <p className="mt-1 text-sm font-semibold tracking-tight text-white">
                        {formatCalendarDayLabel(day) || `Day ${day.day}`}
                      </p>
                      <p className={cn('mt-1 text-[11px] leading-5', dayStatusTextStyle[day.status])}>
                        {getCalendarCellHint(day)}
                      </p>
                    </div>

                    <Badge variant={getCalendarStatusVariant(day.status)} size="sm" dot>
                      {getCalendarCellStatusLabel(day.status)}
                    </Badge>
                  </div>
                </button>
              )) : (
                <div className="rounded-[18px] border border-dashed border-white/8 bg-black/10 px-4 py-5 text-sm text-(--muted)">
                  No highlighted days in this range.
                </div>
              )}
            </div>
          </Card>

          {trends.length > 0 && (
            <Card variant="glass" className="overflow-hidden p-0">
              <div className="border-b border-(--border) px-5 py-4">
                <SectionTitle title="Performance Trends" />
              </div>
              <div className="space-y-3 px-5 py-4">
                {trends.slice(-6).map((trend) => {
                  const pct = trend.completion_percentage ?? 0
                  const label = trend.month_name ?? `${getMonthName(trend.month)} ${trend.year}`

                  return (
                    <div key={`${trend.year}-${trend.month}`} className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-(--muted-strong)">{label}</span>
                        <span className={cn('font-bold tabular-nums', pct >= 80 ? 'text-emerald-400' : pct >= 50 ? 'text-amber-400' : 'text-rose-400')}>
                          {pct.toFixed(1)}%
                        </span>
                      </div>
                      <CompletionBar pct={pct} />
                    </div>
                  )
                })}
              </div>
            </Card>
          )}

          <Card variant="glass" className="flex-1 overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-(--border) px-5 py-4">
              <SectionTitle title="Recent Updates" />
              <Badge variant="blue">{recent.length}</Badge>
            </div>
            <div className="divide-y divide-(--border)">
              {recent.length === 0 ? (
                <div className="py-10 text-center text-sm text-(--muted)">No recent updates.</div>
              ) : (
                recent.slice(0, 10).map((item, index) => {
                  const dateLabel = formatRecentDate(item.update_date ?? item.date)
                  const text = item.update_text ?? item.message ?? item.text ?? ''

                  return (
                    <div key={String(item.id ?? index)} className="px-5 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <p className="line-clamp-2 text-[13px] text-white/80">{text || 'No description returned by API.'}</p>
                        {dateLabel && (
                          <span className="shrink-0 text-[11px] tabular-nums text-(--muted)">
                            {dateLabel}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </Card>
        </div>
      </div>
    </section>
  )
}
