import { request } from '../http'
import type {
  ConversionRateResponse,
  CreateResponse,
  CustomerStatsResponse,
  CustomerSummary,
  DynamicStatusOption,
  SalesStatsResponse,
  SuccessResponse,
} from '../types'

export type CrmDashboardResponse = {
  customers: CustomerSummary[]
  status_stats: Record<string, number>
  status_dict: Record<string, number>
  status_percentages: Record<string, number>
  status_choices: Array<{ value: string; label: string }>
  permissions: string[]
  selected_status: string
  period_stats: Record<string, number>
}

export const crmService = {
  latest(limit = 50) {
    return request<CustomerSummary[]>({
      path: '/crm/customers/latest',
      query: { limit },
    })
  },

  dashboard(params?: { search?: string; status_filter?: string; show_all?: boolean }) {
    return request<CrmDashboardResponse>({
      path: '/crm/dashboard',
      query: params,
    })
  },

  detail(customerId: number) {
    return request<CustomerSummary>({
      path: `/crm/detail/${customerId}`,
    })
  },

  dynamicStatuses() {
    return request<DynamicStatusOption[]>({
      path: '/crm/statuses/dynamic',
    })
  },

  createCustomer(formData: FormData) {
    return request<CreateResponse>({
      path: '/crm/customers',
      method: 'POST',
      body: formData,
    })
  },

  updateCustomer(customerId: number, formData: FormData) {
    return request<SuccessResponse>({
      path: `/crm/customers/${customerId}`,
      method: 'PUT',
      body: formData,
    })
  },

  patchCustomer(customerId: number, formData: FormData) {
    return request<SuccessResponse>({
      path: `/crm/customers/${customerId}`,
      method: 'PATCH',
      body: formData,
    })
  },

  deleteCustomer(customerId: number) {
    return request<SuccessResponse>({
      path: `/crm/customers/${customerId}`,
      method: 'DELETE',
    })
  },

  bulkDelete(customerIds: number[]) {
    return request<SuccessResponse>({
      path: '/crm/customers/bulk-delete',
      method: 'DELETE',
      body: { customer_ids: customerIds },
    })
  },

  filterByStatus(status: string) {
    return request<CustomerSummary[]>({
      path: '/crm/customers/filter/status',
      query: { status_filter: status },
    })
  },

  filterByPlatform(platform: string) {
    return request<CustomerSummary[]>({
      path: '/crm/customers/filter/platform',
      query: { platform },
    })
  },

  summaryStats() {
    return request<CustomerStatsResponse>({
      path: '/crm/customers/stats/summary',
    })
  },

  salesStats(customer_type?: string) {
    return request<SalesStatsResponse>({
      path: '/sales/stats',
      query: { customer_type },
    })
  },

  conversionRate() {
    return request<ConversionRateResponse>({
      path: '/crm/conversion-rate',
    })
  },
}
