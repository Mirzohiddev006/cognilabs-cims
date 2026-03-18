import { useMemo, useState } from 'react'
import type { DayStatus } from '../../../shared/api/types'
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
  return new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date(2024, month - 1))
}

function formatLongDate(date: string) {
  const parsed = new Date(date)

  if (Number.isNaN(parsed.getTime())) {
    return date
  }

  return parsed.toLocaleDateString('en-US', {
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

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(parsed)
}

function getStatusLabel(status: DayStatus) {
  if (status === 'submitted') return 'Submitted'
  if (status === 'missing') return 'Missing'
  if (status === 'sunday') return 'Sunday'
  if (status === 'future') return 'Upcoming'
  return 'Open'
}

function getStatusVariant(status: DayStatus) {
  if (status === 'submitted') return 'success' as const
  if (status === 'missing') return 'danger' as const
  if (status === 'sunday') return 'warning' as const
  if (status === 'future') return 'secondary' as const
  return 'outline' as const
}

function getCalendarCellStatusLabel(status: DayStatus) {
  if (status === 'submitted') return 'Logged'
  if (status === 'missing') return 'Missed'
  if (status === 'sunday') return 'Off Day'
  if (status === 'future') return 'Soon'
  return 'Open'
}

function getCalendarCellHint(day: MemberMonthlyUpdateDay) {
  if (day.hasUpdate) return 'Update captured'
  if (day.status === 'missing') return 'Needs submission'
  if (day.status === 'sunday') return 'Weekend'
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
  if (day.status === 'missing') return 'Needs submission'
  if (day.status === 'sunday') return 'Weekend day'
  if (day.status === 'future') return 'Awaiting date'
  return 'No explicit status returned'
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

  if (day.status === 'missing') return 'No update was submitted for this working day.'
  if (day.status === 'sunday') return 'This day is marked as Sunday.'
  if (day.status === 'future') return 'This date is still in the future.'
  return 'No update content was returned by the API for this date.'
}

function getQueueEyebrow(day: MemberMonthlyUpdateDay, todayKey: string, selectedDate: string | null) {
  if (day.date === selectedDate) return 'Selected'
  if (day.date === todayKey) return 'Today'
  if (day.status === 'missing') return 'Needs action'
  if (day.status === 'submitted') return 'Completed'
  if (day.status === 'future') return 'Upcoming'
  return 'Calendar day'
}

function getQueueDays(calendar: MemberMonthlyUpdateCalendar, todayKey: string, selectedDate: string | null) {
  const selectedDay = selectedDate
    ? calendar.days.find((day) => day.date === selectedDate) ?? null
    : null
  const todayDay = calendar.days.find((day) => day.date === todayKey) ?? null
  const missingDays = calendar.days
    .filter((day) => day.status === 'missing')
    .sort((left, right) => right.date.localeCompare(left.date))
  const submittedDays = calendar.days
    .filter((day) => day.status === 'submitted')
    .sort((left, right) => right.date.localeCompare(left.date))
  const upcomingDays = calendar.days
    .filter((day) => day.status === 'future')
    .sort((left, right) => left.date.localeCompare(right.date))

  const seen = new Set<string>()
  const result: MemberMonthlyUpdateDay[] = []

  for (const day of [selectedDay, todayDay, ...missingDays, ...submittedDays, ...upcomingDays]) {
    if (!day || seen.has(day.date)) {
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
        else if (day.status === 'sunday') accumulator.sunday += 1
        else if (day.status === 'future') accumulator.upcoming += 1
        else accumulator.open += 1

        return accumulator
      },
      { submitted: 0, missing: 0, sunday: 0, upcoming: 0, open: 0 },
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
      calendar.days.find((day) => day.date === todayKey) ??
      calendar.days.find((day) => day.hasUpdate) ??
      calendar.days.find((day) => day.status === 'submitted') ??
      calendar.days.find((day) => day.status === 'missing') ??
      calendar.days[0] ??
      null
    )
  }, [calendar.days, selectedDate, todayKey])

  const selectedKey = selectedDay?.date ?? null
  const selectedLabel = selectedDay ? formatLongDate(selectedDay.date) : 'No date selected'
  const queueDays = useMemo(
    () => getQueueDays(calendar, todayKey, selectedKey),
    [calendar, selectedKey, todayKey],
  )
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
  const elapsedWorkingDays = counts.submitted + counts.missing + counts.open
  const attentionDays = counts.missing + counts.open
  const monthProgressPct = elapsedWorkingDays > 0
    ? (counts.submitted / elapsedWorkingDays) * 100
    : 0
  const selectedMonthName = getMonthName(calendar.month)
  const focusDetailText = getFocusDetailText(selectedDay)

  return (
    <div className={cn('grid items-start gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.92fr)]', className)}>
      <div className="cal-inner overflow-hidden rounded-[28px] border">
        <div className="border-b border-(--border) px-5 py-4">
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
              <Badge variant="warning" dot>{counts.sunday} sundays</Badge>
              {counts.upcoming > 0 ? <Badge variant="secondary">{counts.upcoming} upcoming</Badge> : null}
            </div>
          </div>
        </div>

        <div className="px-5 py-4">
          <div className="cal-container rounded-[28px] border p-3 sm:p-4">
            <div className="cal-inner overflow-hidden rounded-[28px] border p-4 sm:p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div className="max-w-xl">
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

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onMonthShift?.(-1)}
                    disabled={!onMonthShift}
                    className="min-h-9 rounded-full border-white/10 bg-white/[0.03] px-3 disabled:opacity-50"
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
                    className="min-h-9 rounded-full border-emerald-400/18 bg-emerald-400/10 px-4 text-emerald-50 hover:border-emerald-300/30 hover:bg-emerald-400/14 disabled:opacity-50"
                  >
                    Today
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onMonthShift?.(1)}
                    disabled={!onMonthShift}
                    className="min-h-9 rounded-full border-white/10 bg-white/[0.03] px-3 disabled:opacity-50"
                  >
                    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M6 3.5 10.5 8 6 12.5" />
                    </svg>
                  </Button>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Badge variant="success" dot className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.18em]">
                  {counts.submitted} logged
                </Badge>
                <Badge variant="danger" dot className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.18em]">
                  {counts.missing} missed
                </Badge>
                <Badge variant="secondary" className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.18em]">
                  {attentionDays} attention
                </Badge>
                <Badge variant="secondary" className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.18em]">
                  Next:{' '}
                  {nextUpcomingDay
                    ? `${getShortWeekday(nextUpcomingDay)} ${nextUpcomingDay.day}`
                    : latestSubmittedDay
                      ? `${getShortWeekday(latestSubmittedDay)} ${latestSubmittedDay.day}`
                      : 'None'}
                </Badge>

                <div className="ml-auto flex w-full items-center gap-3 rounded-full border border-white/8 bg-white/[0.04] px-3 py-2 sm:w-auto sm:min-w-[250px]">
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/36">
                      Completion To Date
                    </p>
                    <p className="mt-1 text-[11px] text-white/72">
                      {elapsedWorkingDays > 0
                        ? `${counts.submitted} of ${elapsedWorkingDays} elapsed workdays logged.`
                        : 'No elapsed workdays yet.'}
                    </p>
                  </div>

                  <div className="w-22 shrink-0">
                    <div className="mb-1 flex items-center justify-between text-[10px] text-white/68">
                      <span>{counts.submitted}/{elapsedWorkingDays || 0}</span>
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
                      className="cal-weekday-header rounded-full border px-3 py-3 text-center text-[10px] font-bold uppercase tracking-[0.26em] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
                    >
                      {label}
                    </div>
                  ))}
                </div>

                <div className="mt-2.5 space-y-2.5">
                  {calendarWeeks.map((week, weekIndex) => (
                    <div key={`week-${weekIndex + 1}`} className="grid grid-cols-[68px_repeat(7,minmax(104px,1fr))] gap-2">
                      <div className="cal-day-neutral flex min-h-28.5 flex-col items-center justify-center rounded-[20px] border px-2 py-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                        <span className="cal-text-neutral text-[9px] font-bold uppercase tracking-[0.26em] opacity-50">Week</span>
                        <span className="mt-2 text-base font-semibold tabular-nums opacity-80">{weekIndex + 1}</span>
                      </div>

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
                              'group relative flex min-h-[114px] min-w-0 flex-col overflow-hidden rounded-[20px] border px-3.5 py-2.5 text-left transition-all duration-200',
                              dayStyle[day.status],
                              isSelected
                                ? 'border-violet-400/65 ring-2 ring-violet-400/55 ring-offset-2 ring-offset-[var(--background)] shadow-[0_0_0_1px_rgba(167,139,250,0.20),0_18px_40px_rgba(8,8,12,0.34)]'
                                : 'hover:-translate-y-[1px] hover:border-white/14',
                              isToday && !isSelected && 'shadow-[inset_0_0_0_1px_rgba(125,211,252,0.24)]',
                            )}
                            title={`${isSelected ? 'Selected: ' : ''}${formatLongDate(day.date)}: ${getStatusLabel(day.status)}`}
                          >
                            <span className={cn('absolute inset-x-3.5 top-0 h-[2px] rounded-full', dayAccentStyle[day.status])} />
                            <span className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),transparent_42%)] opacity-0 transition group-hover:opacity-100" />

                            <div className="relative flex items-start justify-between gap-3">
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/34">
                                  {getBoardWeekday(day)}
                                </p>
                                <p
                                  className={cn(
                                    'mt-1.5 text-[1.75rem] font-semibold leading-none tabular-nums tracking-tight',
                                    day.status === 'submitted' || day.status === 'missing' ? 'text-white' : 'text-white/82',
                                  )}
                                >
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
                              <span
                                className={cn(
                                  'inline-flex max-w-full items-center gap-1 rounded-full border px-2.5 py-0.75 text-[9px] font-semibold uppercase tracking-[0.14em]',
                                  dayPillStyle[day.status],
                                )}
                              >
                                <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', dayDotStyle[day.status])} />
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
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div className="cal-inner overflow-hidden rounded-[28px] border">
          <div className="border-b border-(--border) px-5 py-4">
            <h3 className="cal-heading text-[1.55rem] font-semibold tracking-tight">
              Focus Day
            </h3>
            <p className="mt-1.5 text-[13px] text-[var(--muted)]">
              Selected-date inspector with status, validation, and returned content.
            </p>
          </div>

          <div className="space-y-4 px-5 py-4">
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  'grid h-18 w-18 shrink-0 place-items-center rounded-[22px] border text-[1.75rem] font-semibold tabular-nums shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
                  selectedDay ? dayFocusStyle[selectedDay.status] : dayFocusStyle.neutral,
                )}
              >
                {selectedDay?.day ?? '--'}
              </div>

              <div className="min-w-0">
                <h4 className="text-base font-semibold tracking-tight text-(--foreground)">
                  {selectedLabel}
                </h4>
                <p className="mt-1 text-[12px] leading-5 text-[var(--muted)]">
                  {selectedDay ? getDaySummary(selectedDay) : 'Pick a date from the month grid to inspect details.'}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedDay ? (
                    <Badge variant={getStatusVariant(selectedDay.status)} dot>
                      {getStatusLabel(selectedDay.status)}
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
                </div>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-[18px] border border-(--border) bg-(--muted-surface) px-3 py-3 text-[12px] text-[var(--muted)]">
                <p>Status</p>
                <p className="mt-1 font-medium text-(--foreground)">
                  {selectedDay ? getStatusLabel(selectedDay.status) : 'N/A'}
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

            <div className="rounded-[20px] border border-(--border) bg-(--surface) p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--muted)]">
                    {selectedDay?.hasUpdate ? 'Update Content' : 'Day Note'}
                  </p>
                  <h4 className="mt-2 text-base font-semibold tracking-tight text-(--foreground)">
                    {selectedDay?.hasUpdate ? 'Returned content for this date' : 'No returned content for this date'}
                  </h4>
                </div>
                {selectedDay?.hasUpdate ? <Badge variant="blue">API payload</Badge> : null}
              </div>

              <div className="mt-4 max-h-[280px] overflow-y-auto rounded-[18px] border border-(--border) bg-(--muted-surface) p-4">
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
          </div>
        </div>

        <div className="cal-inner overflow-hidden rounded-[28px] border">
          <div className="border-b border-(--border) px-5 py-4">
            <h3 className="cal-heading text-[1.55rem] font-semibold tracking-tight">
              Action Queue
            </h3>
            <p className="mt-1.5 text-[13px] text-[var(--muted)]">
              Recent misses, today, and the next upcoming dates stay one click away.
            </p>
          </div>

          <div className="space-y-2.5 px-5 py-4">
            {queueDays.length > 0 ? queueDays.map((day) => (
              <button
                key={`queue-${day.date}`}
                type="button"
                onClick={() => setSelectedDate(day.date)}
                className={cn(
                  'w-full rounded-[18px] border px-3.5 py-3 text-left transition',
                  selectedKey === day.date
                    ? 'border-violet-400/45 bg-violet-500/[0.08] shadow-[0_10px_24px_rgba(76,29,149,0.20)]'
                    : 'border-white/8 bg-white/[0.02] hover:border-white/14 hover:bg-white/[0.04]',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--muted)]">
                      {getQueueEyebrow(day, todayKey, selectedKey)}
                    </p>
                    <p className="mt-1 text-sm font-semibold tracking-tight text-(--foreground)">
                      {formatLongDate(day.date)}
                    </p>
                    <p className={cn('mt-1 text-[11px] leading-5', dayStatusTextStyle[day.status])}>
                      {getCalendarCellHint(day)}
                    </p>
                  </div>

                  <Badge variant={getStatusVariant(day.status)} size="sm" dot>
                    {getCalendarCellStatusLabel(day.status)}
                  </Badge>
                </div>
              </button>
            )) : (
              <div className="rounded-[18px] border border-dashed border-(--border) bg-(--card) px-4 py-5 text-sm text-(--muted)">
                No highlighted days in this range.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
