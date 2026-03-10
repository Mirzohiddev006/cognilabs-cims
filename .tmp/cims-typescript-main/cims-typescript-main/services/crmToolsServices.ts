import api from "@/lib/api";
import { CRM_STATUS_DEFINITIONS } from "@/lib/crm-statuses";

export interface StatusChoice {
  value: string;
  label: string;
}

export interface CustomerSummaryStats {
  total_customers: number;
  status_stats: Record<string, number>;
  status_percentages: Record<string, number>;
}

export interface CRMPeriodicStatusSummaryResponse {
  generated_at: string;
  today: CustomerSummaryStats;
  last_3_days: CustomerSummaryStats;
  last_7_days: CustomerSummaryStats;
  last_30_days: CustomerSummaryStats;
  last_90_days: CustomerSummaryStats;
}

export interface CustomerPeriodReportResponse {
  period: string;
  from_date: string;
  to_date: string;
  total_customers: number;
  customers: Array<Record<string, unknown>>;
  status_stats: Record<string, number>;
  status_dict: Record<string, number>;
  status_percentages: Record<string, number>;
}

export interface DynamicStatus {
  value: string;
  label: string;
  color?: string;
  order?: number;
}

export interface SalesManagerInfo {
  id: number;
  email: string;
  name: string;
  surname: string;
  assigned_leads_count: number;
}

export interface SalesManagerAssignmentPayload {
  customer_id: number;
  sales_manager_id: number;
}

export interface SalesManagerAssignmentResponse {
  id: number;
  customer_id: number;
  sales_manager_id: number;
  assigned_at: string;
  assigned_by: number;
  is_active: boolean;
}

export interface ConversionRateResponse {
  total_customers: number;
  project_started_count: number;
  conversion_rate: number;
  period: string;
}

export interface SalesStatsResponse {
  today: number;
  yesterday: number;
  this_week: number;
  last_week: number;
  customer_type: string | null;
}

export interface DetailedSalesResponse {
  summary: SalesStatsResponse;
  daily_breakdown: Array<{ date: string; count: number }>;
  date_range: string;
}

function normalizeList<T>(data: unknown): T[] {
  if (Array.isArray(data)) {
    return data as T[];
  }

  return [];
}

export async function fetchStatusSummary(): Promise<CRMPeriodicStatusSummaryResponse> {
  const { data } = await api.get<CRMPeriodicStatusSummaryResponse>(
    "/crm/customers/stats/summary",
  );
  return data;
}

export async function fetchPeriodReport(params: {
  period?: string;
  search?: string;
  status_filter?: string;
  from_date?: string;
  to_date?: string;
}): Promise<CustomerPeriodReportResponse> {
  const query = new URLSearchParams();
  if (params.period) query.set("period", params.period);
  if (params.search) query.set("search", params.search);
  if (params.status_filter) query.set("status_filter", params.status_filter);
  if (params.from_date) query.set("from_date", params.from_date);
  if (params.to_date) query.set("to_date", params.to_date);

  const { data } = await api.get<CustomerPeriodReportResponse>(
    `/crm/customers/report/period?${query.toString()}`,
  );
  return data;
}

export async function fetchDynamicStatuses(): Promise<DynamicStatus[]> {
  return CRM_STATUS_DEFINITIONS.map((status) => ({
    value: status.value,
    label: status.label,
    color: status.color,
    order: status.order,
  }));
}

export async function fetchSalesManagers(): Promise<SalesManagerInfo[]> {
  const { data } = await api.get<unknown>("/crm/sales-managers");
  return normalizeList<SalesManagerInfo>(data);
}

export async function assignSalesManager(
  payload: SalesManagerAssignmentPayload,
): Promise<SalesManagerAssignmentResponse> {
  const { data } = await api.post<SalesManagerAssignmentResponse>(
    "/crm/assign-sales-manager",
    payload,
  );
  return data;
}

export async function fetchCustomerSalesManager(
  customerId: number,
): Promise<string> {
  const { data } = await api.get<string>(
    `/crm/customer/${customerId}/sales-manager`,
  );
  return data;
}

export async function fetchConversionRate(): Promise<ConversionRateResponse> {
  const { data } = await api.get<ConversionRateResponse>("/crm/conversion-rate");
  return data;
}

export async function fetchSalesStats(
  customerType?: string,
): Promise<SalesStatsResponse> {
  const query = customerType ? `?customer_type=${encodeURIComponent(customerType)}` : "";
  const { data } = await api.get<SalesStatsResponse>(`/sales/stats${query}`);
  return data;
}

export async function fetchDetailedSales(params?: {
  days?: number;
  customer_type?: string;
}): Promise<DetailedSalesResponse> {
  const query = new URLSearchParams();
  if (params?.days) query.set("days", String(params.days));
  if (params?.customer_type) query.set("customer_type", params.customer_type);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const { data } = await api.get<DetailedSalesResponse>(`/sales/detailed${suffix}`);
  return data;
}

export async function fetchInternationalSales(limit = 50): Promise<Array<Record<string, unknown>>> {
  const { data } = await api.get<unknown>(`/sales/international?limit=${limit}`);
  return normalizeList<Record<string, unknown>>(data);
}
