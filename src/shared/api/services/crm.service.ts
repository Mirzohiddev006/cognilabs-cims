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
  page?: number
  page_size?: number
  total_items?: number
  total_pages?: number
  status_stats: Record<string, number>
  status_dict: Record<string, number>
  status_percentages: Record<string, number>
  status_choices: Array<{ value: string; label: string }>
  permissions: string[]
  selected_status: string
  period_stats: Record<string, number>
}

type CrmDashboardParams = {
  search?: string
  status_filter?: string
  show_all?: boolean
  page?: number
  page_size?: number
}

function createEmptyDashboardResponse(customers: CustomerSummary[]): CrmDashboardResponse {
  return {
    customers,
    page: 1,
    page_size: customers.length,
    total_items: customers.length,
    total_pages: 1,
    status_stats: {},
    status_dict: {},
    status_percentages: {},
    status_choices: [],
    permissions: [],
    selected_status: '',
    period_stats: {},
  }
}

function dedupeCustomers(customers: CustomerSummary[]) {
  const seen = new Map<number, CustomerSummary>()

  for (const customer of customers) {
    seen.set(customer.id, customer)
  }

  return Array.from(seen.values())
}

export const crmService = {
  latest(limit = 50) {
    return request<CustomerSummary[]>({
      path: '/crm/customers/latest',
      query: { limit },
    })
  },

  dashboard(params?: CrmDashboardParams) {
    return request<CrmDashboardResponse>({
      path: '/crm/dashboard',
      query: params,
    })
  },

  async dashboardWithAllCustomers(pageSize = 50) {
    try {
      const firstPage = await this.dashboard({ page: 1, page_size: pageSize })
      const totalPages = Math.max(firstPage.total_pages ?? 1, 1)

      if (totalPages <= 1) {
        return {
          ...firstPage,
          customers: dedupeCustomers(firstPage.customers),
          total_items: firstPage.total_items ?? firstPage.customers.length,
          total_pages: 1,
        }
      }

      const remainingPages = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, index) =>
          this.dashboard({ page: index + 2, page_size: pageSize }),
        ),
      )

      const customers = dedupeCustomers([
        ...firstPage.customers,
        ...remainingPages.flatMap((page) => page.customers),
      ])

      return {
        ...firstPage,
        customers,
        page: 1,
        page_size: customers.length,
        total_items: firstPage.total_items ?? customers.length,
        total_pages: totalPages,
      }
    } catch {
      const customers = await this.latest(500)
      return createEmptyDashboardResponse(dedupeCustomers(customers))
    }
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
      path: '/crm/stats',
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
