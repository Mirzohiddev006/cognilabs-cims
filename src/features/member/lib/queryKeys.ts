export const memberKeys = {
  all: ['member'] as const,
  dashboard: (userId: number, year: number, month: number) =>
    [...memberKeys.all, 'dashboard', userId, year, month] as const,
  stats: () => [...memberKeys.all, 'stats'] as const,
  salaryEstimate: (year: number, month: number) =>
    [...memberKeys.all, 'salary-estimate', year, month] as const,
  compensationPolicy: (employeeIds: number[]) =>
    [...memberKeys.all, 'compensation-policy', ...employeeIds] as const,
  mistakes: (params: { year: number; month: number; employeeId: number }) =>
    [...memberKeys.all, 'mistakes', params] as const,
  deliveryBonuses: (params: { year: number; month: number; employeeId: number }) =>
    [...memberKeys.all, 'delivery-bonuses', params] as const,
}
