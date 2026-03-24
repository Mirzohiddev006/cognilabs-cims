import { request } from '../http'

function serializeEmployeeIds(employeeIds?: number[]) {
  if (!employeeIds || employeeIds.length === 0) {
    return undefined
  }

  return employeeIds.join(',')
}

export type MemberSalaryEstimateParams = {
  year: number
  month: number
  employeeIds?: number[]
}

export type AddMemberPenaltyPayload = {
  userId: number
  year: number
  month: number
  penaltyPoints: number
  reason?: string
}

export type AddMemberBonusPayload = {
  userId: number
  year: number
  month: number
  bonusAmount: number
  reason?: string
}

export const membersService = {
  salaryEstimate(userId: number, year: number, month: number) {
    return request<unknown>({
      path: '/members/member/salary-estimate',
      query: {
        user_id: userId,
        year,
        month,
      },
    })
  },

  salaryEstimates({ year, month, employeeIds }: MemberSalaryEstimateParams) {
    return request<unknown>({
      path: '/members/member/salary-estimates',
      query: {
        year,
        month,
        employee_ids: serializeEmployeeIds(employeeIds),
      },
    })
  },

  updatesStatistics(params?: {
    year?: number
    month?: number
    employeeIds?: number[]
  }) {
    return request<unknown>({
      path: '/members/member/updates/statistics',
      query: {
        year: params?.year,
        month: params?.month,
        employee_ids: serializeEmployeeIds(params?.employeeIds),
      },
    })
  },

  updatesAll(params?: {
    year?: number
    month?: number
    employeeIds?: number[]
  }) {
    return request<unknown>({
      path: '/members/member/updates/all',
      query: {
        year: params?.year,
        month: params?.month,
        employee_ids: serializeEmployeeIds(params?.employeeIds),
      },
    })
  },

  addPenalty({ userId, year, month, penaltyPoints, reason }: AddMemberPenaltyPayload) {
    return request<unknown>({
      path: '/members/member/penalties/add',
      method: 'POST',
      query: {
        user_id: userId,
        year,
        month,
        penalty_points: penaltyPoints,
        reason,
      },
    })
  },

  addBonus({ userId, year, month, bonusAmount, reason }: AddMemberBonusPayload) {
    return request<unknown>({
      path: '/members/member/bonuses/add',
      method: 'POST',
      query: {
        user_id: userId,
        year,
        month,
        bonus_amount: bonusAmount,
        reason,
      },
    })
  },
}
