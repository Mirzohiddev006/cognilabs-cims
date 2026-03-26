import { useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import { observeDomTranslations } from '../../shared/i18n/dom'
import { getStoredLocale, setCurrentLocale, translate, type AppLocale, type TranslationParams } from '../../shared/i18n/translations'
import { LocaleContext } from './LocaleContext'

export function LocaleProvider({ children }: PropsWithChildren) {
  const [locale, setLocaleState] = useState<AppLocale>(getStoredLocale)

  setCurrentLocale(locale)

  function setLocale(nextLocale: AppLocale) {
    setCurrentLocale(nextLocale)
    setLocaleState(nextLocale)
  }

  useEffect(() => {
    setCurrentLocale(locale)
    window.localStorage.setItem('cims-locale', locale)
    document.documentElement.lang = locale
  }, [locale])

  useEffect(() => observeDomTranslations(locale), [locale])

  const value = useMemo(() => ({
    locale,
    setLocale,
    t: (key: string, fallback?: string, params?: TranslationParams) => translate(locale, key, fallback, params),
  }), [locale])

  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  )
}
