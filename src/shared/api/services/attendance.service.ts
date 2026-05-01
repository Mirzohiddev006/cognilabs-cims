import { request } from '../http'

export type AttendanceRecord = {
  id: number
  employee_id: number
  full_name: string
  email: string
  role: string
  role_name: string
  attendance_date: string
  check_in_time: string | null
  check_out_time: string | null
  created_by: number | null
  created_at: string
  updated_at: string
}

export type AttendanceRecordsResponse = {
  items: AttendanceRecord[]
  total_count: number
}

export type AttendanceUser = {
  id: number
  name: string
  surname: string
  email: string
}

export type AttendanceListResponse = {
  items: AttendanceRecord[]
  total_items: number
  page: number
  page_size: number
  total_pages: number
}

export type DailyRecord = {
  employee_id: number
  attendance_date: string
  check_in_time: string | null
  check_out_time: string | null
  worked_minutes: number
  worked_hours_decimal: number
  status: string
  shift_name: string | null
  source_system: string
  source_session_id: string | null
  is_manual: boolean
  note: string | null
  source_updated_at: string | null
}

export type MonthlyOfficeTime = {
  employee_id: number
  full_name: string
  total_worked_hours: number
  days: {
    date: string
    check_in: string | null
    check_out: string | null
    worked_hours: number
    status: string
  }[]
}

export type OfficeTimeMe = {
  employee: {
    id: number
    full_name: string
    role: string
  }
  period: {
    year: number
    month: number
    from: string
    to: string
  }
  days: {
    date: string
    weekday: string
    check_in_time: string | null
    check_out_time: string | null
    duration_minutes: number | null
    is_complete: boolean
  }[]
  weekly_stats: {
    week_number: number
    week_label: string
    date_from: string
    date_to: string
    days_present: number
    total_minutes: number
    avg_daily_minutes: number
    total_hours: number
  }[]
  monthly_stats: {
    days_present: number
    days_complete: number
    total_minutes: number
    avg_daily_minutes: number
    total_hours: number
  }
}

export const attendanceService = {
  getUsers(search?: string) {
    return request<AttendanceUser[]>({
      path: '/attendance/users',
      query: { search },
    })
  },

  getRecords(params: { employee_id?: number; start_date?: string; end_date?: string }) {
    return request<AttendanceRecordsResponse>({
      path: '/attendance/records',
      query: params,
    })
  },

  createRecord(data: Partial<AttendanceRecord>) {
    return request<AttendanceRecord>({
      path: '/attendance/records',
      method: 'POST',
      body: data,
    })
  },

  updateRecord(attendanceId: number, data: Partial<AttendanceRecord>) {
    return request<AttendanceRecord>({
      path: `/attendance/records/${attendanceId}`,
      method: 'PUT',
      body: data,
    })
  },

  deleteRecord(attendanceId: number) {
    return request<void>({
      path: `/attendance/records/${attendanceId}`,
      method: 'DELETE',
    })
  },

  getEmployeeMonthlyOfficeTime(year: number, month: number, employeeId?: number) {
    return request<MonthlyOfficeTime[]>({
      path: '/attendance/employee-monthly-office-time',
      query: { year, month, employee_id: employeeId },
    })
  },

  getOfficeTimeMe(year: number, month: number) {
    return request<OfficeTimeMe>({
      path: '/attendance/office-time-me',
      query: { year, month },
    })
  },

  getDailyRecords(params: {
    employee_id?: number
    date_from?: string
    date_to?: string
    status?: string
    page?: number
    page_size?: number
  }) {
    return request<{ items: DailyRecord[]; total_items: number; page: number; total_pages: number }>({
      path: '/attendance/daily-records',
      query: params,
    })
  },

  upsertDailyRecord(employeeId: number, date: string, data: Partial<DailyRecord>) {
    return request<DailyRecord>({
      path: `/attendance/daily-records/${employeeId}/${date}`,
      method: 'PUT',
      body: data,
    })
  },
}
