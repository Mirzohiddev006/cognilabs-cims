import { request } from '../http'
import type {
  ConversionRateResponse,
  CreateResponse,
  CustomerPeriodReportResponse,
  CustomerStatsResponse,
  CustomerStatusSummaryResponse,
  CustomerSummary,
  DynamicStatusOption,
  SalesDashboardChartsResponse,
  SalesStatsResponse,
  SuccessResponse,
} from '../types'

export type CustomerPeriodReportParams = {
  period?: string
  search?: string
  status_filter?: string
  from_date?: string
  to_date?: string
}

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
    const firstPage = await this.dashboard({ page: 1, page_size: pageSize, show_all: true })
    const totalPages = Math.max(firstPage.total_pages ?? 1, 1)

    if (totalPages <= 1) {
      return firstPage
    }

    const remainingPages = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, index) =>
        this.dashboard({ page: index + 2, page_size: pageSize, show_all: true }),
      ),
    )

    return {
      ...firstPage,
      customers: [
        ...firstPage.customers,
        ...remainingPages.flatMap((page) => page.customers),
      ],
      page: 1,
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

  basicView(limit = 50) {
    return request<CustomerSummary[]>({
      path: '/crm/customers/bazakorinish',
      query: { limit },
    })
  },

  periodStats() {
    return request<unknown>({
      path: '/crm/stats/period',
    })
  },

  filterByDate(start_date: string, end_date?: string) {
    return request<CustomerSummary[]>({
      path: '/crm/customers/filter/date',
      query: { start_date, end_date },
    })
  },

  statusSummary() {
    return request<CustomerStatusSummaryResponse>({
      path: '/crm/customers/stats/summary',
    })
  },

  periodReport(params?: CustomerPeriodReportParams) {
    return request<CustomerPeriodReportResponse>({
      path: '/crm/customers/report/period',
      query: params,
    })
  },

  salesStats(customer_type?: string) {
    return request<SalesStatsResponse>({
      path: '/sales/stats',
      query: { customer_type },
    })
  },

  detailedSales(days = 30, customer_type?: string) {
    return request<unknown>({
      path: '/sales/detailed',
      query: { days, customer_type },
    })
  },

  salesDashboardCharts(params?: {
    days?: number
    customer_type?: string
    platform_limit?: number
  }) {
    return request<SalesDashboardChartsResponse>({
      path: '/sales/dashboard/charts',
      query: params,
    })
  },

  conversionRate() {
    return request<ConversionRateResponse>({
      path: '/crm/conversion-rate',
    })
  },

  internationalLeads(limit = 50) {
    return request<unknown[]>({
      path: '/sales/international',
      query: { limit },
    })
  },

  salesManagers() {
    return request<unknown>({
      path: '/crm/sales-managers',
    })
  },

  assignSalesManager(payload: Record<string, unknown>) {
    return request<SuccessResponse>({
      path: '/crm/assign-sales-manager',
      method: 'POST',
      body: payload,
    })
  },

  customerSalesManager(customerId: number) {
    return request<unknown>({
      path: `/crm/customer/${customerId}/sales-manager`,
    })
  },

  salesManagerStats(params?: {
    from_date?: string
    to_date?: string
    sales_manager_id?: number
  }) {
    return request<unknown>({
      path: '/crm/sales-manager/stats',
      query: params,
    })
  },
}
