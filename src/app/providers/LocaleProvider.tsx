import { useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import { getStoredLocale, translate, type AppLocale } from '../../shared/i18n/translations'
import { LocaleContext } from './LocaleContext'

export function LocaleProvider({ children }: PropsWithChildren) {
  const [locale, setLocale] = useState<AppLocale>(getStoredLocale)

  useEffect(() => {
    window.localStorage.setItem('cims-locale', locale)
    document.documentElement.lang = locale
  }, [locale])

  const value = useMemo(() => ({
    locale,
    setLocale,
    t: (key: string, fallback?: string) => translate(locale, key, fallback),
  }), [locale])

  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  )
}
