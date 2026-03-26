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

let currentLocale: AppLocale | null = null

const translations: Record<AppLocale, Record<string, string>> = {
  en: {
    'common.request_failed': 'Request failed. Please try again.',
    'auth.protected.session': 'Session',
    'auth.protected.verifying': 'Verifying credentials',
    'auth.protected.description': 'Validating access tokens, refresh flow, and user permissions.',
    'auth.protected.session_expired': 'Session expired or not found. Please log in again.',
    'auth.validation.email_required': 'Email is required.',
    'auth.validation.email_invalid': 'Email format is invalid.',
    'auth.validation.password_required': 'Password is required.',
    'auth.validation.password_short': 'Password must be at least 6 characters.',
    'auth.validation.name_required': 'Name is required.',
    'auth.validation.surname_required': 'Surname is required.',
    'auth.validation.company_code_required': 'Company code is required.',
    'auth.validation.verification_code_required': 'Verification code is required.',
    'auth.validation.reset_code_required': 'Reset code is required.',
    'auth.validation.confirm_password_required': 'Password confirmation is required.',
    'auth.validation.passwords_mismatch': 'Passwords do not match.',
    'shell.language': 'Language',
    'shell.menu': 'Menu',
    'shell.modules': 'modules',
    'shell.logout': 'Logout',
    'shell.logging_out': 'Logging out...',
    'shell.close': 'Close',
    'shell.edit': 'Edit',
    'shell.cancel': 'Cancel',
    'shell.save_changes': 'Save changes',
    'shell.retry': 'Retry',
    'shell.no_projects': 'No projects yet.',
    'shell.failed_load_projects': 'Failed to load projects.',
    'shell.authenticated_user': 'Authenticated user',
    'shell.user': 'User',
    'shell.management_system': 'Management System',
    'shell.toggle_navigation': 'Toggle navigation',
    'shell.close_navigation': 'Close navigation',
    'shell.close_navigation_overlay': 'Close navigation overlay',
    'shell.expand_projects': 'Expand projects',
    'shell.collapse_projects': 'Collapse projects',
    'shell.switch_to_light': 'Switch to light mode',
    'shell.switch_to_dark': 'Switch to dark mode',
    'shell.logged_out': 'Logged out',
    'shell.session_closed': 'Session closed. You can log in again.',
    'profile.member_details': 'Member details',
    'profile.current_user': 'Current authenticated user',
    'profile.role': 'Role',
    'profile.company_code': 'Company code',
    'profile.job_title': 'Job title',
    'profile.email': 'Email',
    'profile.status': 'Status',
    'profile.name': 'Name',
    'profile.surname': 'Surname',
    'profile.permissions': 'Permissions',
    'profile.enabled': 'enabled',
    'profile.no_active_permissions': 'No active permissions available.',
    'profile.active': 'Active',
    'profile.inactive': 'Inactive',
    'profile.updated': 'Profile updated',
    'profile.update_failed': 'Profile update failed',
    'profile.fill_required': 'Name, surname, and email are required.',
    'nav./member/dashboard.label': 'Member Dashboard',
    'nav./member/dashboard.group': 'Member',
    'nav./ceo/dashboard.label': 'CEO Dashboard',
    'nav./ceo/dashboard.group': 'CEO',
    'nav./crm.label': 'CRM',
    'nav./crm.group': 'Sales',
    'nav./ceo/users.label': 'Users & Permissions',
    'nav./ceo/users.group': 'CEO',
    'nav./ceo/team-updates.label': 'Team Monthly Updates',
    'nav./ceo/team-updates.group': 'CEO',
    'nav./faults.label': 'Salary Estimates',
    'nav./faults.group': 'CEO',
    'nav./updates.label': 'Updates',
    'nav./updates.group': 'People',
    'nav./projects.label': 'Projects',
    'nav./projects.group': 'Work',
    'nav./ceo/ai.label': 'CIMS AI',
    'nav./ceo/ai.group': 'CEO',
    'nav./ceo/management.label': 'Management API',
    'nav./ceo/management.group': 'CEO',
    'nav./cims-team.label': 'CIMS Team',
    'nav./cims-team.group': 'Workspace',
    'cims.copy': 'Copy',
    'cims.open_link': 'Open link',
    'cims.link_copied': 'Link copied',
    'cims.link_copied_desc': 'link copied to clipboard.',
    'cims.copy_failed': 'Copy failed',
    'cims.copy_failed_desc': 'Clipboard access is not available in this browser.',
    'cims.handle': 'Handle',
    'cims.category.official': 'Official',
    'cims.category.channel': 'Channel',
    'cims.category.bot': 'Bot',
    'cims.instagram.title': 'Instagram',
    'cims.instagram.eyebrow': 'Social presence',
    'cims.instagram.note': 'Public-facing brand page for visibility, trust, and first-touch discovery.',
    'cims.telegram.title': 'Telegram Channel',
    'cims.telegram.eyebrow': 'Community line',
    'cims.telegram.note': 'Primary Telegram touchpoint for updates, fast reach, and lightweight company communication.',
    'cims.recall.title': 'Recall Bot',
    'cims.recall.eyebrow': 'Automation',
    'cims.recall.note': 'Bot surface for reminder and recall workflows.',
    'cims.update.title': 'Update Bot',
    'cims.update.eyebrow': 'Operations',
    'cims.update.note': 'Dedicated update-tracking entry point for daily operational usage.',
    'projects.unknown_user': 'Unknown user',
    'projects.unknown_date': 'Unknown date',
    'projects.relative.upcoming': 'Upcoming',
    'projects.relative.today': 'Today',
    'projects.relative.yesterday': 'Yesterday',
    'projects.relative.days_ago': '{count}d ago',
    'projects.relative.weeks_ago': '{count}w ago',
    'projects.relative.months_ago': '{count}mo ago',
    'projects.relative.years_ago': '{count}y ago',
    'projects.priority.urgent': 'Urgent',
    'projects.priority.high': 'High',
    'projects.priority.medium': 'Medium',
    'projects.priority.low': 'Low',
    'projects.color.blue': 'Blue',
    'projects.color.violet': 'Violet',
    'projects.color.green': 'Green',
    'projects.color.amber': 'Amber',
    'projects.color.red': 'Red',
    'projects.color.pink': 'Pink',
    'projects.color.cyan': 'Cyan',
    'projects.color.slate': 'Slate',
    'projects.snooze.later_today': 'Later today',
    'projects.snooze.tomorrow': 'Tomorrow',
    'projects.snooze.next_week': 'Next week',
  },
  uz: {
    'common.request_failed': 'Sorov bajarilmadi. Qayta urinib koring.',
    'auth.protected.session': 'Sessiya',
    'auth.protected.verifying': 'Malumotlar tekshirilmoqda',
    'auth.protected.description': 'Access token, refresh flow va foydalanuvchi ruxsatlari tekshirilmoqda.',
    'auth.protected.session_expired': 'Sessiya tugagan yoki topilmadi. Iltimos, qayta kiring.',
    'auth.validation.email_required': 'Email majburiy.',
    'auth.validation.email_invalid': 'Email formati notogri.',
    'auth.validation.password_required': 'Parol majburiy.',
    'auth.validation.password_short': 'Parol kamida 6 ta belgidan iborat bolsin.',
    'auth.validation.name_required': 'Ism majburiy.',
    'auth.validation.surname_required': 'Familiya majburiy.',
    'auth.validation.company_code_required': 'Kompaniya kodi majburiy.',
    'auth.validation.verification_code_required': 'Tasdiqlash kodi majburiy.',
    'auth.validation.reset_code_required': 'Reset kodi majburiy.',
    'auth.validation.confirm_password_required': 'Parol tasdigi majburiy.',
    'auth.validation.passwords_mismatch': 'Parollar mos emas.',
    'shell.language': 'Til',
    'shell.menu': 'Menyu',
    'shell.modules': 'modul',
    'shell.logout': 'Chiqish',
    'shell.logging_out': 'Chiqilmoqda...',
    'shell.close': 'Yopish',
    'shell.edit': 'Tahrirlash',
    'shell.cancel': 'Bekor qilish',
    'shell.save_changes': 'Saqlash',
    'shell.retry': 'Qayta urinish',
    'shell.no_projects': 'Hali loyihalar yoq.',
    'shell.failed_load_projects': 'Loyihalarni yuklab bolmadi.',
    'shell.authenticated_user': 'Joriy foydalanuvchi',
    'shell.user': 'Foydalanuvchi',
    'shell.management_system': 'Boshqaruv tizimi',
    'shell.toggle_navigation': 'Navigatsiyani ochish',
    'shell.close_navigation': 'Navigatsiyani yopish',
    'shell.close_navigation_overlay': 'Navigatsiya qatlamini yopish',
    'shell.expand_projects': 'Loyihalarni ochish',
    'shell.collapse_projects': 'Loyihalarni yigish',
    'shell.switch_to_light': 'Yorug mavzuga otish',
    'shell.switch_to_dark': 'Qorongu mavzuga otish',
    'shell.logged_out': 'Sessiya yopildi',
    'shell.session_closed': 'Sessiya yopildi. Qayta tizimga kirishingiz mumkin.',
    'profile.member_details': 'Foydalanuvchi malumotlari',
    'profile.current_user': 'Joriy foydalanuvchi',
    'profile.role': 'Rol',
    'profile.company_code': 'Kompaniya kodi',
    'profile.job_title': 'Lavozim',
    'profile.email': 'Email',
    'profile.status': 'Holat',
    'profile.name': 'Ism',
    'profile.surname': 'Familiya',
    'profile.permissions': 'Ruxsatlar',
    'profile.enabled': 'ta yoqilgan',
    'profile.no_active_permissions': 'Faol ruxsatlar yoq.',
    'profile.active': 'Faol',
    'profile.inactive': 'Nofaol',
    'profile.updated': 'Profil yangilandi',
    'profile.update_failed': 'Profilni yangilab bolmadi',
    'profile.fill_required': 'Ism, familiya va email majburiy.',
    'nav./member/dashboard.label': 'Member Dashboard',
    'nav./member/dashboard.group': 'Member',
    'nav./ceo/dashboard.label': 'CEO Dashboard',
    'nav./ceo/dashboard.group': 'CEO',
    'nav./crm.label': 'CRM',
    'nav./crm.group': 'Savdo',
    'nav./ceo/users.label': 'Foydalanuvchilar va ruxsatlar',
    'nav./ceo/users.group': 'CEO',
    'nav./ceo/team-updates.label': 'Jamoa oylik update lari',
    'nav./ceo/team-updates.group': 'CEO',
    'nav./faults.label': 'Maosh hisoblari',
    'nav./faults.group': 'CEO',
    'nav./updates.label': 'Yangilanishlar',
    'nav./updates.group': 'Jamoa',
    'nav./projects.label': 'Loyihalar',
    'nav./projects.group': 'Ish',
    'nav./ceo/ai.label': 'CIMS AI',
    'nav./ceo/ai.group': 'CEO',
    'nav./ceo/management.label': 'Management API',
    'nav./ceo/management.group': 'CEO',
    'nav./cims-team.label': 'CIMS Team',
    'nav./cims-team.group': 'Workspace',
    'cims.copy': 'Nusxa olish',
    'cims.open_link': 'Havolani ochish',
    'cims.link_copied': 'Havola nusxalandi',
    'cims.link_copied_desc': 'havolasi clipboardga nusxalandi.',
    'cims.copy_failed': 'Nusxa olib bolmadi',
    'cims.copy_failed_desc': 'Bu brauzerda clipboard ruxsati mavjud emas.',
    'cims.handle': 'Handle',
    'cims.category.official': 'Rasmiy',
    'cims.category.channel': 'Kanal',
    'cims.category.bot': 'Bot',
    'cims.instagram.title': 'Instagram',
    'cims.instagram.eyebrow': 'Ijtimoiy sahifa',
    'cims.instagram.note': 'Korinishi va birinchi aloqa uchun ommaviy brend sahifasi.',
    'cims.telegram.title': 'Telegram kanali',
    'cims.telegram.eyebrow': 'Hamjamiyat liniyasi',
    'cims.telegram.note': 'Yangiliklar va tezkor aloqa uchun asosiy Telegram nuqtasi.',
    'cims.recall.title': 'Recall Bot',
    'cims.recall.eyebrow': 'Avtomatlashtirish',
    'cims.recall.note': 'Eslatma va recall jarayonlari uchun bot yuzasi.',
    'cims.update.title': 'Update Bot',
    'cims.update.eyebrow': 'Operatsiyalar',
    'cims.update.note': 'Kundalik operatsion foydalanish uchun update-tracking kirish nuqtasi.',
    'projects.unknown_user': 'Nomalum foydalanuvchi',
    'projects.unknown_date': 'Nomalum sana',
    'projects.relative.upcoming': 'Yaqinlashmoqda',
    'projects.relative.today': 'Bugun',
    'projects.relative.yesterday': 'Kecha',
    'projects.relative.days_ago': '{count} kun oldin',
    'projects.relative.weeks_ago': '{count} hafta oldin',
    'projects.relative.months_ago': '{count} oy oldin',
    'projects.relative.years_ago': '{count} yil oldin',
    'projects.priority.urgent': 'Shoshilinch',
    'projects.priority.high': 'Yuqori',
    'projects.priority.medium': 'Orta',
    'projects.priority.low': 'Past',
    'projects.color.blue': 'Kok',
    'projects.color.violet': 'Binafsha',
    'projects.color.green': 'Yashil',
    'projects.color.amber': 'Sariq',
    'projects.color.red': 'Qizil',
    'projects.color.pink': 'Pushti',
    'projects.color.cyan': 'Moviy',
    'projects.color.slate': 'Kulrang',
    'projects.snooze.later_today': 'Bugun kechroq',
    'projects.snooze.tomorrow': 'Ertaga',
    'projects.snooze.next_week': 'Keyingi hafta',
  },
  ru: {
    'common.request_failed': 'Запрос не выполнен. Попробуйте снова.',
    'auth.protected.session': 'Сессия',
    'auth.protected.verifying': 'Проверка данных',
    'auth.protected.description': 'Проверяются access token, refresh flow и права пользователя.',
    'auth.protected.session_expired': 'Сессия истекла или не найдена. Войдите снова.',
    'auth.validation.email_required': 'Email обязателен.',
    'auth.validation.email_invalid': 'Неверный формат email.',
    'auth.validation.password_required': 'Пароль обязателен.',
    'auth.validation.password_short': 'Пароль должен содержать минимум 6 символов.',
    'auth.validation.name_required': 'Имя обязательно.',
    'auth.validation.surname_required': 'Фамилия обязательна.',
    'auth.validation.company_code_required': 'Код компании обязателен.',
    'auth.validation.verification_code_required': 'Код подтверждения обязателен.',
    'auth.validation.reset_code_required': 'Код сброса обязателен.',
    'auth.validation.confirm_password_required': 'Подтверждение пароля обязательно.',
    'auth.validation.passwords_mismatch': 'Пароли не совпадают.',
    'shell.language': 'Язык',
    'shell.menu': 'Меню',
    'shell.modules': 'модулей',
    'shell.logout': 'Выйти',
    'shell.logging_out': 'Выход...',
    'shell.close': 'Закрыть',
    'shell.edit': 'Редактировать',
    'shell.cancel': 'Отмена',
    'shell.save_changes': 'Сохранить',
    'shell.retry': 'Повторить',
    'shell.no_projects': 'Проектов пока нет.',
    'shell.failed_load_projects': 'Не удалось загрузить проекты.',
    'shell.authenticated_user': 'Текущий пользователь',
    'shell.user': 'Пользователь',
    'shell.management_system': 'Система управления',
    'shell.toggle_navigation': 'Открыть навигацию',
    'shell.close_navigation': 'Закрыть навигацию',
    'shell.close_navigation_overlay': 'Закрыть слой навигации',
    'shell.expand_projects': 'Развернуть проекты',
    'shell.collapse_projects': 'Свернуть проекты',
    'shell.switch_to_light': 'Переключить на светлую тему',
    'shell.switch_to_dark': 'Переключить на тёмную тему',
    'shell.logged_out': 'Выход выполнен',
    'shell.session_closed': 'Сессия закрыта. Можно войти снова.',
    'profile.member_details': 'Данные пользователя',
    'profile.current_user': 'Текущий пользователь',
    'profile.role': 'Роль',
    'profile.company_code': 'Код компании',
    'profile.job_title': 'Должность',
    'profile.email': 'Email',
    'profile.status': 'Статус',
    'profile.name': 'Имя',
    'profile.surname': 'Фамилия',
    'profile.permissions': 'Разрешения',
    'profile.enabled': 'включено',
    'profile.no_active_permissions': 'Активных разрешений нет.',
    'profile.active': 'Активен',
    'profile.inactive': 'Неактивен',
    'profile.updated': 'Профиль обновлён',
    'profile.update_failed': 'Не удалось обновить профиль',
    'profile.fill_required': 'Имя, фамилия и email обязательны.',
    'nav./member/dashboard.label': 'Панель сотрудника',
    'nav./member/dashboard.group': 'Сотрудник',
    'nav./ceo/dashboard.label': 'Панель CEO',
    'nav./ceo/dashboard.group': 'CEO',
    'nav./crm.label': 'CRM',
    'nav./crm.group': 'Продажи',
    'nav./ceo/users.label': 'Пользователи и права',
    'nav./ceo/users.group': 'CEO',
    'nav./ceo/team-updates.label': 'Ежемесячные обновления команды',
    'nav./ceo/team-updates.group': 'CEO',
    'nav./faults.label': 'Расчёты зарплаты',
    'nav./faults.group': 'CEO',
    'nav./updates.label': 'Обновления',
    'nav./updates.group': 'Люди',
    'nav./projects.label': 'Проекты',
    'nav./projects.group': 'Работа',
    'nav./ceo/ai.label': 'CIMS AI',
    'nav./ceo/ai.group': 'CEO',
    'nav./ceo/management.label': 'Management API',
    'nav./ceo/management.group': 'CEO',
    'nav./cims-team.label': 'CIMS Team',
    'nav./cims-team.group': 'Workspace',
    'cims.copy': 'Копировать',
    'cims.open_link': 'Открыть ссылку',
    'cims.link_copied': 'Ссылка скопирована',
    'cims.link_copied_desc': 'ссылка скопирована в буфер обмена.',
    'cims.copy_failed': 'Не удалось скопировать',
    'cims.copy_failed_desc': 'В этом браузере нет доступа к буферу обмена.',
    'cims.handle': 'Handle',
    'cims.category.official': 'Официальный',
    'cims.category.channel': 'Канал',
    'cims.category.bot': 'Бот',
    'cims.instagram.title': 'Instagram',
    'cims.instagram.eyebrow': 'Социальное присутствие',
    'cims.instagram.note': 'Публичная страница бренда для узнаваемости и первого контакта.',
    'cims.telegram.title': 'Telegram канал',
    'cims.telegram.eyebrow': 'Линия сообщества',
    'cims.telegram.note': 'Основная Telegram-точка для новостей и быстрой связи.',
    'cims.recall.title': 'Recall Bot',
    'cims.recall.eyebrow': 'Автоматизация',
    'cims.recall.note': 'Бот для напоминаний и recall-процессов.',
    'cims.update.title': 'Update Bot',
    'cims.update.eyebrow': 'Операции',
    'cims.update.note': 'Точка входа в update-tracking для ежедневной операционной работы.',
    'projects.unknown_user': 'Неизвестный пользователь',
    'projects.unknown_date': 'Неизвестная дата',
    'projects.relative.upcoming': 'Скоро',
    'projects.relative.today': 'Сегодня',
    'projects.relative.yesterday': 'Вчера',
    'projects.relative.days_ago': '{count} дн. назад',
    'projects.relative.weeks_ago': '{count} нед. назад',
    'projects.relative.months_ago': '{count} мес. назад',
    'projects.relative.years_ago': '{count} г. назад',
    'projects.priority.urgent': 'Срочно',
    'projects.priority.high': 'Высокий',
    'projects.priority.medium': 'Средний',
    'projects.priority.low': 'Низкий',
    'projects.color.blue': 'Синий',
    'projects.color.violet': 'Фиолетовый',
    'projects.color.green': 'Зелёный',
    'projects.color.amber': 'Янтарный',
    'projects.color.red': 'Красный',
    'projects.color.pink': 'Розовый',
    'projects.color.cyan': 'Циан',
    'projects.color.slate': 'Серый',
    'projects.snooze.later_today': 'Позже сегодня',
    'projects.snooze.tomorrow': 'Завтра',
    'projects.snooze.next_week': 'На следующей неделе',
  },
}

export function getStoredLocale(): AppLocale {
  if (currentLocale !== null) {
    return currentLocale
  }

  if (typeof window === 'undefined') {
    return DEFAULT_LOCALE
  }

  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored === 'uz' || stored === 'ru' ? stored : DEFAULT_LOCALE
}

export function setCurrentLocale(locale: AppLocale) {
  currentLocale = locale
}

export function getIntlLocale(locale: AppLocale = getStoredLocale()) {
  if (locale === 'uz') {
    return 'uz-UZ'
  }

  if (locale === 'ru') {
    return 'ru-RU'
  }

  return 'en-US'
}

function interpolate(template: string, params?: TranslationParams) {
  if (!params) {
    return template
  }

  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = params[key]
    return value === undefined || value === null ? '' : String(value)
  })
}

function normalizeTranslationSource(value: string) {
  return value
    .replace(/\u00A0/g, ' ')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function preserveCase(source: string, translated: string) {
  const trimmed = source.trim()

  if (!trimmed) {
    return translated
  }

  if (trimmed === trimmed.toUpperCase()) {
    return translated.toUpperCase()
  }

  if (/^[A-ZА-ЯЁ]/.test(trimmed)) {
    return translated.charAt(0).toUpperCase() + translated.slice(1)
  }

  return translated
}

type PhraseMap = Record<AppLocale, Map<string, string>>

const literalLookups = buildLiteralLookups()

function buildLiteralLookups(): PhraseMap {
  const maps: PhraseMap = {
    en: new Map<string, string>(),
    uz: new Map<string, string>(),
    ru: new Map<string, string>(),
  }

  const allKeys = new Set<string>([
    ...Object.keys(translations.en),
    ...Object.keys(translations.uz),
    ...Object.keys(translations.ru),
  ])

  const register = (phrase: { en: string; uz: string; ru: string }) => {
    const variants = [phrase.en, phrase.uz, phrase.ru]

    ;(['en', 'uz', 'ru'] as AppLocale[]).forEach((locale) => {
      variants.forEach((variant) => {
        const normalized = normalizeTranslationSource(variant)

        if (normalized) {
          maps[locale].set(normalized, phrase[locale])
        }
      })
    })
  }

  allKeys.forEach((key) => {
    register({
      en: translations.en[key] ?? key,
      uz: translations.uz[key] ?? translations.en[key] ?? key,
      ru: translations.ru[key] ?? translations.en[key] ?? key,
    })
  })

  literalPhrases.forEach(register)

  return maps
}

function resolveLiteral(locale: AppLocale, value: string) {
  const normalized = normalizeTranslationSource(value)

  if (!normalized) {
    return null
  }

  return literalLookups[locale].get(normalized) ?? null
}

function withLocalePrefix(locale: AppLocale, prefix: string, subject: string) {
  if (locale === 'uz') {
    return `${subject} ${prefix}`
  }

  if (locale === 'ru') {
    return `${prefix} ${subject}`
  }

  return `${prefix} ${subject}`
}

function translatePattern(locale: AppLocale, value: string): string | null {
  const normalized = normalizeTranslationSource(value)

  if (!normalized) {
    return null
  }

  const perPageMatch = normalized.match(/^(\d+)\s+per\s+page$/)

  if (perPageMatch) {
    const amount = perPageMatch[1]
    return locale === 'uz' ? `Har sahifada ${amount} ta` : locale === 'ru' ? `${amount} на странице` : `${amount} per page`
  }

  const resultsMatch = normalized.match(/^(\d+)\s*[-–]\s*(\d+)\s+of\s+(\d+)\s+results$/)

  if (resultsMatch) {
    const [, start, end, total] = resultsMatch
    return locale === 'uz'
      ? `${start}-${end} / ${total} natija`
      : locale === 'ru'
        ? `${start}-${end} из ${total} результатов`
        : `${start}-${end} of ${total} results`
  }

  const withPenaltyMatch = normalized.match(/^(\d+)\s+with\s+penalties$/)

  if (withPenaltyMatch) {
    const amount = withPenaltyMatch[1]
    return locale === 'uz' ? `${amount} penaltili` : locale === 'ru' ? `${amount} со штрафами` : `${amount} with penalties`
  }

  const withBonusMatch = normalized.match(/^(\d+)\s+with\s+bonuses$/)

  if (withBonusMatch) {
    const amount = withBonusMatch[1]
    return locale === 'uz' ? `${amount} bonusli` : locale === 'ru' ? `${amount} с бонусами` : `${amount} with bonuses`
  }

  const stateMatch = normalized.match(/^(.+)\s+(created|updated|deleted|refreshed|loading|unavailable|failed)$/)

  if (stateMatch) {
    const [, subject, state] = stateMatch
    const localizedSubject = resolveLiteral(locale, subject) ?? subject

    if (locale === 'uz') {
      const uzStateMap: Record<string, string> = {
        created: 'yaratildi',
        updated: 'yangilandi',
        deleted: "o'chirildi",
        refreshed: 'qayta yuklandi',
        loading: 'yuklanmoqda',
        unavailable: 'mavjud emas',
        failed: 'muvaffaqiyatsiz tugadi',
      }

      return `${localizedSubject} ${uzStateMap[state]}`
    }

    if (locale === 'ru') {
      const ruStateMap: Record<string, string> = {
        created: 'создан',
        updated: 'обновлен',
        deleted: 'удален',
        refreshed: 'обновлен',
        loading: 'загружается',
        unavailable: 'недоступен',
        failed: 'завершился ошибкой',
      }

      return `${localizedSubject} ${ruStateMap[state]}`
    }

    return `${localizedSubject} ${state}`
  }

  const prefixedMatch = normalized.match(/^(back to|create|add|save|search|all|selected|active|current|total|close|view)\s+(.+)$/)

  if (prefixedMatch) {
    const [, prefix, subject] = prefixedMatch
    const localizedSubject = resolveLiteral(locale, subject) ?? subject

    if (locale === 'uz') {
      const uzPrefixMap: Record<string, string> = {
        'back to': 'qaytish',
        create: 'yaratish',
        add: "qo'shish",
        save: 'saqlash',
        search: 'qidirish',
        all: 'Barcha',
        selected: 'Tanlangan',
        active: 'Faol',
        current: 'Joriy',
        total: 'Jami',
        close: 'yopish',
        view: "ko'rish",
      }

      if (['all', 'selected', 'active', 'current', 'total'].includes(prefix)) {
        return `${uzPrefixMap[prefix]} ${localizedSubject}`
      }

      return withLocalePrefix(locale, uzPrefixMap[prefix], localizedSubject)
    }

    if (locale === 'ru') {
      const ruPrefixMap: Record<string, string> = {
        'back to': 'Назад к',
        create: 'Создать',
        add: 'Добавить',
        save: 'Сохранить',
        search: 'Поиск',
        all: 'Все',
        selected: 'Выбранные',
        active: 'Активные',
        current: 'Текущие',
        total: 'Всего',
        close: 'Закрыть',
        view: 'Посмотреть',
      }

      return `${ruPrefixMap[prefix]} ${localizedSubject}`
    }

    return `${prefix} ${localizedSubject}`
  }

  const noMatch = normalized.match(/^no\s+(.+?)(\s+yet)?$/)

  if (noMatch) {
    const [, subject, yet] = noMatch
    const localizedSubject = resolveLiteral(locale, subject) ?? subject

    if (locale === 'uz') {
      return yet ? `Hali ${localizedSubject} yo'q` : `${localizedSubject} yo'q`
    }

    if (locale === 'ru') {
      return yet ? `Пока нет ${localizedSubject}` : `Нет ${localizedSubject}`
    }

    return yet ? `No ${localizedSubject} yet` : `No ${localizedSubject}`
  }

  return null
}

export function translateLiteral(locale: AppLocale, value: string) {
  const direct = resolveLiteral(locale, value)

  if (direct) {
    return preserveCase(value, direct)
  }

  const patterned = translatePattern(locale, value)

  if (patterned) {
    return preserveCase(value, patterned)
  }

  return value
}

export function translateCurrentLiteral(value: string) {
  return translateLiteral(getStoredLocale(), value)
}

export function translate(locale: AppLocale, key: string, fallback?: string, params?: TranslationParams) {
  const template = translations[locale][key] ?? translations.en[key] ?? fallback ?? key
  return interpolate(translateLiteral(locale, template), params)
}

export function translateCurrent(key: string, fallback?: string, params?: TranslationParams) {
  return translate(getStoredLocale(), key, fallback, params)
}
