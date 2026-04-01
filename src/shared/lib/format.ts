import { getIntlLocale, getStoredLocale, type AppLocale } from '../i18n/translations'

const localizedMonthNames: Record<AppLocale, string[]> = {
  en: [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ],
  uz: [
    'Yanvar',
    'Fevral',
    'Mart',
    'Aprel',
    'May',
    'Iyun',
    'Iyul',
    'Avgust',
    'Sentabr',
    'Oktabr',
    'Noyabr',
    'Dekabr',
  ],
  ru: [
    'январь',
    'февраль',
    'март',
    'апрель',
    'май',
    'июнь',
    'июль',
    'август',
    'сентябрь',
    'октябрь',
    'ноябрь',
    'декабрь',
  ],
}

export function getLocalizedMonthName(month: number, locale: AppLocale = getStoredLocale()) {
  const index = Math.trunc(month) - 1

  if (index < 0 || index >= 12) {
    return ''
  }

  // Some browsers can return month codes like "M04" for month-only Intl formatting in Uzbek.
  return localizedMonthNames[locale][index]
}

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
