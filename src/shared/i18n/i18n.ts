import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import enCommon from '../../locales/en/common.json'
import ruCommon from '../../locales/ru/common.json'
import uzCommon from '../../locales/uz/common.json'

const STORAGE_KEY = 'cims-locale'
const DEFAULT_LANGUAGE = 'en'
const SUPPORTED_LANGUAGES = new Set(['en', 'uz', 'ru'])
const isDev = import.meta.env.DEV

function resolveInitialLanguage() {
  if (typeof window === 'undefined') {
    return DEFAULT_LANGUAGE
  }

  const storedLanguage = window.localStorage.getItem(STORAGE_KEY)

  if (storedLanguage && SUPPORTED_LANGUAGES.has(storedLanguage)) {
    return storedLanguage
  }

  const browserLanguage = window.navigator.language?.toLowerCase()

  if (browserLanguage?.startsWith('uz')) {
    return 'uz'
  }

  if (browserLanguage?.startsWith('ru')) {
    return 'ru'
  }

  return DEFAULT_LANGUAGE
}

void i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: enCommon },
      uz: { common: uzCommon },
      ru: { common: ruCommon },
    },
    lng: resolveInitialLanguage(),
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: [...SUPPORTED_LANGUAGES],
    defaultNS: 'common',
    ns: ['common'],
    interpolation: {
      escapeValue: false,
    },
    keySeparator: false,
    nsSeparator: false,
    returnNull: false,
    debug: false,
    saveMissing: isDev,
    missingKeyHandler: isDev
      ? (_languages, _namespace, key) => {
        console.warn(`[i18n] Missing translation key: ${String(key)}`)
      }
      : undefined,
    react: {
      useSuspense: false,
    },
  })

export default i18n
