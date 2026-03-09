import { startTransition, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAppShell } from '../../app/hooks/useAppShell'
import { useAuth } from '../../features/auth/hooks/useAuth'
import { useConfirm } from '../../shared/confirm/useConfirm'
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
  const { confirm } = useConfirm()
  const { showToast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState<'current' | 'all' | null>(null)

  const currentItem =
    [...navigationItems]
      .sort((left, right) => right.to.length - left.to.length)
      .find((item) =>
        location.pathname === item.to || location.pathname.startsWith(`${item.to}/`),
      ) ?? null

  async function handleLogout(scope: 'current' | 'all') {
    if (scope === 'all') {
      const approved = await confirm({
        title: 'Logout from all devices?',
        description: 'All refresh tokens will be revoked and you will be logged out from all active sessions.',
        confirmLabel: 'Logout all',
        cancelLabel: 'Cancel',
        tone: 'danger',
      })

      if (!approved) {
        return
      }
    }

    setIsSubmitting(scope)

    try {
      await logout(scope)
      showToast({
        title: scope === 'all' ? 'Logged out from all sessions' : 'Logged out',
        description:
          scope === 'all'
            ? 'All refresh tokens have been successfully revoked.'
            : 'Your current session has been closed.',
        tone: 'success',
      })
      startTransition(() =>
        navigate('/auth/login', {
          replace: true,
          state: {
            statusMessage:
              scope === 'all'
                ? 'Successfully logged out from all devices.'
                : 'Session closed. You can log in again.',
          },
        }),
      )
    } finally {
      setIsSubmitting(null)
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
          <div className="flex items-center gap-2 ml-2">
            <Button
              variant="secondary"
              size="md"
              disabled={isSubmitting !== null}
              onClick={() => handleLogout('current')}
            >
              {isSubmitting === 'current' ? 'Logging out...' : 'Logout'}
            </Button>
            <Button
              variant="ghost"
              size="md"
              className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
              disabled={isSubmitting !== null}
              onClick={() => handleLogout('all')}
            >
              {isSubmitting === 'all' ? 'Closing...' : 'Logout all'}
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
