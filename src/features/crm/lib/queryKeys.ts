export const crmKeys = {
  all: ['crm'] as const,
  dashboard: () => [...crmKeys.all, 'dashboard'] as const,
  customers: (params?: string | Record<string, unknown>) =>
    params ? ([...crmKeys.all, 'customers', params] as const) : ([...crmKeys.all, 'customers'] as const),
  customer: (id: number | string) => [...crmKeys.all, 'customer', id] as const,
  charts: (params?: { days?: number; customerType?: string }) =>
    [...crmKeys.all, 'charts', params] as const,
  leads: (params?: Record<string, unknown>) =>
    params ? ([...crmKeys.all, 'leads', params] as const) : ([...crmKeys.all, 'leads'] as const),
}
