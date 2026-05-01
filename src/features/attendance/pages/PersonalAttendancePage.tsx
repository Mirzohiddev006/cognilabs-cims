import { useState } from 'react'
import { attendanceService } from '../../../shared/api/services/attendance.service'
import { useAsyncData } from '../../../shared/hooks/useAsyncData'
import { Card } from '../../../shared/ui/card'
import { PageHeader } from '../../../shared/ui/page-header'
import { SectionTitle } from '../../../shared/ui/section-title'
import { LoadingStateBlock, ErrorStateBlock } from '../../../shared/ui/state-block'
import { Badge } from '../../../shared/ui/badge'

type NormalizedDay = {
  date: string
  checkIn: string | null
  checkOut: string | null
  workedHours: number
  status: string
}

type NormalizedWeek = {
  weekNumber: number
  workedHours: number
  days: NormalizedDay[]
}

type NormalizedOfficeTime = {
  year: number
  month: number
  totalWorkedHours: number
  weeks: NormalizedWeek[]
}

function resolveNum(obj: Record<string, unknown>, ...keys: string[]): number {
  for (const key of keys) {
    const val = obj[key]
    if (typeof val === 'number' && isFinite(val)) return val
    if (typeof val === 'string' && val.trim() !== '') {
      const parsed = parseFloat(val)
      if (isFinite(parsed)) return parsed
    }
  }
  return 0
}

function resolveStr(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const val = obj[key]
    if (typeof val === 'string' && val.trim()) return val.trim()
  }
  return ''
}

function normalizeDay(raw: unknown): NormalizedDay {
  const d = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  return {
    date: resolveStr(d, 'date', 'attendance_date'),
    checkIn: resolveStr(d, 'check_in', 'check_in_time') || null,
    checkOut: resolveStr(d, 'check_out', 'check_out_time') || null,
    workedHours: resolveNum(d, 'worked_hours', 'worked_hours_decimal', 'hours'),
    status: resolveStr(d, 'status') || 'unknown',
  }
}

function normalizeWeek(raw: unknown, index: number): NormalizedWeek {
  const w = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  return {
    weekNumber: resolveNum(w, 'week_number', 'week') || index + 1,
    workedHours: resolveNum(w, 'worked_hours', 'worked_hours_decimal', 'total_hours', 'hours'),
    days: Array.isArray(w.days) ? w.days.map(normalizeDay) : [],
  }
}

function normalizeOfficeTime(raw: unknown): NormalizedOfficeTime | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>

  const weeks: NormalizedWeek[] = Array.isArray(obj.weeks)
    ? obj.weeks.map(normalizeWeek)
    : []

  return {
    year: resolveNum(obj, 'year'),
    month: resolveNum(obj, 'month'),
    totalWorkedHours: resolveNum(obj, 'total_worked_hours', 'total_hours', 'worked_hours_decimal'),
    weeks,
  }
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function PersonalAttendancePage() {
  const [date, setDate] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() + 1 }
  })

  const query = useAsyncData(
    async () => {
      const raw = await attendanceService.getOfficeTimeMe(date.year, date.month)
      return normalizeOfficeTime(raw)
    },
    [date.year, date.month],
  )

  const data = query.data

  const nextMonth = () => setDate(prev =>
    prev.month === 12 ? { year: prev.year + 1, month: 1 } : { ...prev, month: prev.month + 1 },
  )
  const prevMonth = () => setDate(prev =>
    prev.month === 1 ? { year: prev.year - 1, month: 12 } : { ...prev, month: prev.month - 1 },
  )

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        eyebrow="Member / Attendance"
        title="My Attendance"
        description="Track your monthly office time and weekly progress."
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={prevMonth}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--muted-strong)] transition hover:bg-[var(--accent-soft)]"
          >
            ←
          </button>
          <h2 className="min-w-[148px] text-center text-xl font-bold text-[var(--foreground)]">
            {MONTHS[date.month - 1]} {date.year}
          </h2>
          <button
            onClick={nextMonth}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--muted-strong)] transition hover:bg-[var(--accent-soft)]"
          >
            →
          </button>
        </div>

        {data && (
          <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 px-6 py-3 text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Total Hours</p>
            <p className="text-2xl font-black text-blue-500">{data.totalWorkedHours.toFixed(1)}h</p>
          </div>
        )}
      </div>

      {query.isLoading ? (
        <LoadingStateBlock eyebrow="Attendance" title="Loading attendance..." description="Please wait while we fetch your records." />
      ) : query.isError ? (
        <ErrorStateBlock eyebrow="Attendance" title="Failed to load attendance" description="There was an error retrieving your records." />
      ) : !data || data.weeks.length === 0 ? (
        <Card className="px-6 py-10 text-center text-sm text-[var(--muted-strong)]">
          No attendance data found for this period.
        </Card>
      ) : (
        <div className="grid gap-6">
          {data.weeks.map(week => (
            <Card key={week.weekNumber} className="overflow-hidden rounded-[24px] border-[var(--border)]">
              <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--muted-surface)]/30 px-6 py-4">
                <SectionTitle
                  title={`Week ${week.weekNumber}`}
                  description="Daily breakdown for this week"
                />
                <Badge variant="blue" className="px-3 py-1">{week.workedHours.toFixed(1)}h</Badge>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--muted-surface)]/10 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Check In</th>
                      <th className="px-6 py-4">Check Out</th>
                      <th className="px-6 py-4 text-right">Worked Hours</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {week.days.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-4 text-center text-xs text-[var(--muted-strong)]">No days recorded.</td>
                      </tr>
                    ) : week.days.map((day, i) => (
                      <tr key={day.date || i} className="group transition-colors hover:bg-[var(--accent-soft)]/5">
                        <td className="px-6 py-4 text-sm font-medium text-[var(--foreground)]">
                          {day.date
                            ? new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                            : '—'}
                        </td>
                        <td className="px-6 py-4">
                          <Badge
                            variant={day.status === 'present' ? 'success' : day.status === 'absent' ? 'danger' : 'secondary'}
                            className="capitalize"
                          >
                            {day.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-sm text-[var(--muted-strong)]">
                          {day.checkIn
                            ? (() => { try { return new Date(day.checkIn!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) } catch { return day.checkIn } })()
                            : '—'}
                        </td>
                        <td className="px-6 py-4 text-sm text-[var(--muted-strong)]">
                          {day.checkOut
                            ? (() => { try { return new Date(day.checkOut!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) } catch { return day.checkOut } })()
                            : '—'}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-bold text-[var(--foreground)]">
                          {day.workedHours > 0 ? `${day.workedHours.toFixed(1)}h` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
