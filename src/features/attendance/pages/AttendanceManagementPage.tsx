import { useState } from 'react'
import { attendanceService, type MonthlyOfficeTime } from '../../../shared/api/services/attendance.service'
import { useAsyncData } from '../../../shared/hooks/useAsyncData'
import { Card } from '../../../shared/ui/card'
import { PageHeader } from '../../../shared/ui/page-header'
import { LoadingStateBlock, ErrorStateBlock } from '../../../shared/ui/state-block'
import { Badge } from '../../../shared/ui/badge'
import { Input } from '../../../shared/ui/input'
import { Button } from '../../../shared/ui/button'
import { Modal } from '../../../shared/ui/modal'

export function AttendanceManagementPage() {
  const [date, setDate] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() + 1 }
  })
  const [search, setSearch] = useState('')
  const [selectedEmployee, setSelectedEmployee] = useState<MonthlyOfficeTime | null>(null)

  const query = useAsyncData(
    () => attendanceService.getEmployeeMonthlyOfficeTime(date.year, date.month),
    [date.year, date.month]
  )

  const filteredData = query.data?.filter(item =>
    item.full_name.toLowerCase().includes(search.toLowerCase())
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

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        eyebrow="CEO / Management"
        title="Attendance Management"
        description="Monitor team presence and office time."
      />

      <Card className="p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Button variant="secondary" size="sm" onClick={prevMonth}>←</Button>
            <h2 className="text-lg font-bold min-w-[140px] text-center">
              {months[date.month - 1]} {date.year}
            </h2>
            <Button variant="secondary" size="sm" onClick={nextMonth}>→</Button>
          </div>

          <div className="flex flex-1 max-w-sm">
            <Input
              placeholder="Search employee..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10"
            />
          </div>
        </div>
      </Card>

      {query.isLoading ? (
        <LoadingStateBlock eyebrow="Attendance" title="Loading attendance data..." />
      ) : query.isError ? (
        <ErrorStateBlock eyebrow="Attendance" title="Failed to load attendance data" />
      ) : (
        <Card className="overflow-hidden rounded-[24px] border-[var(--border)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--muted-surface)]/30 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4 text-center">Worked Hours</th>
                  <th className="px-6 py-4">Status Today</th>
                  <th className="px-6 py-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredData?.map(item => (
                  <tr key={item.employee_id} className="group hover:bg-[var(--accent-soft)]/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-[var(--accent-soft)] grid place-items-center font-bold text-blue-500">
                          {item.full_name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[var(--foreground)]">{item.full_name}</p>
                          <p className="text-xs text-[var(--muted-strong)]">ID: {item.employee_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm font-black text-blue-500">
                        {item.total_worked_hours.toFixed(1)}h
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {item.days.length > 0 ? (
                        <Badge
                          variant={item.days[item.days.length - 1].status === 'present' ? 'success' : 'secondary'}
                          className="capitalize"
                        >
                          {item.days[item.days.length - 1].status}
                        </Badge>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                       <Button variant="ghost" size="sm" onClick={() => setSelectedEmployee(item)}>
                         View History
                       </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {selectedEmployee && (
        <Modal
          open={!!selectedEmployee}
          onClose={() => setSelectedEmployee(null)}
          title={`${selectedEmployee.full_name} - Attendance`}
          description={`${months[date.month - 1]} ${date.year} Detailed Logs`}
          size="xl"
        >
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
                {selectedEmployee.days.map(day => (
                  <tr key={day.date} className="hover:bg-[var(--accent-soft)]/5">
                    <td className="px-4 py-3 text-sm">{day.date}</td>
                    <td className="px-4 py-3">
                      <Badge variant={day.status === 'present' ? 'success' : 'secondary'} size="sm" className="capitalize">
                        {day.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--muted-strong)]">{day.check_in || '-'}</td>
                    <td className="px-4 py-3 text-xs text-[var(--muted-strong)]">{day.check_out || '-'}</td>
                    <td className="px-4 py-3 text-right text-sm font-bold">{day.worked_hours.toFixed(1)}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Modal>
      )}
    </div>
  )
}

