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
