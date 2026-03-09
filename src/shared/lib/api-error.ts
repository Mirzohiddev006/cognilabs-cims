import type { ApiResponseError } from '../api/types'

export function getApiErrorMessage(
  error: unknown,
  fallback = "So'rov bajarilmadi. Qayta urinib ko'ring.",
) {
  const apiError = error as ApiResponseError | undefined
  const details = apiError?.details as
    | string
    | {
        detail?: string | Array<{ msg?: string }>
      }
    | undefined

  if (typeof details === 'string' && details.trim()) {
    return details
  }

  if (details && typeof details === 'object' && typeof details.detail === 'string' && details.detail.trim()) {
    return details.detail
  }

  if (details && typeof details === 'object' && Array.isArray(details.detail) && details.detail.length > 0) {
    const messages = details.detail
      .map((item) => item.msg)
      .filter((message): message is string => Boolean(message))

    if (messages.length > 0) {
      return messages.join(', ')
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

export function stringifyApiData(payload: unknown) {
  if (typeof payload === 'string') {
    const trimmed = payload.trim()

    if (!trimmed) {
      return payload
    }

    try {
      const parsed = JSON.parse(trimmed) as unknown
      return JSON.stringify(parsed, null, 2)
    } catch {
      return payload
    }
  }

  try {
    return JSON.stringify(payload, null, 2)
  } catch {
    return String(payload)
  }
}
