import { request } from '../http'
import type { CompanyStatsResponse, UpdateTrackingStats } from '../types'

export const updateTrackingService = {
  myStats() {
    return request<UpdateTrackingStats>({
      path: '/update-tracking/stats/me',
    })
  },

  myProfile() {
    return request<string>({
      path: '/update-tracking/my-profile',
    })
  },

  monthlyReport(month?: number, year?: number) {
    return request<string>({
      path: '/update-tracking/my-monthly-report',
      query: { month, year },
    })
  },

  calendar(month?: number, year?: number) {
    return request<string>({
      path: '/update-tracking/my-daily-calendar',
      query: { month, year },
    })
  },

  trends() {
    return request<string>({
      path: '/update-tracking/my-trends',
    })
  },

  recent(limit = 20, userId?: number) {
    return request<string>({
      path: '/update-tracking/recent',
      query: { limit, user_id: userId },
    })
  },

  missing(date?: string) {
    return request<string>({
      path: '/update-tracking/missing',
      query: { date_check: date },
    })
  },

  companyStats() {
    return request<CompanyStatsResponse>({
      path: '/update-tracking/company-stats',
    })
  },
}
