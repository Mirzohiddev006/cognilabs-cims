import { startTransition, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAppShell } from '../../app/hooks/useAppShell'
import { useAuth } from '../../features/auth/hooks/useAuth'
import { env } from '../../shared/config/env'
import { navigationItems } from '../../shared/config/navigation'
import { useToast } from '../../shared/toast/useToast'
import { Badge } from '../../shared/ui/badge'
import { Button } from '../../shared/ui/button'
import { NavGlyph } from './NavGlyph'
import { getNavigationGlyphName } from './navGlyphMap'

export function AppHeader() {
  const navigate = useNavigate()
  const location = useLocation()
  const { toggleSidebar } = useAppShell()
  const { logout, user } = useAuth()
  const { showToast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

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
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-white/5 text-white shadow-lg md:hidden"
              aria-label="Toggle navigation"
            >
              <span className="block h-0.5 w-5 bg-current shadow-[0_6px_0_currentColor,0_-6px_0_currentColor]" />
            </button>
            <div className="hidden h-10 w-px bg-[var(--border)] md:block" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="grid h-10 w-10 place-items-center rounded-xl border border-blue-500/30 bg-blue-600/10 text-blue-500 shadow-sm">
                <NavGlyph name={getNavigationGlyphName(currentItem?.to ?? location.pathname)} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xl font-bold text-white tracking-tight">
                  {currentItem?.label ?? env.appName}
                </p>
                <p className="truncate text-xs font-medium uppercase tracking-widest text-[var(--muted)]">
                  {currentItem?.description ?? 'CIMS workspace'}
                </p>
              </div>
            </div>
            {user ? (
              <p className="mt-2 text-xs font-semibold text-[var(--muted)]">
                {user.name} {user.surname} <span className="mx-1 opacity-30">|</span> {user.email}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Badge className="bg-blue-600/10 text-blue-400 border-blue-500/20">{env.appEnv}</Badge>
          {user ? <Badge className="bg-white/5 text-white border-white/10">{user.role}</Badge> : null}
          <div className="rounded-full border border-[var(--border)] bg-white/5 px-4 py-1.5 text-xs font-bold text-[var(--muted)] shadow-sm">
            <span className="opacity-50 font-medium">API:</span> {env.apiBaseUrl}
          </div>
          <div className="ml-2 flex items-center gap-2">
            <Button
              variant="secondary"
              size="md"
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
