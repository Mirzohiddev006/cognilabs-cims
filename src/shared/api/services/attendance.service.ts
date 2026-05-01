import { request } from '../http'

export type AttendanceRecord = {
  id: number
  employee_id: number
  attendance_date: string
  check_in_time: string | null
  check_out_time: string | null
  created_at: string
  updated_at: string
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
  year: number
  month: number
  total_worked_hours: number
  weeks: {
    week_number: number
    worked_hours: number
    days: {
      date: string
      check_in: string | null
      check_out: string | null
      worked_hours: number
      status: string
    }[]
  }[]
}

export const attendanceService = {
  getUsers(search?: string) {
    return request<AttendanceUser[]>({
      path: '/attendance/users',
      query: { search },
    })
  },

  getRecords(params: { employee_id?: number; start_date?: string; end_date?: string }) {
    return request<AttendanceRecord[]>({
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
