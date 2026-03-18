import { startTransition, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAppShell } from '../../app/hooks/useAppShell'
import { useAuth } from '../../features/auth/hooks/useAuth'
import { env } from '../../shared/config/env'
import { navigationItems } from '../../shared/config/navigation'
import { useToast } from '../../shared/toast/useToast'
import { Badge } from '../../shared/ui/badge'
import { Button } from '../../shared/ui/button'
import { cn } from '../../shared/lib/cn'
import { NavGlyph } from './NavGlyph'
import { getNavigationGlyphName } from './navGlyphMap'

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

  return (
    <header className="relative z-10 border-b border-[var(--border)] bg-black/40 px-4 py-4 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleSidebar}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-white/5 text-white shadow-lg min-[961px]:hidden"
              aria-label="Toggle navigation"
            >
              <span className="block h-0.5 w-5 bg-current shadow-[0_6px_0_currentColor,0_-6px_0_currentColor]" />
            </button>
            <div className={cn('hidden h-10 w-px bg-[var(--border)] min-[961px]:block', hideRouteContext && 'md:hidden')} />
          </div>
          <div className="min-w-0">
            {!hideRouteContext ? (
              <div className="flex flex-wrap items-center gap-2">
                <div className="grid h-10 w-10 place-items-center rounded-xl border border-blue-500/30 bg-blue-600/10 text-blue-500 shadow-sm">
                  <NavGlyph name={getNavigationGlyphName(currentItem?.to ?? location.pathname)} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-base font-bold text-white tracking-tight">
                    {currentItem?.label ?? env.appName}
                  </p>
                </div>
              </div>
            ) : null}
            {user ? (
              <p className={cn('text-[11px] font-semibold text-[var(--muted)]', !hideRouteContext && 'mt-1.5')}>
                {user.name} {user.surname}
                <span className="mx-1 opacity-30">|</span>
                {user.job_title?.trim() || user.email}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex w-full md:w-auto md:justify-end">
          <div className="flex w-full flex-wrap items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.03] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] md:w-auto md:flex-nowrap">
            <Badge className={cn(headerMetaChipClassName, 'border-blue-500/20 bg-blue-600/10 text-blue-200')}>
              {env.appEnv}
            </Badge>
            {user ? (
              <Badge className={cn(headerMetaChipClassName, 'border-white/10 bg-white/[0.05] text-white')}>
                {user.role}
              </Badge>
            ) : null}
            {user?.job_title?.trim() ? (
              <Badge className={cn(headerMetaChipClassName, 'border-white/10 bg-white/[0.05] text-white/85')}>
                {user.job_title}
              </Badge>
            ) : null}
            <Button
              variant="secondary"
              size="md"
              className="min-h-10 rounded-xl border-white/10 bg-black/40 px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]"
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
