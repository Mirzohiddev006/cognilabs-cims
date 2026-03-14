export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export type ApiRequestOptions = {
  path: string
  method?: ApiMethod
  query?: Record<string, string | number | boolean | undefined | null>
  body?: BodyInit | FormData | Record<string, unknown> | undefined
  headers?: Record<string, string>
  auth?: boolean
}

export type ApiResponseError = {
  message: string
  status: number
  details: unknown
}

export type SuccessResponse = {
  success?: boolean
  message: string
}

export type CreateResponse = {
  id: number
  message: string
}

export type UserRole =
  | 'CEO'
  | 'Customer'
  | 'SalesManager'
  | 'Finance'
  | 'Admin'
  | (string & {})

export type PermissionMap = Record<string, boolean>

export type CurrentUser = {
  id: number
  email: string
  name: string
  surname: string
  company_code: string
  role: UserRole
  is_active: boolean
  permissions: PermissionMap
}

export type TokenResponse = {
  access_token: string
  refresh_token?: string
  token_type: string
  expires_in?: number
}

export type CustomerSummary = {
  id: number
  full_name?: string | null
  name?: string | null
  surname?: string | null
  first_name?: string | null
  last_name?: string | null
  firstName?: string | null
  lastName?: string | null
  platform?: string | null
  platform_name?: string | null
  source_platform?: string | null
  social_platform?: string | null
  source?: string | null
  lead_source?: string | null
  channel?: string | null
  platforms?: Array<string | null> | null
  username?: string | null
  phone_number?: string | null
  phone?: string | null
  status: string
  assistant_name?: string | null
  notes?: string | null
  aisummary?: string | null
  audio_file_id?: string | null
  audio_url?: string | null
  recall_time?: string | null
  conversation_language?: string | null
  created_at: string
}

export type PaymentItem = {
  id: number
  project: string
  date: string | null
  summ: number
  payment: boolean
}

export type FinanceItem = {
  id: number
  type: string
  status: string
  card: string
  card_display: string
  service: string
  summ: number
  currency: string
  date: string
  donation: number
  donation_percentage: number
  tax_percentage: number
  exchange_rate: number
  transaction_status: string
  initial_date: string
}

export type DailyMetrics = {
  today_customers: CustomerSummary[]
  need_to_call_count: number
  total_balance_uzs: number
  total_balance_formatted: string
  due_payments_today: number
}

export type DynamicStatusOption = {
  value: string
  label: string
  color: string
  order: number
}

export type CustomerStatsResponse = {
  total_customers: number
  need_to_call: number
  contacted: number
  project_started: number
  continuing: number
  finished: number
  rejected: number
  status_dict: Record<string, number>
  status_percentages: Record<string, number>
}

export type SalesStatsResponse = {
  today: number
  yesterday: number
  this_week: number
  last_week: number
  customer_type: string
}

export type ConversionRateResponse = {
  total_customers: number
  project_started_count: number
  conversion_rate: number
  period: string
}

export type UpdateTrackingStats = {
  user_id: number
  user_name: string
  total_updates: number
  updates_this_week: number
  updates_last_week: number
  updates_this_month: number
  updates_last_month: number
  updates_last_3_months: number
  percentage_this_week: number
  percentage_last_week: number
  percentage_this_month: number
  percentage_last_3_months: number
  expected_updates_per_week: number
}

export type CompanyStatsResponse = {
  total_employees: number
  total_updates_today: number
  total_updates_this_week: number
  avg_percentage_this_week: number
  avg_percentage_last_week: number
  avg_percentage_this_month: number
  avg_percentage_last_3_months: number
}

export type DayStatus = 'submitted' | 'missing' | 'sunday' | 'future' | 'neutral'

export type EmployeeDayStatus = {
  day: number
  status: DayStatus
}

export type EmployeeMonthlyStats = {
  user_id: number
  user_name: string
  telegram_username?: string | null
  submitted_count: number
  missing_count: number
  completion_percentage: number
  last_update_date: string | null
  daily_statuses?: EmployeeDayStatus[] | null
}

export type TeamMonthlyResponse = {
  month: number
  year: number
  total_employees: number
  total_submitted: number
  total_missing: number
  avg_completion_percentage: number
  top_performer: EmployeeMonthlyStats | null
  employees: EmployeeMonthlyStats[]
}
