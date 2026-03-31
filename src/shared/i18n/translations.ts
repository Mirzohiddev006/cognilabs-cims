import i18n from './i18n'
import { literalPhrases } from './literalPhrases'

export type AppLocale = 'en' | 'uz' | 'ru'

export type TranslationParams = Record<string, string | number | boolean | null | undefined>

export const localeLabels: Record<AppLocale, string> = {
  en: 'EN',
  uz: 'UZ',
  ru: 'RU',
}

const STORAGE_KEY = 'cims-locale'
const DEFAULT_LOCALE: AppLocale = 'en'
const supportedLocales = new Set<AppLocale>(['en', 'uz', 'ru'])
const intlLocaleMap: Record<AppLocale, string> = {
  en: 'en-US',
  uz: 'uz-UZ',
  ru: 'ru-RU',
}

let currentLocale: AppLocale = DEFAULT_LOCALE

type LiteralPhrase = (typeof literalPhrases)[number]

const literalLookup = new Map<string, LiteralPhrase>()

for (const phrase of literalPhrases) {
  for (const locale of Object.keys(localeLabels) as AppLocale[]) {
    const value = phrase[locale]

    if (!value) {
      continue
    }

    const normalized = normalizeLiteral(value)

    if (!literalLookup.has(normalized)) {
      literalLookup.set(normalized, phrase)
    }
  }
}

function syncCurrentLocaleFromI18n() {
  currentLocale = normalizeLocale(i18n.resolvedLanguage ?? i18n.language)
}

syncCurrentLocaleFromI18n()

i18n.on('initialized', syncCurrentLocaleFromI18n)
i18n.on('languageChanged', syncCurrentLocaleFromI18n)

function normalizeLocale(value?: string | null): AppLocale {
  if (!value) {
    return DEFAULT_LOCALE
  }

  const normalized = value.toLowerCase()

  if (normalized.startsWith('uz')) {
    return 'uz'
  }

  if (normalized.startsWith('ru')) {
    return 'ru'
  }

  return 'en'
}

function normalizeLiteral(value: string) {
  return value
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function translatePattern(locale: AppLocale, value: string) {
  const perPageMatch = value.match(/^(\d+)\s+per\s+page$/i)

  if (perPageMatch) {
    return translate(locale, 'common.per_page', '{{count}} per page', { count: Number(perPageMatch[1]) })
  }

  const resultsMatch = value.match(/^(\d+)\s*-\s*(\d+)\s+of\s+(\d+)\s+results$/i)

  if (resultsMatch) {
    return translate(locale, 'common.results_range', '{{start}}-{{end}} of {{total}} results', {
      start: Number(resultsMatch[1]),
      end: Number(resultsMatch[2]),
      total: Number(resultsMatch[3]),
    })
  }

  return value
}

export function getStoredLocale(): AppLocale {
  if (currentLocale && supportedLocales.has(currentLocale)) {
    return currentLocale
  }

  if (typeof window === 'undefined') {
    currentLocale = normalizeLocale(i18n.resolvedLanguage ?? i18n.language)
    return currentLocale
  }

  const storedLocale = window.localStorage.getItem(STORAGE_KEY)
  currentLocale = supportedLocales.has(storedLocale as AppLocale)
    ? (storedLocale as AppLocale)
    : normalizeLocale(i18n.resolvedLanguage ?? i18n.language)

  return currentLocale
}

export function setCurrentLocale(locale: AppLocale) {
  currentLocale = locale
}

export function getIntlLocale(locale: AppLocale = getStoredLocale()) {
  return intlLocaleMap[locale]
}

export function translate(locale: AppLocale, key: string, fallback?: string, params?: TranslationParams) {
  const translated = i18n.t(key, {
    lng: locale,
    defaultValue: fallback ?? key,
    ...params,
  })

  return typeof translated === 'string' ? translated : String(translated)
}

export function translateCurrent(key: string, fallback?: string, params?: TranslationParams) {
  return translate(normalizeLocale(i18n.resolvedLanguage ?? i18n.language), key, fallback, params)
}

export function translateLiteral(locale: AppLocale, value: string) {
  if (!value.trim()) {
    return value
  }

  if (i18n.exists(value, { lng: locale })) {
    return translate(locale, value)
  }

  const phrase = literalLookup.get(normalizeLiteral(value))

  if (phrase) {
    return phrase[locale]
  }

  return translatePattern(locale, value)
}

export function translateCurrentLiteral(value: string) {
  return translateLiteral(normalizeLocale(i18n.resolvedLanguage ?? i18n.language), value)
}
