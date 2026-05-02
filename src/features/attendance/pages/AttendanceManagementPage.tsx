import { useState } from 'react'
import { attendanceService } from '../../../shared/api/services/attendance.service'
import { useAsyncData } from '../../../shared/hooks/useAsyncData'
import { Card } from '../../../shared/ui/card'
import { PageHeader } from '../../../shared/ui/page-header'
import { LoadingStateBlock, ErrorStateBlock } from '../../../shared/ui/state-block'
import { Badge } from '../../../shared/ui/badge'
import { Input } from '../../../shared/ui/input'
import { Button } from '../../../shared/ui/button'
import { Modal } from '../../../shared/ui/modal'

type NormalizedDay = {
  date: string
  checkIn: string | null
  checkOut: string | null
  workedHours: number
  status: string
}

type NormalizedEmployee = {
  employeeId: number
  fullName: string
  totalWorkedHours: number
  days: NormalizedDay[]
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
  const durationMinutes = resolveNum(d, 'duration_minutes')
  const workedHours =
    resolveNum(d, 'worked_hours', 'worked_hours_decimal', 'hours') ||
    (durationMinutes > 0 ? durationMinutes / 60 : 0)
  const checkIn = resolveStr(d, 'check_in_time', 'check_in') || null
  return {
    date: resolveStr(d, 'date', 'attendance_date'),
    checkIn,
    checkOut: resolveStr(d, 'check_out_time', 'check_out') || null,
    workedHours,
    status: checkIn ? 'present' : resolveStr(d, 'status') || 'absent',
  }
}

function normalizeEmployee(raw: unknown): NormalizedEmployee {
  const e = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>

  // Support nested employee / monthly_stats objects (office-time-me style)
  const empObj = (e.employee && typeof e.employee === 'object' ? e.employee : {}) as Record<string, unknown>
  const statsObj = (e.monthly_stats && typeof e.monthly_stats === 'object' ? e.monthly_stats : {}) as Record<string, unknown>

  const employeeId =
    resolveNum(e, 'employee_id', 'id', 'user_id') ||
    resolveNum(empObj, 'id', 'employee_id')

  const fullName =
    resolveStr(e, 'full_name', 'fullName', 'employee_name') ||
    resolveStr(empObj, 'full_name', 'fullName', 'name') ||
    [resolveStr(e, 'first_name', 'name'), resolveStr(e, 'last_name', 'surname')].filter(Boolean).join(' ') ||
    `Employee #${employeeId || '?'}`

  const totalWorkedHours =
    resolveNum(e, 'total_worked_hours', 'total_hours', 'worked_hours_decimal', 'total_hours_decimal') ||
    resolveNum(statsObj, 'total_hours')

  // Days can be at root, or distributed across weekly_stats entries
  let days: NormalizedDay[] = []
  if (Array.isArray(e.days)) {
    days = (e.days as unknown[]).map(normalizeDay)
  } else if (Array.isArray(e.weekly_stats)) {
    days = (e.weekly_stats as unknown[]).flatMap(w => {
      const ws = (w && typeof w === 'object' ? w : {}) as Record<string, unknown>
      return Array.isArray(ws.days) ? (ws.days as unknown[]).map(normalizeDay) : []
    })
  }

  return { employeeId, fullName, totalWorkedHours, days }
}

function extractEmployeeList(raw: unknown): NormalizedEmployee[] {
  if (Array.isArray(raw)) return raw.map(normalizeEmployee)
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>
    for (const key of ['employees', 'items', 'data', 'results', 'records']) {
      if (Array.isArray(obj[key])) return (obj[key] as unknown[]).map(normalizeEmployee)
    }
  }
  return []
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function AttendanceManagementPage() {
  const [date, setDate] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() + 1 }
  })
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<NormalizedEmployee | null>(null)

  const query = useAsyncData(
    async () => {
      const raw = await attendanceService.getEmployeeMonthlyOfficeTime(date.year, date.month)
      console.log('[AttendanceManagement] raw API response:', raw)
      const list = extractEmployeeList(raw)
      console.log('[AttendanceManagement] normalized employees:', list)
      return list
    },
    [date.year, date.month],
  )

  const employees = query.data ?? []
  const filtered = employees.filter(e =>
    e.fullName.toLowerCase().includes(search.toLowerCase()),
  )

  const nextMonth = () => setDate(prev =>
    prev.month === 12 ? { year: prev.year + 1, month: 1 } : { ...prev, month: prev.month + 1 },
  )
  const prevMonth = () => setDate(prev =>
    prev.month === 1 ? { year: prev.year - 1, month: 12 } : { ...prev, month: prev.month - 1 },
  )

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        eyebrow="CEO / Management"
        title="Attendance Management"
        description="Monitor team presence and office time."
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={prevMonth}>←</Button>
          <h2 className="min-w-[148px] text-center text-base font-bold text-[var(--foreground)]">
            {MONTHS[date.month - 1]} {date.year}
          </h2>
          <Button variant="secondary" size="sm" onClick={nextMonth}>→</Button>
        </div>
        <div className="w-full max-w-xs">
          <Input
            placeholder="Search employee..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-10"
          />
        </div>
      </div>

      {query.isLoading ? (
        <LoadingStateBlock eyebrow="Attendance" title="Loading attendance data..." />
      ) : query.isError ? (
        <ErrorStateBlock eyebrow="Attendance" title="Failed to load attendance data" description="Check that the attendance API is reachable." />
      ) : filtered.length === 0 ? (
        <Card className="px-6 py-10 text-center text-sm text-[var(--muted-strong)]">
          {employees.length === 0 ? 'No attendance data for this period.' : 'No employees match your search.'}
        </Card>
      ) : (
        <div className="overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--surface)] shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--muted-surface)]/30 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4 text-center">Worked Hours</th>
                  <th className="px-6 py-4">Last Status</th>
                  <th className="px-6 py-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filtered.map(item => {
                  const lastDay = item.days.length > 0 ? item.days[item.days.length - 1] : null
                  return (
                    <tr key={item.employeeId} className="group transition-colors hover:bg-[var(--accent-soft)]/5">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--accent-soft)] text-sm font-bold text-blue-500">
                            {item.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[var(--foreground)]">{item.fullName}</p>
                            <p className="text-xs text-[var(--muted-strong)]">ID: {item.employeeId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-black text-blue-500">
                          {item.totalWorkedHours.toFixed(1)}h
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {lastDay ? (
                          <Badge
                            variant={lastDay.status === 'present' ? 'success' : 'secondary'}
                            className="capitalize"
                          >
                            {lastDay.status}
                          </Badge>
                        ) : (
                          <span className="text-xs text-[var(--muted-strong)]">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="sm" onClick={() => setSelected(item)}>
                          View History
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selected && (
        <Modal
          open
          onClose={() => setSelected(null)}
          title={`${selected.fullName} — Attendance`}
          description={`${MONTHS[date.month - 1]} ${date.year} · Detailed Logs`}
          size="xl"
        >
          {selected.days.length === 0 ? (
            <p className="py-6 text-center text-sm text-[var(--muted-strong)]">No daily records found.</p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-[var(--border)]">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--muted-surface)]/30 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Check In</th>
                    <th className="px-4 py-3">Check Out</th>
                    <th className="px-4 py-3 text-right">Hours</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {selected.days.map((day, i) => (
                    <tr key={day.date || i} className="hover:bg-[var(--accent-soft)]/5">
                      <td className="px-4 py-3 text-sm font-medium text-[var(--foreground)]">{day.date || '—'}</td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={day.status === 'present' ? 'success' : day.status === 'absent' ? 'danger' : 'secondary'}
                          size="sm"
                          className="capitalize"
                        >
                          {day.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--muted-strong)]">{day.checkIn || '—'}</td>
                      <td className="px-4 py-3 text-xs text-[var(--muted-strong)]">{day.checkOut || '—'}</td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-[var(--foreground)]">
                        {day.workedHours > 0 ? `${day.workedHours.toFixed(1)}h` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}
