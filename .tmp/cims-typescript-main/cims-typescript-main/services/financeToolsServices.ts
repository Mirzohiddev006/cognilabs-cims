import api from "@/lib/api";

export interface FinanceRecord {
  id: number;
  type: string;
  status: string;
  card: string;
  card_display?: string;
  service: string;
  summ: number;
  currency: string;
  date: string;
  donation?: number;
  donation_percentage?: number;
  tax_percentage?: number;
  exchange_rate?: number;
  transaction_status: string;
  initial_date?: string;
}

export interface FinanceListResponse {
  finances: FinanceRecord[];
  total_count: number;
  page: number;
  per_page: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface FinanceStatsResponse {
  total_income: number;
  total_outcome: number;
  total_donation: number;
  net_profit: number;
  transaction_count: number;
  income_count: number;
  outcome_count: number;
}

export interface MonthlyFinanceReport {
  month: number;
  year: number;
  total_income: number;
  total_outcome: number;
  net_amount: number;
  donation_amount: number;
  transaction_count: number;
}

export interface YearlyFinanceReport {
  year: number;
  monthly_reports: MonthlyFinanceReport[];
  yearly_total_income: number;
  yearly_total_outcome: number;
  yearly_net_amount: number;
  yearly_donation_amount: number;
  yearly_transaction_count: number;
}

export interface ExchangeRateResponse {
  usd_to_uzs: number;
  formatted_rate: string;
}

export interface TransferRequest {
  from_card: string;
  to_card: string;
  amount: number;
  tax_percentage?: number;
}

export interface TopUpRequest {
  card: string;
  amount: number;
  donation_percentage?: number;
  transaction_status: string;
}

export interface FinanceMutationResponse {
  message: string;
  id?: number;
}

export interface DonationResetResponse {
  success: boolean;
  message: string;
  new_balance: number;
}

export async function fetchFinanceList(params?: {
  page?: number;
  per_page?: number;
}): Promise<FinanceListResponse> {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.per_page) query.set("per_page", String(params.per_page));
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const { data } = await api.get<FinanceListResponse>(`/finance/${suffix}`);
  return data;
}

export async function fetchFinanceAdvancedStats(params?: {
  date_from?: string;
  date_to?: string;
  card?: string;
  transaction_status?: string;
}): Promise<FinanceStatsResponse> {
  const query = new URLSearchParams();
  if (params?.date_from) query.set("date_from", params.date_from);
  if (params?.date_to) query.set("date_to", params.date_to);
  if (params?.card) query.set("card", params.card);
  if (params?.transaction_status) {
    query.set("transaction_status", params.transaction_status);
  }
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const { data } = await api.get<FinanceStatsResponse>(
    `/finance/advanced/stats${suffix}`,
  );
  return data;
}

export async function fetchFinanceFilteredList(payload: {
  type?: string;
  status?: string;
  card?: string;
  currency?: string;
  transaction_status?: string;
  date_from?: string;
  date_to?: string;
  service_search?: string;
  page?: number;
  per_page?: number;
}): Promise<FinanceListResponse> {
  const query = new URLSearchParams();
  if (payload.page) query.set("page", String(payload.page));
  if (payload.per_page) query.set("per_page", String(payload.per_page));
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const { data } = await api.post<FinanceListResponse>(
    `/finance/advanced/filtered-list${suffix}`,
    payload,
  );
  return data;
}

export async function fetchMonthlyFinanceReport(
  year: number,
  month: number,
): Promise<MonthlyFinanceReport> {
  const { data } = await api.get<MonthlyFinanceReport>(
    `/finance/advanced/monthly-report/${year}/${month}`,
  );
  return data;
}

export async function fetchYearlyFinanceReport(
  year: number,
): Promise<YearlyFinanceReport> {
  const { data } = await api.get<YearlyFinanceReport>(
    `/finance/advanced/yearly-report/${year}`,
  );
  return data;
}

export async function fetchTopServices(limit = 10): Promise<unknown> {
  const { data } = await api.get<unknown>(
    `/finance/advanced/top-services?limit=${limit}`,
  );
  return data;
}

export async function fetchCardStats(): Promise<unknown> {
  const { data } = await api.get<unknown>("/finance/advanced/card-stats");
  return data;
}

export async function topUpCard(
  payload: TopUpRequest,
): Promise<FinanceMutationResponse> {
  const { data } = await api.post<FinanceMutationResponse>(
    "/finance/topup",
    payload,
  );
  return data;
}

export async function transferBetweenCards(
  payload: TransferRequest,
): Promise<FinanceMutationResponse> {
  const { data } = await api.post<FinanceMutationResponse>(
    "/finance/transfer",
    payload,
  );
  return data;
}

export async function resetDonationBalance(): Promise<DonationResetResponse> {
  const { data } = await api.post<DonationResetResponse>(
    "/finance/reset-donation",
  );
  return data;
}

export async function fetchLiveExchangeRate(): Promise<ExchangeRateResponse> {
  const { data } = await api.get<ExchangeRateResponse>(
    "/finance/exchange-rate/live",
  );
  return data;
}

export async function syncExchangeRate(): Promise<FinanceMutationResponse> {
  const { data } = await api.post<FinanceMutationResponse>(
    "/finance/exchange-rate/sync",
  );
  return data;
}
