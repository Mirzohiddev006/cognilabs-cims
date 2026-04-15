import type { ApiResponseError } from '../api/types'

export type ErrorType = 'network' | 'auth' | 'validation' | 'server' | 'unknown'

export interface ParsedError {
  type: ErrorType
  message: string
  fieldErrors: Record<string, string>
  status?: number
}

/**
 * Classify and parse any thrown error into a structured ParsedError.
 */
export function parseError(error: unknown, fallback = 'So\'rov bajarilmadi'): ParsedError {
  // Network / fetch errors
  if (error instanceof TypeError && error.message.toLowerCase().includes('fetch')) {
    return {
      type: 'network',
      message: 'Internet aloqasi yo\'q yoki server javob bermayapti',
      fieldErrors: {},
    }
  }

  const apiError = error as Partial<ApiResponseError> | undefined
  const status = apiError?.status

  if (status === 401 || status === 403) {
    return {
      type: 'auth',
      message: status === 401 ? 'Autentifikatsiya talab qilinadi' : 'Ruxsat yo\'q',
      fieldErrors: {},
      status,
    }
  }

  const fieldErrors = extractFieldErrors(error)
  const message = getErrorMessage(error, fallback)

  const type: ErrorType =
    status && status >= 500
      ? 'server'
      : Object.keys(fieldErrors).length > 0
        ? 'validation'
        : 'unknown'

  return { type, message, fieldErrors, status }
}

/**
 * Extract field-level validation errors from an API response error.
 * Compatible with React Hook Form's setError API.
 */
export function extractFieldErrors(error: unknown): Record<string, string> {
  const apiError = error as Partial<ApiResponseError> | undefined
  const details = apiError?.details as
    | Record<string, string | string[]>
    | { detail?: string | Array<{ loc?: string[]; msg?: string }> }
    | null
    | undefined

  if (!details || typeof details !== 'object') {
    return {}
  }

  const result: Record<string, string> = {}

  // FastAPI-style: { detail: [{ loc: ['body', 'field'], msg: '...' }] }
  if (Array.isArray((details as { detail?: unknown }).detail)) {
    const items = (details as { detail: Array<{ loc?: string[]; msg?: string }> }).detail

    for (const item of items) {
      if (item.loc && item.loc.length > 0 && item.msg) {
        const fieldName = item.loc[item.loc.length - 1] ?? 'root'
        result[fieldName] = item.msg
      }
    }

    return result
  }

  // DRF-style: { field_name: ['error message'] } or { field_name: 'error message' }
  for (const [key, value] of Object.entries(details)) {
    if (key === 'detail' || key === 'non_field_errors') continue

    if (typeof value === 'string') {
      result[key] = value
    } else if (Array.isArray(value) && value.length > 0) {
      result[key] = String(value[0])
    }
  }

  return result
}

/**
 * Extract a human-readable error message from any thrown value.
 */
export function getErrorMessage(error: unknown, fallback = 'Xatolik yuz berdi'): string {
  const apiError = error as Partial<ApiResponseError> | undefined
  const details = apiError?.details as
    | string
    | { detail?: string | Array<{ msg?: string }> }
    | null
    | undefined

  if (typeof details === 'string' && details.trim()) {
    return details
  }

  if (details && typeof details === 'object') {
    const detail = (details as { detail?: unknown }).detail

    if (typeof detail === 'string' && detail.trim()) {
      return detail
    }

    if (Array.isArray(detail) && detail.length > 0) {
      const messages = (detail as Array<{ msg?: string }>)
        .map((item) => item.msg)
        .filter((m): m is string => Boolean(m))

      if (messages.length > 0) {
        return messages.join(', ')
      }
    }
  }

  if (apiError?.message) {
    return apiError.message
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return fallback
}

/**
 * Log an error to the console with context information.
 * Can be extended to send errors to an error tracking service.
 */
export function logError(context: string, error: unknown): void {
  console.error(`[${context}]`, error)
}
