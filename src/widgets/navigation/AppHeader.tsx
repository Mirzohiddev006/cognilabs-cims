import { startTransition, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useLocale } from '../../app/hooks/useLocale'
import { useTheme } from '../../app/hooks/useTheme'
import { useAuth } from '../../features/auth/hooks/useAuth'
import { env } from '../../shared/config/env'
import { navigationItems } from '../../shared/config/navigation'
import { type AppLocale, localeLabels } from '../../shared/i18n/translations'
import { useToast } from '../../shared/toast/useToast'
import { Button } from '../../shared/ui/button'
import { cn } from '../../shared/lib/cn'

function SunIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
      <circle cx="10" cy="10" r="3.5" />
      <path d="M10 2v1.5M10 16.5V18M2 10h1.5M16.5 10H18M4.22 4.22l1.06 1.06M14.72 14.72l1.06 1.06M4.22 15.78l1.06-1.06M14.72 5.28l1.06-1.06" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
      <path d="M17.5 12A7.5 7.5 0 0 1 8 2.5a7.502 7.502 0 1 0 9.5 9.5Z" />
    </svg>
  )
}

export function AppHeader() {
  const navigate = useNavigate()
  const location = useLocation()
  const { locale, setLocale, t } = useLocale()
  const { logout, user } = useAuth()
  const { showToast } = useToast()
  const { theme, toggleTheme } = useTheme()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const currentItem =
    [...navigationItems]
      .sort((a, b) => b.to.length - a.to.length)
      .find((item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)) ?? null

  const routeLabel = currentItem ? t(`nav.${currentItem.to}.label`, currentItem.label) : env.appName

  async function handleLogout() {
    setIsSubmitting(true)
    try {
      await logout()
      showToast({ title: t('shell.logged_out'), description: t('shell.session_closed'), tone: 'success' })
      startTransition(() => navigate('/auth/login', { replace: true, state: { statusMessage: t('shell.session_closed') } }))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-[var(--border-solid)] bg-[var(--shell-header-bg)] px-4 py-2.5 sm:px-6">
      {/* Left: breadcrumb / route context */}
      <div className="flex min-w-0 items-center gap-2">
        <h1 className="truncate text-[14px] font-semibold text-[var(--foreground)]">{routeLabel}</h1>
        {user ? (
          <span className="hidden text-[var(--caption)] sm:inline">—</span>
        ) : null}
        {user ? (
          <span className="hidden truncate text-[13px] text-[var(--muted)] sm:block">
            {user.name} {user.surname}
            {user.job_title?.trim() ? ` · ${user.job_title}` : ''}
          </span>
        ) : null}
      </div>

      {/* Right: controls */}
      <div className="flex shrink-0 items-center gap-1.5">
        {/* Locale switcher */}
        <div className="flex items-center rounded-[var(--radius-md)] border border-[var(--border-solid)] bg-[var(--background-alt)]">
          {(Object.keys(localeLabels) as AppLocale[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setLocale(value)}
              aria-label={`${t('shell.language')}: ${localeLabels[value]}`}
              className={cn(
                'inline-flex min-h-[28px] min-w-[36px] items-center justify-center rounded-[var(--radius-md)] px-2 text-[12px] font-medium transition-colors duration-100',
                locale === value
                  ? 'bg-[var(--background)] text-[var(--foreground)] shadow-[var(--shadow-sm)]'
                  : 'text-[var(--muted)] hover:text-[var(--foreground)]',
              )}
            >
              {localeLabels[value]}
            </button>
          ))}
        </div>

        {/* Theme toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? t('shell.switch_to_light') : t('shell.switch_to_dark')}
          className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-solid)] bg-[var(--background-alt)] text-[var(--muted)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--foreground)]"
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>

        {/* Logout */}
        <Button
          variant="secondary"
          size="sm"
          disabled={isSubmitting}
          onClick={() => void handleLogout()}
        >
          {isSubmitting ? t('shell.logging_out') : t('shell.logout')}
        </Button>
      </div>
    </header>
  )
}
