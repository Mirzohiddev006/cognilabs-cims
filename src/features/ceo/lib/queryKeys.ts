export const ceoKeys = {
  all: ['ceo'] as const,
  dashboard: () => [...ceoKeys.all, 'dashboard'] as const,
  messages: () => [...ceoKeys.all, 'messages'] as const,
  payments: () => [...ceoKeys.all, 'payments'] as const,
  companyPayments: () => [...ceoKeys.all, 'company-payments'] as const,
  users: () => [...ceoKeys.all, 'users'] as const,
  user: (id: number) => [...ceoKeys.users(), id] as const,
  teamUpdates: () => [...ceoKeys.all, 'team-updates'] as const,
  teamMemberOptions: () => [...ceoKeys.all, 'team-member-options'] as const,
  teamHistory: (year: number, month: number, employeeIdsStr = '') =>
    [...ceoKeys.all, 'team-history', year, month, employeeIdsStr] as const,
  teamMonthly: (month: number, year: number) => [...ceoKeys.all, 'team-monthly', month, year] as const,
  missingToday: (dateKey: string) => [...ceoKeys.all, 'missing-today', dateKey] as const,
  teamStats: (year: number, month: number, employeeIdsStr = '') =>
    [...ceoKeys.all, 'team-stats', year, month, employeeIdsStr] as const,
  teamSalary: (year: number, month: number, employeeIdsStr = '') =>
    [...ceoKeys.all, 'team-salary', year, month, employeeIdsStr] as const,
  teamWorkdayOverrides: (month: number, year: number) =>
    [...ceoKeys.all, 'team-workday-overrides', month, year] as const,
  workdayOverrides: () => [...ceoKeys.all, 'workday-overrides'] as const,
  cimsTeam: () => [...ceoKeys.all, 'cims-team'] as const,
  analytics: (params?: object) => [...ceoKeys.all, 'analytics', params] as const,
  realtimeAnalytics: () => [...ceoKeys.all, 'realtime-analytics'] as const,
  management: {
    pages: () => [...ceoKeys.all, 'management', 'pages'] as const,
    statuses: () => [...ceoKeys.all, 'management', 'statuses'] as const,
    roles: () => [...ceoKeys.all, 'management', 'roles'] as const,
    images: (params?: object) => [...ceoKeys.all, 'management', 'images', params] as const,
    imageDetail: (id: string | null) => [...ceoKeys.all, 'management', 'image', id] as const,
  },
}
