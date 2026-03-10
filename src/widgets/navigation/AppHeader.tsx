import { startTransition, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAppShell } from '../../app/hooks/useAppShell'
import { useAuth } from '../../features/auth/hooks/useAuth'
import { useConfirm } from '../../shared/confirm/useConfirm'
import { env } from '../../shared/config/env'
import { navigationItems } from '../../shared/config/navigation'
import { useToast } from '../../shared/toast/useToast'
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
    <header className="relative z-10 border-b border-white/5 bg-black px-4 py-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={toggleSidebar}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white md:hidden"
            aria-label="Toggle navigation"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          </button>
          <div className="flex h-5 w-5 items-center justify-center text-zinc-500">
            <NavGlyph name={getNavigationGlyphName(currentItem?.to ?? location.pathname)} />
          </div>
          <h1 className="text-sm font-bold text-white tracking-tight">
            {currentItem?.label ?? env.appName}
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden items-center gap-3 md:flex">
             {user ? <span className="text-xs font-medium text-zinc-500">{user.email}</span> : null}
          </div>
          <button
            onClick={() => handleLogout('current')}
            disabled={isSubmitting !== null}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-400 hover:text-white transition-colors"
          >
             <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
             </svg>
          </button>
        </div>
      </div>
    </header>
  )
}
