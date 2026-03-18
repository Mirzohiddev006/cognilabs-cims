import { startTransition, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAppShell } from '../../app/hooks/useAppShell'
import { useTheme } from '../../app/hooks/useTheme'
import { useAuth } from '../../features/auth/hooks/useAuth'
import { env } from '../../shared/config/env'
import { navigationItems } from '../../shared/config/navigation'
import { useToast } from '../../shared/toast/useToast'
import { Badge } from '../../shared/ui/badge'
import { Button } from '../../shared/ui/button'
import { cn } from '../../shared/lib/cn'
import { NavGlyph } from './NavGlyph'
import { getNavigationGlyphName } from './navGlyphMap'

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

const headerMetaChipClassName =
  'min-h-9 rounded-xl px-3 text-[11px] font-semibold tracking-[0.04em] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]'

export function AppHeader() {
  const navigate = useNavigate()
  const location = useLocation()
  const { toggleSidebar } = useAppShell()
  const { logout, user } = useAuth()
  const { showToast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const hideRouteContext = location.pathname.startsWith('/crm')

  const currentItem =
    [...navigationItems]
      .sort((left, right) => right.to.length - left.to.length)
      .find((item) =>
        location.pathname === item.to || location.pathname.startsWith(`${item.to}/`),
      ) ?? null

  async function handleLogout() {
    setIsSubmitting(true)

    try {
      await logout()
      showToast({
        title: 'Logged out',
        description: 'Your current session has been closed.',
        tone: 'success',
      })
      startTransition(() =>
        navigate('/auth/login', {
          replace: true,
          state: {
            statusMessage: 'Session closed. You can log in again.',
          },
        }),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const { theme, toggleTheme } = useTheme()

  return (
    <header className="relative z-10 border-b border-(--border) bg-(--shell-header-bg) px-4 py-4 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleSidebar}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-(--border) bg-(--accent-soft) text-(--foreground) shadow-lg min-[961px]:hidden"
              aria-label="Toggle navigation"
            >
              <span className="block h-0.5 w-5 bg-current shadow-[0_6px_0_currentColor,0_-6px_0_currentColor]" />
            </button>
            <div className={cn('hidden h-10 w-px bg-(--border) min-[961px]:block', hideRouteContext && 'md:hidden')} />
          </div>
          <div className="min-w-0">
            {!hideRouteContext ? (
              <div className="flex flex-wrap items-center gap-2">
                <div className="grid h-10 w-10 place-items-center rounded-xl border border-blue-500/30 bg-blue-600/10 text-blue-500 shadow-sm">
                  <NavGlyph name={getNavigationGlyphName(currentItem?.to ?? location.pathname)} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-base font-bold text-(--foreground) tracking-tight">
                    {currentItem?.label ?? env.appName}
                  </p>
                </div>
              </div>
            ) : null}
            {user ? (
              <p className={cn('text-[11px] font-semibold text-(--muted)', !hideRouteContext && 'mt-1.5')}>
                {user.name} {user.surname}
                <span className="mx-1 opacity-30">|</span>
                {user.job_title?.trim() || user.email}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex w-full md:w-auto md:justify-end">
          <div className="flex w-full flex-wrap items-center gap-2 rounded-2xl border border-(--border) bg-(--accent-soft) p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] md:w-auto md:flex-nowrap">
            <Badge className={cn(headerMetaChipClassName, 'border-blue-500/20 bg-blue-600/10 text-blue-200')}>
              {env.appEnv}
            </Badge>
            {user ? (
              <Badge className={cn(headerMetaChipClassName, 'border-(--border) bg-(--muted-surface) text-(--foreground)')}>
                {user.role}
              </Badge>
            ) : null}
            {user?.job_title?.trim() ? (
              <Badge className={cn(headerMetaChipClassName, 'border-(--border) bg-(--muted-surface) text-(--muted-strong)')}>
                {user.job_title}
              </Badge>
            ) : null}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-(--border) bg-(--muted-surface) text-(--muted) transition-colors hover:bg-(--accent-soft) hover:text-(--foreground)"
            >
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>
            <Button
              variant="secondary"
              size="md"
              className="min-h-10 rounded-xl border-(--border) bg-(--muted-surface) px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]"
              disabled={isSubmitting}
              onClick={() => void handleLogout()}
            >
              {isSubmitting ? 'Logging out...' : 'Logout'}
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
