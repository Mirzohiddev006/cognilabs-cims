export const faultKeys = {
  all: ['faults'] as const,
  members: () => [...faultKeys.all, 'members'] as const,
  member: (id: number, year: number, month: number) =>
    [...faultKeys.all, 'member', id, year, month] as const,
  salaryEstimates: (year: number, month: number) =>
    [...faultKeys.all, 'salary-estimates', year, month] as const,
  compensationPolicy: (employeeIds: number[]) =>
    [...faultKeys.all, 'compensation-policy', ...employeeIds] as const,
  mistakes: (params: { year: number; month: number; employeeId?: number }) =>
    [...faultKeys.all, 'mistakes', params] as const,
  deliveryBonuses: (params: { year: number; month: number; employeeId?: number }) =>
    [...faultKeys.all, 'delivery-bonuses', params] as const,
  calendar: (year: number, month: number, userId: number) =>
    [...faultKeys.all, 'calendar', year, month, userId] as const,
  reviewerOptions: () => [...faultKeys.all, 'reviewer-options'] as const,
  projectOptions: () => [...faultKeys.all, 'project-options'] as const,
  allUsers: () => [...faultKeys.all, 'all-users'] as const,
}
