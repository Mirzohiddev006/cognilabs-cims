import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import enCommon from '../../locales/en/common.json'
import ruCommon from '../../locales/ru/common.json'
import uzCommon from '../../locales/uz/common.json'

const STORAGE_KEY = 'cims-locale'
const DEFAULT_LANGUAGE = 'en'
const SUPPORTED_LANGUAGES = new Set(['en', 'uz', 'ru'])

function resolveInitialLanguage() {
  if (typeof window === 'undefined') {
    return DEFAULT_LANGUAGE
  }

  const storedLanguage = window.localStorage.getItem(STORAGE_KEY)

  if (storedLanguage && SUPPORTED_LANGUAGES.has(storedLanguage)) {
    return storedLanguage
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
  })

export default i18n
