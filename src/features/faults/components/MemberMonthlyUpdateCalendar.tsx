import { useMemo, useState } from 'react'
import type { DayStatus } from '../../../shared/api/types'
import { getIntlLocale } from '../../../shared/i18n/translations'
import { cn } from '../../../shared/lib/cn'
import { Badge } from '../../../shared/ui/badge'
import { Button } from '../../../shared/ui/button'
import type {
  MemberMonthlyUpdateCalendar,
  MemberMonthlyUpdateDay,
} from '../lib/salaryEstimates'

const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const boardWeekdayLabels = ['YAK', 'DUS', 'SES', 'CHO', 'PAY', 'JUM', 'SHA']

const dayStyle: Record<DayStatus, string> = {
  submitted: 'cal-day-submitted',
  missing:   'cal-day-missing',
  sunday:    'cal-day-sunday',
  future:    'cal-day-future',
  neutral:   'cal-day-neutral',
}

const dayAccentStyle: Record<DayStatus, string> = {
  submitted: 'cal-accent-submitted',
  missing:   'cal-accent-missing',
  sunday:    'cal-accent-sunday',
  future:    'cal-accent-future',
  neutral:   'cal-accent-neutral',
}

const dayPillStyle: Record<DayStatus, string> = {
  submitted: 'cal-pill-submitted',
  missing:   'cal-pill-missing',
  sunday:    'cal-pill-sunday',
  future:    'cal-pill-future',
  neutral:   'cal-pill-neutral',
}

const dayDotStyle: Record<DayStatus, string> = {
  submitted: 'cal-dot-submitted',
  missing:   'cal-dot-missing',
  sunday:    'cal-dot-sunday',
  future:    'cal-dot-future',
  neutral:   'cal-dot-neutral',
}

const dayStatusTextStyle: Record<DayStatus, string> = {
  submitted: 'cal-text-submitted',
  missing:   'cal-text-missing',
  sunday:    'cal-text-sunday',
  future:    'cal-text-future',
  neutral:   'cal-text-neutral',
}

const dayFocusStyle: Record<DayStatus, string> = {
  submitted: 'cal-focus-submitted',
  missing:   'cal-focus-missing',
  sunday:    'cal-focus-sunday',
  future:    'cal-focus-future',
  neutral:   'cal-focus-neutral',
}

function getMonthName(month: number): string {
  return new Intl.DateTimeFormat(getIntlLocale(), { month: 'long' }).format(new Date(2024, month - 1))
}

function formatLongDate(date: string) {
  const parsed = new Date(date)

  if (Number.isNaN(parsed.getTime())) {
    return date
  }

  return parsed.toLocaleDateString(getIntlLocale(), {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatEntryTimestamp(value?: string) {
  if (!value) {
    return null
  }

  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat(getIntlLocale(), {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(parsed)
}

function formatWorkTime(value?: string | null) {
  if (!value) {
    return '--:--'
  }

  const trimmed = value.trim()

  const timeMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/)

  if (timeMatch) {
    return `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`
  }

  const parsed = new Date(trimmed)

  if (Number.isNaN(parsed.getTime())) {
    return trimmed
  }

  return new Intl.DateTimeFormat(getIntlLocale(), {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(parsed)
}

function getMinutesFromTime(value?: string | null) {
  if (!value) {
    return null
  }

  const trimmed = value.trim()
  const timeMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)

  if (timeMatch) {
    const hours = Number(timeMatch[1])
    const minutes = Number(timeMatch[2])

    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
      return null
    }

    return (hours * 60) + minutes
  }

  const parsed = new Date(trimmed)

  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return (parsed.getHours() * 60) + parsed.getMinutes()
}

function getWorkedDurationLabel(day: MemberMonthlyUpdateDay) {
  const checkInMinutes = getMinutesFromTime(day.checkInTime)
  const checkOutMinutes = getMinutesFromTime(day.checkOutTime)

  if (checkInMinutes === null || checkOutMinutes === null || checkOutMinutes < checkInMinutes) {
    return 'Hours not returned'
  }

  const totalMinutes = checkOutMinutes - checkInMinutes
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours <= 0 && minutes <= 0) {
    return '0h'
  }

  if (minutes === 0) {
    return `${hours}h`
  }

  if (hours === 0) {
    return `${minutes}m`
  }

  return `${hours}h ${minutes}m`
}

function getSpecialDayLabel(day: MemberMonthlyUpdateDay | null | undefined) {
  if (!day?.workdayOverride) {
    return null
  }

  return day.workdayOverride.day_type === 'short_day' ? 'Short Day' : 'Holiday'
}

function isHolidayDay(day: MemberMonthlyUpdateDay | null | undefined) {
  return day?.status === 'sunday' && day.workdayOverride?.day_type === 'holiday'
}

function getDaySurfaceClass(day: MemberMonthlyUpdateDay) {
  if (isHolidayDay(day)) {
    return 'cal-day-holiday'
  }

  return dayStyle[day.status]
}

function getDayAccentClass(day: MemberMonthlyUpdateDay) {
  if (isHolidayDay(day)) {
    return 'cal-accent-holiday'
  }

  return dayAccentStyle[day.status]
}

function getDayPillClass(day: MemberMonthlyUpdateDay) {
  if (isHolidayDay(day)) {
    return 'cal-pill-holiday'
  }

  return dayPillStyle[day.status]
}

function getDayDotClass(day: MemberMonthlyUpdateDay) {
  if (isHolidayDay(day)) {
    return 'cal-dot-holiday'
  }

  return dayDotStyle[day.status]
}

function getDayTextClass(day: MemberMonthlyUpdateDay) {
  if (isHolidayDay(day)) {
    return 'cal-text-holiday'
  }

  return dayStatusTextStyle[day.status]
}

function getDayFocusClass(day: MemberMonthlyUpdateDay | null) {
  if (!day) {
    return dayFocusStyle.neutral
  }

  if (isHolidayDay(day)) {
    return 'cal-focus-holiday'
  }

  return dayFocusStyle[day.status]
}

function getStatusLabel(status: DayStatus, day?: MemberMonthlyUpdateDay | null) {
  const specialLabel = getSpecialDayLabel(day)

  if (status === 'submitted') return 'Submitted'
  if (status === 'missing') return 'Missing'
  if (status === 'sunday') return specialLabel ?? 'Off Day'
  if (status === 'future') return 'Upcoming'
  return 'Open'
}

function getStatusVariant(status: DayStatus, day?: MemberMonthlyUpdateDay | null) {
  if (status === 'submitted') return 'success' as const
  if (status === 'missing') return 'danger' as const
  if (isHolidayDay(day)) return 'blue' as const
  if (status === 'sunday') return 'warning' as const
  if (status === 'future') return 'secondary' as const
  return 'outline' as const
}

function getCalendarCellStatusLabel(status: DayStatus, day?: MemberMonthlyUpdateDay | null) {
  const specialLabel = getSpecialDayLabel(day)

  if (status === 'submitted') return 'Updated'
  if (status === 'missing') return 'Missed'
  if (status === 'sunday') return specialLabel ?? 'Off Day'
  if (status === 'future') return 'Soon'
  return 'Open'
}

function getCalendarCellHint(day: MemberMonthlyUpdateDay) {
  if (day.hasUpdate) return 'Update captured'
  if (day.workdayOverride) return day.workdayOverride.note?.trim() || day.workdayOverride.title?.trim() || getSpecialDayLabel(day) || 'Special day'
  if (day.status === 'missing') return 'Needs submission'
  if (day.status === 'sunday') return isHolidayDay(day) ? 'Holiday schedule' : 'Weekend / off day'
  if (day.status === 'future') return 'Awaiting date'
  return 'No update yet'
}

function getEntryCount(day: MemberMonthlyUpdateDay) {
  return Math.max(day.updatesCount, day.entries.length)
}

function getBoardWeekday(day: MemberMonthlyUpdateDay) {
  const parsed = new Date(day.date)

  if (Number.isNaN(parsed.getTime())) {
    return day.weekdayShort.toUpperCase()
  }

  return boardWeekdayLabels[parsed.getDay()]
}

function getShortWeekday(day: MemberMonthlyUpdateDay) {
  return day.weekdayShort.slice(0, 3)
}

function getDaySummary(day: MemberMonthlyUpdateDay) {
  if (day.hasUpdate) return 'Update captured'
  if (day.workdayOverride) return day.workdayOverride.title?.trim() || getSpecialDayLabel(day) || 'Special day'
  if (day.status === 'missing') return 'Needs submission'
  if (day.status === 'sunday') return isHolidayDay(day) ? 'Holiday' : 'Off day'
  if (day.status === 'future') return 'Awaiting date'
  return 'No explicit status returned'
}

function shouldShowTimePanel(day: MemberMonthlyUpdateDay) {
  return day.hasUpdate || Boolean(day.checkInTime) || Boolean(day.checkOutTime)
}

function getFocusDetailText(day: MemberMonthlyUpdateDay | null) {
  if (!day) {
    return 'Select a calendar day to inspect the update returned by the API.'
  }

  if (day.entries.length > 0) {
    return day.entries
      .map((entry, index) => {
        const title = entry.title?.trim() || `Update entry #${index + 1}`
        const text = entry.text?.trim() || 'Update submitted for this date.'
        const timestamp = formatEntryTimestamp(entry.createdAt)

        return `${title}${timestamp ? ` (${timestamp})` : ''}\n${text}`
      })
      .join('\n\n')
  }

  if (day.note?.trim()) {
    return day.note.trim()
  }

  if (day.workdayOverride) {
    const specialLabel = getSpecialDayLabel(day)
    return day.workdayOverride.note?.trim() || day.workdayOverride.title?.trim() || `${specialLabel ?? 'Special day'} is configured for this date.`
  }

  if (day.status === 'missing') return 'No update was submitted for this working day.'
  if (day.status === 'sunday') return isHolidayDay(day) ? 'This date is marked as a holiday.' : 'This date is an off day.'
  if (day.status === 'future') return 'This date is still in the future.'
  return 'No update content was returned by the API for this date.'
}

function CompletionBar({ pct }: { pct: number }) {
  const color = pct >= 90 ? 'bg-emerald-500' : pct >= 75 ? 'bg-amber-400' : 'bg-rose-500'

  return (
    <div className="h-1.5 w-full rounded-full bg-white/8">
      <div className={cn('h-full rounded-full transition-all duration-500', color)} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  )
}

type MemberMonthlyUpdateCalendarBoardProps = {
  calendar: MemberMonthlyUpdateCalendar
  className?: string
  onMonthShift?: (delta: number) => void
  onJumpToToday?: () => void
}

function getTodayKey() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function MemberMonthlyUpdateCalendarBoard({
  calendar,
  className,
  onMonthShift,
  onJumpToToday,
}: MemberMonthlyUpdateCalendarBoardProps) {
  const todayKey = getTodayKey()
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const counts = useMemo(() => (
    calendar.days.reduce(
      (accumulator, day) => {
        if (day.status === 'submitted') accumulator.submitted += 1
        else if (day.status === 'missing') accumulator.missing += 1
        else if (day.status === 'sunday') {
          if (isHolidayDay(day)) accumulator.holiday += 1
          else accumulator.offDay += 1
        }
        else if (day.status === 'future') accumulator.upcoming += 1
        else accumulator.open += 1

        return accumulator
      },
      { submitted: 0, missing: 0, offDay: 0, holiday: 0, upcoming: 0, open: 0 },
    )
  ), [calendar.days])

  const selectedDay = useMemo(() => {
    if (calendar.days.length === 0) {
      return null
    }

    if (selectedDate) {
      const matched = calendar.days.find((day) => day.date === selectedDate)

      if (matched) {
        return matched
      }
    }

    return (
      calendar.days.find((day) => day.status === 'submitted') ??
      calendar.days.find((day) => day.status === 'missing') ??
      calendar.days.find((day) => day.date === todayKey) ??
      calendar.days.find((day) => day.hasUpdate) ??
      calendar.days[0] ??
      null
    )
  }, [calendar.days, selectedDate, todayKey])

  const selectedKey = selectedDay?.date ?? null
  const selectedLabel = selectedDay ? formatLongDate(selectedDay.date) : 'No date selected'
  const latestSubmittedDay = useMemo(() => (
    [...calendar.days]
      .filter((day) => day.status === 'submitted')
      .sort((left, right) => right.date.localeCompare(left.date))[0] ?? null
  ), [calendar.days])
  const nextUpcomingDay = useMemo(() => (
    [...calendar.days]
      .filter((day) => day.status === 'future')
      .sort((left, right) => left.date.localeCompare(right.date))[0] ?? null
  ), [calendar.days])
  const firstDayOffset = useMemo(
    () => (new Date(calendar.year, calendar.month - 1, 1).getDay() + 6) % 7,
    [calendar.month, calendar.year],
  )
  const calendarCells = useMemo(
    () => [...Array.from<null>({ length: firstDayOffset }).fill(null), ...calendar.days],
    [calendar.days, firstDayOffset],
  )
  const calendarWeeks = useMemo(
    () => Array.from(
      { length: Math.ceil(calendarCells.length / 7) },
      (_, index) => calendarCells.slice(index * 7, index * 7 + 7),
    ),
    [calendarCells],
  )
  const elapsedWorkingDays = counts.submitted + counts.missing
  const attentionDays = counts.missing + counts.open
  const monthProgressPct = elapsedWorkingDays > 0
    ? (counts.submitted / elapsedWorkingDays) * 100
    : 0
  const selectedMonthName = getMonthName(calendar.month)
  const focusDetailText = getFocusDetailText(selectedDay)
  const shouldShowFocusContent = Boolean(
    selectedDay?.hasUpdate ||
    selectedDay?.entries.length ||
    selectedDay?.note?.trim() ||
    selectedDay?.workdayOverride,
  )
  const nextDayLabel = nextUpcomingDay
    ? `${getShortWeekday(nextUpcomingDay)} ${nextUpcomingDay.day}`
    : latestSubmittedDay
      ? `${getShortWeekday(latestSubmittedDay)} ${latestSubmittedDay.day}`
      : 'None'
  const completionSummaryText = elapsedWorkingDays > 0
    ? `${counts.submitted} of ${elapsedWorkingDays} completed workdays updated.`
    : 'No completed workdays yet.'

  return (
    <div className={cn('w-full', className)}>
      <div className="cal-inner overflow-hidden rounded-[28px] border">
        <div className="border-b border-(--border) px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h3 className="text-[1.55rem] font-semibold tracking-tight text-white">
                {selectedMonthName} {calendar.year} Calendar
              </h3>
              <p className="mt-1.5 text-[13px] text-[var(--muted)]">
                Reference-driven monthly board with dense day cards, week rails, and one-click inspection.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="success" dot>{counts.submitted} submitted</Badge>
              <Badge variant="danger" dot>{counts.missing} missing</Badge>
              {counts.holiday > 0 ? <Badge variant="blue" dot>{counts.holiday} holidays</Badge> : null}
              <Badge variant="warning" dot>{counts.offDay} off days</Badge>
              {counts.upcoming > 0 ? <Badge variant="secondary">{counts.upcoming} upcoming</Badge> : null}
            </div>
          </div>
        </div>

        <div className="px-4 py-4 sm:px-5">
          <div className="cal-container rounded-[28px] border p-2.5 sm:p-4">
            <div className="cal-inner overflow-hidden rounded-[28px] border bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))] p-3.5 sm:p-5">
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
                <div className="min-w-0 max-w-2xl">
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-300/72">
                    Calendar System
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <h4 className="text-[1.45rem] font-semibold tracking-tight text-white sm:text-[1.65rem]">
                      {selectedMonthName} {calendar.year}
                    </h4>
                    <Badge
                      variant="violet"
                      className="rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]"
                    >
                      {monthProgressPct.toFixed(0)}% pace
                    </Badge>
                  </div>
                  <p className="mt-2 text-[12px] leading-5 text-[var(--muted)]">
                    Dense monthly board for fast scanning, modeled after the reference calendar layout.
                  </p>
                </div>

                <div className="flex flex-col gap-3 md:items-end">
                  <div className="grid w-fit grid-cols-[44px_auto_44px] items-center gap-2 rounded-[20px] border border-[var(--border)] bg-white p-1.5 shadow-[0_10px_24px_rgba(148,163,184,0.14)] dark:border-white/10 dark:bg-black/18 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onMonthShift?.(-1)}
                      disabled={!onMonthShift}
                      className="min-h-11 min-w-11 rounded-[14px] border-[var(--border)] bg-[var(--surface-elevated)] px-0 text-[var(--foreground)] hover:border-[var(--border-hover)] hover:bg-[var(--card-hover)] disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.03] dark:text-white"
                    >
                      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M10 3.5 5.5 8 10 12.5" />
                      </svg>
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onJumpToToday?.()}
                      disabled={!onJumpToToday}
                      className="min-h-11 rounded-[14px] border-emerald-500/20 bg-emerald-50 px-5 text-emerald-700 hover:border-emerald-500/30 hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-400/18 dark:bg-emerald-400/10 dark:text-emerald-50 dark:hover:border-emerald-300/30 dark:hover:bg-emerald-400/14"
                    >
                      {selectedMonthName} {calendar.year}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onMonthShift?.(1)}
                      disabled={!onMonthShift}
                      className="min-h-11 min-w-11 rounded-[14px] border-[var(--border)] bg-[var(--surface-elevated)] px-0 text-[var(--foreground)] hover:border-[var(--border-hover)] hover:bg-[var(--card-hover)] disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.03] dark:text-white"
                    >
                      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M6 3.5 10.5 8 6 12.5" />
                      </svg>
                    </Button>
                  </div>

                  <div className="hidden rounded-[20px] border border-emerald-500/18 bg-emerald-50 px-4 py-3 md:block md:min-w-[290px] dark:border-emerald-400/14 dark:bg-emerald-400/[0.05]">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-emerald-700/70 dark:text-white/40">
                          Completion To Date
                        </p>
                        <p className="mt-2 text-sm font-medium text-[var(--foreground)] dark:text-white/86">
                          {completionSummaryText}
                        </p>
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="text-[11px] font-semibold tabular-nums text-emerald-700/70 dark:text-white/72">
                          {counts.submitted}/{elapsedWorkingDays || 0}
                        </p>
                        <p className="mt-1 text-lg font-semibold tabular-nums text-emerald-600 dark:text-emerald-300">
                          {monthProgressPct.toFixed(0)}%
                        </p>
                      </div>
                    </div>

                    <div className="mt-3">
                      <CompletionBar pct={monthProgressPct} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(290px,330px)] lg:items-start">
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
                  <Badge variant="success" dot className="w-full justify-start rounded-[16px] px-3.5 py-2 text-[10px] uppercase tracking-[0.18em] sm:w-auto">
                    {counts.submitted} updated
                  </Badge>
                  <Badge variant="danger" dot className="w-full justify-start rounded-[16px] px-3.5 py-2 text-[10px] uppercase tracking-[0.18em] sm:w-auto">
                    {counts.missing} missed
                  </Badge>
                  <Badge variant="secondary" className="w-full justify-start rounded-[16px] px-3.5 py-2 text-[10px] uppercase tracking-[0.18em] sm:w-auto">
                    {attentionDays} attention
                  </Badge>
                  <Badge variant="secondary" className="col-span-2 w-full justify-start rounded-[16px] px-3.5 py-2 text-[10px] uppercase tracking-[0.18em] sm:col-span-1 sm:w-auto">
                    <span className="truncate">Next: {nextDayLabel}</span>
                  </Badge>
                </div>

                <div className="rounded-[20px] border border-emerald-500/18 bg-emerald-50 px-4 py-3 md:hidden dark:border-emerald-400/14 dark:bg-emerald-400/[0.05]">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-emerald-700/70 dark:text-white/40">
                        Completion To Date
                      </p>
                      <p className="mt-2 text-sm font-medium text-[var(--foreground)] dark:text-white/86">
                        {completionSummaryText}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-[11px] font-semibold tabular-nums text-emerald-700/70 dark:text-white/72">
                        {counts.submitted}/{elapsedWorkingDays || 0}
                      </p>
                      <p className="mt-1 text-lg font-semibold tabular-nums text-emerald-600 dark:text-emerald-300">
                        {monthProgressPct.toFixed(0)}%
                      </p>
                    </div>
                  </div>

                  <div className="mt-3">
                    <CompletionBar pct={monthProgressPct} />
                  </div>
                </div>
              </div>
            </div>

            <div className="calendar-board-scroll mt-4 -mx-2 px-2 pb-3 sm:mx-0 sm:px-0 sm:pb-1">
              <div className="min-w-[736px] pr-1 sm:min-w-[768px]">
                <div className="grid grid-cols-7 gap-2">
                  {weekdayLabels.map((label) => (
                    <div
                      key={label}
                      className="cal-weekday-header rounded-full border px-3 py-3 text-center text-[10px] font-bold uppercase tracking-[0.26em] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
                    >
                      {label}
                    </div>
                  ))}
                </div>

                <div className="mt-2.5 space-y-2.5">
                  {calendarWeeks.map((week, weekIndex) => (
                    <div key={`week-${weekIndex + 1}`} className="grid grid-cols-7 gap-2">
                      {week.map((day, dayIndex) => {
                        if (!day) {
                          return (
                            <div
                              key={`empty-${weekIndex}-${dayIndex}`}
                              className="cal-day-neutral min-h-28.5 rounded-[20px] border border-dashed opacity-40"
                              aria-hidden="true"
                            />
                          )
                        }

                        const entryCount = getEntryCount(day)
                        const isSelected = selectedKey === day.date
                        const isToday = day.date === todayKey

                        return (
                          <button
                            key={day.date}
                            type="button"
                            onClick={() => setSelectedDate(day.date)}
                            aria-pressed={isSelected}
                            className={cn(
                              'group relative flex min-h-[152px] min-w-0 flex-col overflow-hidden rounded-[20px] border px-3 py-2.5 text-left transition-all duration-200',
                              getDaySurfaceClass(day),
                              isSelected
                                ? 'border-violet-400/65 ring-2 ring-violet-400/55 ring-offset-2 ring-offset-[var(--background)] shadow-[0_0_0_1px_rgba(167,139,250,0.20),0_18px_40px_rgba(8,8,12,0.34)]'
                                : 'hover:-translate-y-[1px] hover:border-white/14',
                              isToday && !isSelected && 'shadow-[inset_0_0_0_1px_rgba(125,211,252,0.24)]',
                            )}
                            title={`${isSelected ? 'Selected: ' : ''}${formatLongDate(day.date)}: ${getStatusLabel(day.status, day)}`}
                          >
                            <span className={cn('absolute inset-x-3.5 top-0 h-[2px] rounded-full', getDayAccentClass(day))} />
                            <span className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),transparent_42%)] opacity-0 transition group-hover:opacity-100" />

                            <div className="relative flex items-start justify-between gap-3">
                              <div>
                                <p className={cn('text-[10px] font-bold uppercase tracking-[0.24em] opacity-40', getDayTextClass(day))}>
                                  {getBoardWeekday(day)}
                                </p>
                                <p
                                  className={cn(
                                    'mt-1.5 text-[1.5rem] font-semibold leading-none tabular-nums tracking-tight',
                                    day.status === 'submitted' || day.status === 'missing' ? 'text-[var(--foreground)] dark:text-white' : 'text-[var(--foreground)]/82 dark:text-white/82',
                                  )}
                                >
                                  {day.day}
                                </p>
                              </div>

                              <div className="flex flex-col items-end gap-1.5">
                                {entryCount > 0 ? (
                                  <span className="inline-flex min-w-7 items-center justify-center rounded-full border border-[var(--border)] bg-white/80 px-2 py-0.75 text-[9px] font-semibold tabular-nums text-[var(--muted-strong)] dark:border-white/10 dark:bg-white/[0.06] dark:text-white/72">
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

                            {shouldShowTimePanel(day) ? (
                              <div className="relative mt-2.5 space-y-1.5">
                                <div className="grid grid-cols-2 gap-1.5">
                                  <div className="rounded-[12px] border border-[var(--border)] bg-white/85 px-2 py-1.5 dark:border-white/10 dark:bg-white/[0.04]">
                                    <p className="text-[8px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)] dark:text-white/44">
                                      In
                                    </p>
                                    <p className="mt-1 text-[11px] font-semibold tabular-nums text-[var(--foreground)] dark:text-white">
                                      {formatWorkTime(day.checkInTime)}
                                    </p>
                                  </div>
                                  <div className="rounded-[12px] border border-[var(--border)] bg-white/85 px-2 py-1.5 dark:border-white/10 dark:bg-white/[0.04]">
                                    <p className="text-[8px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)] dark:text-white/44">
                                      Out
                                    </p>
                                    <p className="mt-1 text-[11px] font-semibold tabular-nums text-[var(--foreground)] dark:text-white">
                                      {formatWorkTime(day.checkOutTime)}
                                    </p>
                                  </div>
                                </div>
                                <p className="text-[9px] font-medium uppercase tracking-[0.12em] text-[var(--muted-strong)] dark:text-white/76">
                                  {getWorkedDurationLabel(day)}
                                </p>
                              </div>
                            ) : null}

                            <div className="relative mt-auto">
                              <span
                                className={cn(
                                  'inline-flex max-w-full items-center gap-1 rounded-full border px-2.5 py-0.75 text-[9px] font-semibold uppercase tracking-[0.14em]',
                                  getDayPillClass(day),
                                )}
                              >
                                <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', getDayDotClass(day))} />
                                {getCalendarCellStatusLabel(day.status, day)}
                              </span>
                              <p className="mt-1.5 text-[8px] leading-3 text-[var(--muted-strong)] dark:text-white/76">
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

            <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px] text-[var(--muted)]">
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
                Updated
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm border border-rose-500/30 bg-rose-500/20" />
                Missed
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm border border-[var(--border)] bg-white dark:border-white/10 dark:bg-white/4" />
                Open or upcoming
              </span>
            </div>
            <div className="mt-5 rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] p-4 sm:p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      'grid h-18 w-18 shrink-0 place-items-center rounded-[22px] border text-[1.75rem] font-semibold tabular-nums shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
                      getDayFocusClass(selectedDay),
                    )}
                  >
                    {selectedDay?.day ?? '--'}
                  </div>

                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-blue-300/72">
                      Focus Day
                    </p>
                    <h4 className="mt-2 text-lg font-semibold tracking-tight text-(--foreground)">
                      {selectedLabel}
                    </h4>
                    <p className="mt-1.5 max-w-2xl text-[13px] leading-6 text-[var(--muted)]">
                      {selectedDay ? getDaySummary(selectedDay) : 'Pick a date from the month grid to inspect details.'}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedDay ? (
                        <Badge variant={getStatusVariant(selectedDay.status, selectedDay)} dot>
                          {getStatusLabel(selectedDay.status, selectedDay)}
                        </Badge>
                      ) : null}
                      {selectedDay?.weekdayLabel ? (
                        <Badge variant="secondary">{selectedDay.weekdayLabel}</Badge>
                      ) : null}
                      {selectedDay?.date === todayKey ? (
                        <Badge variant="blue">Today</Badge>
                      ) : null}
                      {selectedDay?.hasUpdate ? (
                        <Badge variant="violet">Payload available</Badge>
                      ) : null}
                      {selectedDay?.workdayOverride ? (
                        <Badge variant={isHolidayDay(selectedDay) ? 'blue' : 'warning'}>
                          {getSpecialDayLabel(selectedDay) ?? 'Special day'}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 xl:min-w-[420px] xl:max-w-[480px]">
                  <div className="rounded-[18px] border border-(--border) bg-(--muted-surface) px-3 py-3 text-[12px] text-[var(--muted)]">
                    <p>Status</p>
                    <p className="mt-1 font-medium text-(--foreground)">
                      {selectedDay ? getStatusLabel(selectedDay.status, selectedDay) : 'N/A'}
                    </p>
                  </div>
                  <div className="rounded-[18px] border border-(--border) bg-(--muted-surface) px-3 py-3 text-[12px] text-[var(--muted)]">
                    <p>Submission</p>
                    <p className="mt-1 font-medium text-(--foreground)">
                      {selectedDay?.hasUpdate ? 'Available' : 'None'}
                    </p>
                  </div>
                  <div className="rounded-[18px] border border-(--border) bg-(--muted-surface) px-3 py-3 text-[12px] text-[var(--muted)]">
                    <p>Validation</p>
                    <p
                      className={cn(
                        'mt-1 font-medium',
                        selectedDay?.isValid === false
                          ? 'text-amber-300'
                          : selectedDay?.isValid === true
                            ? 'text-emerald-300'
                            : 'text-(--foreground)',
                      )}
                    >
                      {selectedDay?.isValid === false ? 'Needs review' : selectedDay?.isValid === true ? 'Valid' : 'N/A'}
                    </p>
                  </div>
                  <div className="rounded-[18px] border border-(--border) bg-(--muted-surface) px-3 py-3 text-[12px] text-[var(--muted)]">
                    <p>Entries</p>
                    <p className="mt-1 font-medium text-(--foreground)">
                      {selectedDay ? getEntryCount(selectedDay) : 0}
                    </p>
                  </div>
                </div>
              </div>

              {shouldShowFocusContent ? (
                <div className="mt-4 rounded-[20px] border border-(--border) bg-(--surface) p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--muted)]">
                        {selectedDay?.hasUpdate ? 'Update Content' : 'Special Day'}
                      </p>
                      <h4 className="mt-2 text-base font-semibold tracking-tight text-(--foreground)">
                        {selectedDay?.hasUpdate ? 'Returned content for this date' : 'Details for this date'}
                      </h4>
                    </div>
                    {selectedDay?.hasUpdate ? (
                      <Badge variant="blue">API payload</Badge>
                    ) : selectedDay?.workdayOverride ? (
                      <Badge variant={isHolidayDay(selectedDay) ? 'blue' : 'warning'}>
                        {getSpecialDayLabel(selectedDay) ?? 'Special day'}
                      </Badge>
                    ) : null}
                  </div>

                  <div className="mt-4 max-h-[320px] overflow-y-auto rounded-[18px] border border-(--border) bg-(--muted-surface) p-4">
                    <p className="whitespace-pre-wrap text-[13px] leading-6 text-(--foreground)">
                      {focusDetailText}
                    </p>
                  </div>

                  {selectedDay?.isValid === false ? (
                    <p className="mt-3 text-xs text-amber-300">
                      This update was returned with an invalid flag by the API.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
