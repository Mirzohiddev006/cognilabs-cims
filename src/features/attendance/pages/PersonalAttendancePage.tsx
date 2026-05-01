import { useMemo, useState } from 'react'
import { attendanceService, type OfficeTimeMe } from '../../../shared/api/services/attendance.service'
import { useAsyncData } from '../../../shared/hooks/useAsyncData'
import { Card } from '../../../shared/ui/card'
import { PageHeader } from '../../../shared/ui/page-header'
import { SectionTitle } from '../../../shared/ui/section-title'
import { LoadingStateBlock, ErrorStateBlock } from '../../../shared/ui/state-block'
import { Badge } from '../../../shared/ui/badge'
import { cn } from '../../../shared/lib/cn'

export function PersonalAttendancePage() {
  const [date, setDate] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() + 1 }
  })

  const query = useAsyncData(
    () => attendanceService.getOfficeTimeMe(date.year, date.month),
    [date.year, date.month]
  )

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const nextMonth = () => {
    setDate(prev => {
      if (prev.month === 12) return { year: prev.year + 1, month: 1 }
      return { ...prev, month: prev.month + 1 }
    })
  }

  const prevMonth = () => {
    setDate(prev => {
      if (prev.month === 1) return { year: prev.year - 1, month: 12 }
      return { ...prev, month: prev.month - 1 }
    })
  }

  const data = query.data

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        eyebrow="Member / Attendance"
        title="My Attendance"
        description="Track your monthly office time and weekly progress."
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={prevMonth}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--muted-strong)] transition hover:bg-[var(--accent-soft)]"
          >
            ←
          </button>
          <h2 className="text-xl font-bold text-[var(--foreground)]">
            {months[date.month - 1]} {date.year}
          </h2>
          <button
            onClick={nextMonth}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--muted-strong)] transition hover:bg-[var(--accent-soft)]"
          >
            →
          </button>
        </div>

        {data && (
          <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 px-6 py-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Total Hours</p>
            <p className="text-2xl font-black text-blue-500">{data.total_worked_hours.toFixed(1)}h</p>
          </div>
        )}
      </div>

      {query.isLoading ? (
        <LoadingStateBlock eyebrow="Attendance" title="Loading attendance..." description="Please wait while we fetch your records." />
      ) : query.isError ? (
        <ErrorStateBlock eyebrow="Attendance" title="Failed to load attendance" description="There was an error retrieving your records." />
      ) : data ? (
        <div className="grid gap-6">
          {data.weeks.map(week => (
            <Card key={week.week_number} className="overflow-hidden rounded-[24px] border-[var(--border)]">
              <div className="border-b border-[var(--border)] bg-[var(--muted-surface)]/30 px-6 py-4 flex items-center justify-between">
                <SectionTitle
                  title={`Week ${week.week_number}`}
                  description="Daily breakdown for this week"
                />
                <Badge variant="blue" className="px-3 py-1">{week.worked_hours.toFixed(1)}h</Badge>
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
                    {week.days.map(day => (
                      <tr key={day.date} className="group hover:bg-[var(--accent-soft)]/5 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-[var(--foreground)]">
                          {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
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
                          {day.check_in ? new Date(day.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-[var(--muted-strong)]">
                          {day.check_out ? new Date(day.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-bold text-[var(--foreground)]">
                          {day.worked_hours > 0 ? `${day.worked_hours.toFixed(1)}h` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  )
}
