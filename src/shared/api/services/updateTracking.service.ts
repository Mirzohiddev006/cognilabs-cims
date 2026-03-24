import { request } from '../http'
import type { CompanyStatsResponse, UpdateTrackingStats } from '../types'

export type WorkdayOverrideDayType = 'holiday' | 'short_day' | (string & {})

export type WorkdayOverrideMemberOption = {
  id: number
  name: string
  surname: string
  full_name: string
  role: string
  telegram_id?: string | null
}

export type WorkdayOverrideRecord = {
  id: number
  special_date: string
  day_type: WorkdayOverrideDayType
  title: string
  note?: string | null
  target_type: string
  member_id?: number | null
  member_name?: string | null
  workday_hours?: string | null
  update_required: boolean
  created_by: number
  created_at: string
  updated_at: string
}

export type CreateWorkdayOverridePayload = {
  special_date: string
  day_type: WorkdayOverrideDayType
  title: string
  note?: string
  applies_to_all: boolean
  member_ids?: number[]
  workday_hours?: number
  update_required: boolean
}

export type UpdateWorkdayOverridePayload = {
  special_date: string
  day_type: WorkdayOverrideDayType
  title: string
  note?: string
  applies_to_all: boolean
  member_id?: number | null
  workday_hours?: number
  update_required: boolean
}

export type WorkdayOverrideListParams = {
  month?: number
  year?: number
  startDate?: string
  endDate?: string
}

export const updateTrackingService = {
  myStats() {
    return request<UpdateTrackingStats>({
      path: '/update-tracking/stats/me',
    })
  },

  myProfile() {
    return request<unknown>({
      path: '/update-tracking/my-profile',
    })
  },

  myReport(month?: number, year?: number) {
    return request<unknown>({
      path: '/update-tracking/my-report',
      query: { month, year },
    })
  },

  myCombinedReport(month?: number, year?: number) {
    return request<unknown>({
      path: '/update-tracking/my-combined-report',
      query: { month, year },
    })
  },

  monthlyReport(month?: number, year?: number) {
    return request<unknown>({
      path: '/update-tracking/my-monthly-report',
      query: { month, year },
    })
  },

  calendar(month?: number, year?: number) {
    return request<unknown>({
      path: '/update-tracking/my-daily-calendar',
      query: { month, year },
    })
  },

  trends() {
    return request<unknown>({
      path: '/update-tracking/my-trends',
    })
  },

  recent(limit = 20, userId?: number) {
    return request<unknown>({
      path: '/update-tracking/recent',
      query: { limit, user_id: userId },
    })
  },

  processDailyNotifications(targetDate?: string) {
    return request<string>({
      path: '/update-tracking/process-daily-notifications',
      method: 'POST',
      query: { target_date: targetDate },
    })
  },

  missing(date?: string) {
    return request<unknown>({
      path: '/update-tracking/missing',
      query: { date_check: date },
    })
  },

  companyStats() {
    return request<CompanyStatsResponse>({
      path: '/update-tracking/company-stats',
    })
  },

  teamMonthly(month?: number, year?: number) {
    return request<unknown>({
      path: '/update-tracking/all-users-updates',
      query: { month, year },
    })
  },

  employeeMonthlyUpdates(year: number, month: number, employeeId?: number) {
    return request<unknown>({
      path: '/update-tracking/employee-monthly-updates',
      query: { year, month, employee_id: employeeId },
    })
  },

  workdayOverrideMemberOptions() {
    return request<WorkdayOverrideMemberOption[]>({
      path: '/update-tracking/workday-overrides/member-options',
    })
  },

  workdayOverrides(params?: WorkdayOverrideListParams) {
    return request<WorkdayOverrideRecord[]>({
      path: '/update-tracking/workday-overrides',
      query: {
        month: params?.month,
        year: params?.year,
        start_date: params?.startDate,
        end_date: params?.endDate,
      },
    })
  },

  createWorkdayOverride(payload: CreateWorkdayOverridePayload) {
    return request<{
      message: string
      items: WorkdayOverrideRecord[]
    }>({
      path: '/update-tracking/workday-overrides',
      method: 'POST',
      body: payload,
    })
  },

  updateWorkdayOverride(overrideId: number, payload: UpdateWorkdayOverridePayload) {
    return request<WorkdayOverrideRecord>({
      path: `/update-tracking/workday-overrides/${overrideId}`,
      method: 'PUT',
      body: payload,
    })
  },

  deleteWorkdayOverride(overrideId: number) {
    return request<string>({
      path: `/update-tracking/workday-overrides/${overrideId}`,
      method: 'DELETE',
    })
  },
}
