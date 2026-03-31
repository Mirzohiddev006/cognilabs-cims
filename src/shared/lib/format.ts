import { getIntlLocale } from '../i18n/translations'

export function formatCurrency(value: number, currency = 'UZS') {
  return new Intl.NumberFormat(getIntlLocale(), {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatCompactNumber(value: number) {
  return new Intl.NumberFormat(getIntlLocale(), {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

export function formatShortDate(date: string) {
  return new Intl.DateTimeFormat(getIntlLocale(), {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

function padDatePart(value: number) {
  return String(value).padStart(2, '0')
}

export function formatNumericDate(date?: string | null) {
  if (!date) {
    return '-'
  }

  const parsed = new Date(date)

  if (Number.isNaN(parsed.getTime())) {
    return '-'
  }

  return `${parsed.getFullYear()} ${padDatePart(parsed.getMonth() + 1)} ${padDatePart(parsed.getDate())}`
}

export function formatNumericDateTime(date?: string | null) {
  if (!date) {
    return '-'
  }

  const parsed = new Date(date)

  if (Number.isNaN(parsed.getTime())) {
    return '-'
  }

  return `${formatNumericDate(date)} ${padDatePart(parsed.getHours())}:${padDatePart(parsed.getMinutes())}`
}
