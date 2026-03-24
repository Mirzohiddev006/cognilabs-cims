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

export type UpdateMemberPenaltyPayload = {
  year: number
  month: number
  penaltyPoints: number
  reason?: string
}

export type UpdateMemberBonusPayload = {
  year: number
  month: number
  bonusAmount: number
  reason?: string
}

export type AddMemberUpdatePayload = {
  userId: number
  year: number
  month: string
  updatePercentage: number
  salaryAmount: number
  nextPaymentDate: string
  note: string
}

export type PutMemberUpdatePayload = {
  year: number
  month: string
  updatePercentage: number
  salaryAmount: number
  nextPaymentDate: string
  note: string
}

export type PatchMemberUpdatePayload = {
  updatePercentage?: number
  salaryAmount?: number
  nextPaymentDate?: string
  note?: string
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

  updatePenalty(penaltyId: number, { year, month, penaltyPoints, reason }: UpdateMemberPenaltyPayload) {
    return request<unknown>({
      path: `/members/member/penalties/${penaltyId}`,
      method: 'PUT',
      query: {
        year,
        month,
        penalty_points: penaltyPoints,
        reason,
      },
    })
  },

  deletePenalty(penaltyId: number) {
    return request<unknown>({
      path: `/members/member/penalties/${penaltyId}`,
      method: 'DELETE',
    })
  },

  updateBonus(bonusId: number, { year, month, bonusAmount, reason }: UpdateMemberBonusPayload) {
    return request<unknown>({
      path: `/members/member/bonuses/${bonusId}`,
      method: 'PUT',
      query: {
        year,
        month,
        bonus_amount: bonusAmount,
        reason,
      },
    })
  },

  deleteBonus(bonusId: number) {
    return request<unknown>({
      path: `/members/member/bonuses/${bonusId}`,
      method: 'DELETE',
    })
  },

  addMemberUpdate({ userId, year, month, updatePercentage, salaryAmount, nextPaymentDate, note }: AddMemberUpdatePayload) {
    return request<unknown>({
      path: '/members/member/update',
      method: 'POST',
      query: {
        user_id: userId,
        year,
        month,
        update_percentage: updatePercentage,
        salary_amount: salaryAmount,
        next_payment_date: nextPaymentDate,
        note,
      },
    })
  },

  getMyUpdates() {
    return request<unknown>({
      path: '/members/member/updates',
    })
  },

  putMemberUpdate(updateId: number, { year, month, updatePercentage, salaryAmount, nextPaymentDate, note }: PutMemberUpdatePayload) {
    return request<unknown>({
      path: `/members/member/update/${updateId}`,
      method: 'PUT',
      query: {
        year,
        month,
        update_percentage: updatePercentage,
        salary_amount: salaryAmount,
        next_payment_date: nextPaymentDate,
        note,
      },
    })
  },

  patchMemberUpdate(updateId: number, payload: PatchMemberUpdatePayload) {
    return request<unknown>({
      path: `/members/member/update/${updateId}`,
      method: 'PATCH',
      query: {
        update_percentage: payload.updatePercentage,
        salary_amount: payload.salaryAmount,
        next_payment_date: payload.nextPaymentDate,
        note: payload.note,
      },
    })
  },

  deleteMemberUpdate(updateId: number) {
    return request<unknown>({
      path: `/members/member/update/${updateId}`,
      method: 'DELETE',
    })
  },
}
