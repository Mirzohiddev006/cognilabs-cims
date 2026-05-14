import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { attendanceService } from '../../../shared/api/services/attendance.service'
import { useAsyncData } from '../../../shared/hooks/useAsyncData'
import { Card } from '../../../shared/ui/card'
import { LoadingStateBlock, ErrorStateBlock } from '../../../shared/ui/state-block'
import { Badge } from '../../../shared/ui/badge'
import { Input } from '../../../shared/ui/input'
import { Button } from '../../../shared/ui/button'
import { Modal } from '../../../shared/ui/modal'
import { cn } from '../../../shared/lib/cn'
import {
  extractEmployeeAttendances,
  formatHours,
  formatIsoDate,
  formatTime,
  mergeEmployeeAttendances,
  type NormalizedEmployeeAttendance,
  statusVariant,
} from '../lib/attendance-normalizers'

type ViewMode = 'monthly' | 'weekly' | 'daily'

type DailyListItem = {
  employeeId: number
  fullName: string
  role: string
  status: string
  checkIn: string | null
  checkOut: string | null
  workedHours: number
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function buildMonthDate(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function getMonthRange(year: number, month: number) {
  const lastDay = new Date(year, month, 0).getDate()
  return {
    from: buildMonthDate(year, month, 1),
    to: buildMonthDate(year, month, lastDay),
  }
}

function buildInitialDailyDate(year: number, month: number) {
  const now = new Date()
  if (now.getFullYear() === year && now.getMonth() + 1 === month) {
    return buildMonthDate(year, month, now.getDate())
  }
  return buildMonthDate(year, month, 1)
}

function mergeDailyRows(
  employees: NormalizedEmployeeAttendance[],
  items: unknown,
): DailyListItem[] {
  const records = Array.isArray((items as { items?: unknown[] } | null)?.items)
    ? ((items as { items: unknown[] }).items)
    : []

  const recordMap = new Map<number, DailyListItem>()

  for (const record of records) {
    const employee = extractEmployeeAttendances([{ days: [record], ...(record as Record<string, unknown>) }])[0]
    if (!employee) continue

    const day = employee.days[0]
    recordMap.set(employee.employeeId, {
      employeeId: employee.employeeId,
      fullName: employee.fullName,
      role: employee.role,
      status: day?.status ?? employee.latestStatus,
      checkIn: day?.checkIn ?? null,
      checkOut: day?.checkOut ?? null,
      workedHours: day?.workedHours ?? 0,
    })
  }

  return employees
    .map(employee => {
      const record = recordMap.get(employee.employeeId)
      return {
        employeeId: employee.employeeId,
        fullName: employee.fullName,
        role: employee.role,
        status: record?.status ?? 'no_record',
        checkIn: record?.checkIn ?? null,
        checkOut: record?.checkOut ?? null,
        workedHours: record?.workedHours ?? 0,
      }
    })
}

function SegmentButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button
      data-ui-control="true"
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition',
        active
          ? 'border-blue-500/40 bg-blue-500/15 text-blue-400'
          : 'border-[var(--border)] bg-[var(--surface)] text-[var(--muted-strong)] hover:border-[var(--border-hover)] hover:bg-[var(--accent-soft)]',
      )}
    >
      {children}
    </button>
  )
}

export function AttendanceManagementPage() {
  const { t } = useTranslation()
  const [date, setDate] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() + 1 }
  })
  const [view, setView] = useState<ViewMode>('monthly')
  const [search, setSearch] = useState('')
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null)
  const [selectedDate, setSelectedDate] = useState(() => buildInitialDailyDate(new Date().getFullYear(), new Date().getMonth() + 1))
  const [selectedEmployee, setSelectedEmployee] = useState<NormalizedEmployeeAttendance | null>(null)

  const monthlyQuery = useAsyncData(
    async () => {
      const [summaryResult, officeTimeResult] = await Promise.allSettled([
        attendanceService.getMonthlySummary(date.year, date.month),
        attendanceService.getEmployeeMonthlyOfficeTime(date.year, date.month),
      ])

      const summaryItems = summaryResult.status === 'fulfilled'
        ? extractEmployeeAttendances(summaryResult.value)
        : []
      const officeItems = officeTimeResult.status === 'fulfilled'
        ? extractEmployeeAttendances(officeTimeResult.value)
        : []

      if (summaryResult.status === 'rejected' && officeTimeResult.status === 'rejected') {
        throw summaryResult.reason ?? officeTimeResult.reason
      }

      return mergeEmployeeAttendances(summaryItems, officeItems)
    },
    [date.year, date.month],
  )

  const dailyQuery = useAsyncData(
    () => attendanceService.getDailyRecords({
      date_from: selectedDate,
      date_to: selectedDate,
      page: 1,
      page_size: 200,
    }),
    [selectedDate, view],
    { enabled: view === 'daily' },
  )

  const employees = useMemo(() => monthlyQuery.data ?? [], [monthlyQuery.data])

  const filteredEmployees = useMemo(
    () => employees.filter(employee => employee.fullName.toLowerCase().includes(search.toLowerCase())),
    [employees, search],
  )

  const weekOptions = useMemo(() => {
    const map = new Map<number, { number: number; label: string }>()
    for (const employee of employees) {
      for (const week of employee.weeks) {
        if (!map.has(week.weekNumber)) {
          map.set(week.weekNumber, { number: week.weekNumber, label: week.label || t('attendance.week', 'Week {{number}}', { number: week.weekNumber }) })
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => a.number - b.number)
  }, [employees, t])

  const effectiveSelectedWeek = weekOptions.some(week => week.number === selectedWeek)
    ? selectedWeek
    : (weekOptions[0]?.number ?? null)

  const weeklyRows = useMemo(() => {
    if (effectiveSelectedWeek === null) return []

    return filteredEmployees
      .map(employee => {
        const week = employee.weeks.find(item => item.weekNumber === effectiveSelectedWeek)
        return {
          employee,
          week,
        }
      })
      .sort((a, b) => (b.week?.workedHours ?? 0) - (a.week?.workedHours ?? 0))
  }, [effectiveSelectedWeek, filteredEmployees])

  const dailyRows = useMemo(
    () => mergeDailyRows(filteredEmployees, dailyQuery.data),
    [dailyQuery.data, filteredEmployees],
  )

  const updateMonth = (year: number, month: number) => {
    setDate({ year, month })
    setSelectedDate(buildInitialDailyDate(year, month))
  }

  const nextMonth = () => {
    if (date.month === 12) {
      updateMonth(date.year + 1, 1)
      return
    }
    updateMonth(date.year, date.month + 1)
  }

  const prevMonth = () => {
    if (date.month === 1) {
      updateMonth(date.year - 1, 12)
      return
    }
    updateMonth(date.year, date.month - 1)
  }

  return (
    <div className="page-enter space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <SegmentButton active={view === 'monthly'} onClick={() => setView('monthly')}>{t('attendance.view.monthly', 'Monthly')}</SegmentButton>
        <SegmentButton active={view === 'weekly'} onClick={() => setView('weekly')}>{t('attendance.view.weekly', 'Weekly')}</SegmentButton>
        <SegmentButton active={view === 'daily'} onClick={() => setView('daily')}>{t('attendance.view.daily', 'Daily')}</SegmentButton>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={prevMonth}>{'<'}</Button>
          <h2 className="min-w-[160px] text-center text-base font-bold text-[var(--foreground)]">
            {t(`attendance.month.${date.month - 1}`, MONTHS[date.month - 1])} {date.year}
          </h2>
          <Button variant="secondary" size="sm" onClick={nextMonth}>{'>'}</Button>
        </div>

        <div className="flex flex-1 flex-col gap-3 lg:max-w-xl lg:flex-row lg:items-center lg:justify-end">
          {view === 'daily' ? (
            <Input
              type="date"
              value={selectedDate}
              min={getMonthRange(date.year, date.month).from}
              max={getMonthRange(date.year, date.month).to}
              onChange={event => setSelectedDate(event.target.value)}
              className="h-10 lg:max-w-[180px]"
            />
          ) : null}

          <div className="w-full lg:max-w-xs">
            <Input
              placeholder={t('attendance.search_employee', 'Search employee...')}
              value={search}
              onChange={event => setSearch(event.target.value)}
              className="h-10"
            />
          </div>
        </div>
      </div>

      {monthlyQuery.isLoading ? (
        <LoadingStateBlock eyebrow={t('attendance.eyebrow', 'Attendance')} title={t('attendance.loading_data', 'Loading attendance data...')} />
      ) : monthlyQuery.isError ? (
        <ErrorStateBlock eyebrow={t('attendance.eyebrow', 'Attendance')} title={t('attendance.failed_load_data', 'Failed to load attendance data')} description={t('attendance.check_api_reachable', 'Check that the attendance API is reachable.')} />
      ) : filteredEmployees.length === 0 ? (
        <Card className="px-6 py-10 text-center text-sm text-[var(--muted-strong)]">
          {employees.length === 0 ? t('attendance.no_data_period', 'No attendance data for this period.') : t('attendance.no_matches', 'No employees match your search.')}
        </Card>
      ) : (
        <>
          {view === 'monthly' ? (
            <div data-ui-surface="true" className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--muted-surface)]/30 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                      <th className="px-6 py-4">{t('attendance.table.employee', 'Employee')}</th>
                      <th className="px-6 py-4 text-center">{t('attendance.table.monthly_hours', 'Monthly Hours')}</th>
                      <th className="px-6 py-4 text-center">{t('attendance.table.days_present', 'Days Present')}</th>
                      <th className="px-6 py-4 text-center">{t('attendance.table.days_complete', 'Days Complete')}</th>
                      <th className="px-6 py-4">{t('attendance.table.last_status', 'Last Status')}</th>
                      <th className="px-6 py-4 text-right">{t('attendance.table.details', 'Details')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {filteredEmployees.map(item => (
                      <tr key={item.employeeId} className="transition-colors hover:bg-[var(--accent-soft)]/5">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--accent-soft)] text-sm font-bold text-blue-500">
                              {item.fullName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-[var(--foreground)]">{item.fullName}</p>
                              <p className="text-xs text-[var(--muted-strong)]">
                                ID: {item.employeeId}{item.role ? ` • ${item.role}` : ''}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center text-sm font-black text-blue-500">{formatHours(item.totalWorkedHours)}</td>
                        <td className="px-6 py-4 text-center text-sm text-[var(--foreground)]">{item.daysPresent}</td>
                        <td className="px-6 py-4 text-center text-sm text-[var(--foreground)]">{item.daysComplete}</td>
                        <td className="px-6 py-4">
                          <Badge variant={statusVariant(item.latestStatus)} className="capitalize">
                            {t(`attendance.status.${item.latestStatus}`, item.latestStatus)}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedEmployee(item)}>
                            {t('attendance.view_history', 'View History')}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {view === 'weekly' ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {weekOptions.map(week => (
                  <button
                    data-ui-control="true"
                    key={week.number}
                    type="button"
                    onClick={() => setSelectedWeek(week.number)}
                    className={cn(
                      'rounded-xl border px-3 py-2 text-sm font-semibold transition',
                      effectiveSelectedWeek === week.number
                        ? 'border-blue-500/40 bg-blue-500/15 text-blue-400'
                        : 'border-[var(--border)] bg-[var(--surface)] text-[var(--muted-strong)] hover:bg-[var(--accent-soft)]',
                    )}
                  >
                    {week.label}
                  </button>
                ))}
              </div>

              <div data-ui-surface="true" className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-lg">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-[var(--border)] bg-[var(--muted-surface)]/30 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                        <th className="px-6 py-4">{t('attendance.table.employee', 'Employee')}</th>
                        <th className="px-6 py-4 text-center">{t('attendance.table.week_hours', 'Week Hours')}</th>
                        <th className="px-6 py-4 text-center">{t('attendance.table.days_present', 'Days Present')}</th>
                        <th className="px-6 py-4 text-center">{t('attendance.table.avg_daily', 'Average / Day')}</th>
                        <th className="px-6 py-4 text-right">{t('attendance.table.details', 'Details')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {weeklyRows.map(({ employee, week }) => (
                        <tr key={employee.employeeId} className="transition-colors hover:bg-[var(--accent-soft)]/5">
                          <td className="px-6 py-4">
                            <p className="text-sm font-semibold text-[var(--foreground)]">{employee.fullName}</p>
                            <p className="text-xs text-[var(--muted-strong)]">
                              ID: {employee.employeeId}{employee.role ? ` • ${employee.role}` : ''}
                            </p>
                          </td>
                          <td className="px-6 py-4 text-center text-sm font-black text-blue-500">
                            {formatHours(week?.workedHours ?? 0)}
                          </td>
                          <td className="px-6 py-4 text-center text-sm text-[var(--foreground)]">{week?.daysPresent ?? 0}</td>
                          <td className="px-6 py-4 text-center text-sm text-[var(--foreground)]">
                            {formatHours(week?.avgDailyHours ?? 0)}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Button variant="ghost" size="sm" onClick={() => setSelectedEmployee(employee)}>
                              {t('attendance.view_history', 'View History')}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}

          {view === 'daily' ? (
            dailyQuery.isLoading ? (
              <LoadingStateBlock eyebrow={t('attendance.eyebrow', 'Attendance')} title={t('attendance.loading_daily', 'Loading daily attendance...')} />
            ) : dailyQuery.isError ? (
              <ErrorStateBlock eyebrow={t('attendance.eyebrow', 'Attendance')} title={t('attendance.failed_load_daily', 'Failed to load daily attendance')} description={t('attendance.api_error_daily', 'The daily records endpoint did not respond.')} />
            ) : (
              <div data-ui-surface="true" className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-lg">
                <div className="border-b border-[var(--border)] px-6 py-4">
                  <p className="text-sm font-semibold text-[var(--foreground)]">{t('attendance.daily_attendance_for', 'Daily attendance for {{date}}', { date: selectedDate })}</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-[var(--border)] bg-[var(--muted-surface)]/30 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                        <th className="px-6 py-4">{t('attendance.table.employee', 'Employee')}</th>
                        <th className="px-6 py-4">{t('attendance.table.status', 'Status')}</th>
                        <th className="px-6 py-4">{t('attendance.table.check_in', 'Check In')}</th>
                        <th className="px-6 py-4">{t('attendance.table.check_out', 'Check Out')}</th>
                        <th className="px-6 py-4 text-right">{t('attendance.table.hours', 'Hours')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {dailyRows.map(item => (
                        <tr key={item.employeeId} className="transition-colors hover:bg-[var(--accent-soft)]/5">
                          <td className="px-6 py-4">
                            <p className="text-sm font-semibold text-[var(--foreground)]">{item.fullName}</p>
                            <p className="text-xs text-[var(--muted-strong)]">
                              ID: {item.employeeId}{item.role ? ` • ${item.role}` : ''}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant={statusVariant(item.status)} className="capitalize">
                              {t(`attendance.status.${item.status}`, item.status)}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-sm text-[var(--muted-strong)]">{formatTime(item.checkIn)}</td>
                          <td className="px-6 py-4 text-sm text-[var(--muted-strong)]">{formatTime(item.checkOut)}</td>
                          <td className="px-6 py-4 text-right text-sm font-bold text-[var(--foreground)]">
                            {item.workedHours > 0 ? formatHours(item.workedHours) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          ) : null}
        </>
      )}

      {selectedEmployee ? (
        <Modal
          open
          onClose={() => setSelectedEmployee(null)}
          title={t('attendance.modal.title', '{{name}} - Attendance', { name: selectedEmployee.fullName })}
          description={t('attendance.modal.description', '{{month}} {{year}} - Weekly and daily breakdown', { month: MONTHS[date.month - 1], year: date.year })}
          size="xl"
        >
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Card className="rounded-xl px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">{t('attendance.table.monthly_hours', 'Monthly Hours')}</p>
                <p className="mt-2 text-xl font-black text-blue-500">{formatHours(selectedEmployee.totalWorkedHours)}</p>
              </Card>
              <Card className="rounded-xl px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">{t('attendance.table.days_present', 'Days Present')}</p>
                <p className="mt-2 text-xl font-black text-[var(--foreground)]">{selectedEmployee.daysPresent}</p>
              </Card>
              <Card className="rounded-xl px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">{t('attendance.table.days_complete', 'Days Complete')}</p>
                <p className="mt-2 text-xl font-black text-[var(--foreground)]">{selectedEmployee.daysComplete}</p>
              </Card>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold text-[var(--foreground)]">{t('attendance.weekly_breakdown', 'Weekly breakdown')}</p>
              {selectedEmployee.weeks.length === 0 ? (
                <Card className="px-4 py-6 text-center text-sm text-[var(--muted-strong)]">{t('attendance.no_weekly_records', 'No weekly records found.')}</Card>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {selectedEmployee.weeks.map(week => (
                    <Card key={`${week.weekNumber}-${week.dateFrom}`} className="rounded-xl px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[var(--foreground)]">{week.label || t('attendance.week', 'Week {{number}}', { number: week.weekNumber })}</p>
                          <p className="text-xs text-[var(--muted-strong)]">{week.dateFrom && week.dateTo ? `${week.dateFrom} - ${week.dateTo}` : t('attendance.weekly_summary', 'Weekly summary')}</p>
                        </div>
                        <Badge variant="blue">{formatHours(week.workedHours)}</Badge>
                      </div>
                      <div className="mt-4 flex items-center gap-4 text-xs text-[var(--muted-strong)]">
                        <span>{t('attendance.present', 'Present')}: {week.daysPresent}</span>
                        <span>{t('attendance.avg_daily', 'Avg/day')}: {formatHours(week.avgDailyHours)}</span>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold text-[var(--foreground)]">{t('attendance.daily_records', 'Daily records')}</p>
              {selectedEmployee.days.length === 0 ? (
                <Card className="px-4 py-6 text-center text-sm text-[var(--muted-strong)]">{t('attendance.no_daily_records', 'No daily records found.')}</Card>
              ) : (
                <div className="overflow-hidden rounded-xl border border-[var(--border)]">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-[var(--border)] bg-[var(--muted-surface)]/30 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                        <th className="px-4 py-3">{t('attendance.table.date', 'Date')}</th>
                        <th className="px-4 py-3">{t('attendance.table.status', 'Status')}</th>
                        <th className="px-4 py-3">{t('attendance.table.check_in', 'Check In')}</th>
                        <th className="px-4 py-3">{t('attendance.table.check_out', 'Check Out')}</th>
                        <th className="px-4 py-3 text-right">{t('attendance.table.hours', 'Hours')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {selectedEmployee.days.map((day, index) => (
                        <tr key={`${day.date}-${index}`} className="hover:bg-[var(--accent-soft)]/5">
                          <td className="px-4 py-3 text-sm font-medium text-[var(--foreground)]">
                            {day.date ? `${formatIsoDate(day.date)}${day.weekday ? ` (${day.weekday})` : ''}` : '-'}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={statusVariant(day.status)} size="sm" className="capitalize">
                              {t(`attendance.status.${day.status}`, day.status)}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-xs text-[var(--muted-strong)]">{formatTime(day.checkIn)}</td>
                          <td className="px-4 py-3 text-xs text-[var(--muted-strong)]">{formatTime(day.checkOut)}</td>
                          <td className="px-4 py-3 text-right text-sm font-bold text-[var(--foreground)]">
                            {day.workedHours > 0 ? formatHours(day.workedHours) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  )
}
