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
        title: 'Barcha qurilmalardan chiqilsinmi?',
        description: 'Bu amaldan keyin barcha refresh tokenlar bekor qilinadi va foydalanuvchi barcha sessiyalardan chiqadi.',
        confirmLabel: 'Logout all',
        cancelLabel: 'Bekor qilish',
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
        title: scope === 'all' ? 'Barcha sessiyalar yopildi' : 'Session yopildi',
        description:
          scope === 'all'
            ? 'Server tomonda barcha refresh tokenlar bekor qilindi.'
            : 'Joriy qurilmadagi sessiya muvaffaqiyatli yopildi.',
        tone: 'success',
      })
      startTransition(() =>
        navigate('/auth/login', {
          replace: true,
          state: {
            statusMessage:
              scope === 'all'
                ? 'Barcha qurilmalardan chiqildi.'
                : 'Session yopildi. Qayta login qilishingiz mumkin.',
          },
        }),
      )
    } finally {
      setIsSubmitting(null)
    }
  }

  return (
    <header className="relative z-10 border-b border-[var(--border)] bg-[rgba(248,250,252,0.82)] px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleSidebar}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border)] bg-white text-[var(--foreground)] shadow-sm md:hidden"
              aria-label="Toggle navigation"
            >
              <span className="block h-0.5 w-5 bg-current shadow-[0_6px_0_currentColor,0_-6px_0_currentColor]" />
            </button>
            <div className="hidden h-9 w-px bg-[var(--border)] md:block" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-md border border-[var(--border)] bg-white text-[var(--muted-strong)] shadow-sm">
                <NavGlyph name={getNavigationGlyphName(currentItem?.to ?? location.pathname)} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold text-[var(--foreground)]">
                  {currentItem?.label ?? env.appName}
                </p>
                <p className="truncate text-sm text-[var(--muted)]">
                  {currentItem?.description ?? 'CIMS workspace'}
                </p>
              </div>
            </div>
            {user ? (
              <p className="mt-2 text-sm text-[var(--muted-strong)]">
                {user.name} {user.surname} | {user.email}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge>{env.appEnv}</Badge>
          {user ? <Badge className="bg-white text-[var(--muted-strong)]">{user.role}</Badge> : null}
          <div className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--muted-strong)] shadow-sm">
            API base: {env.apiBaseUrl}
          </div>
          <Button
            variant="secondary"
            disabled={isSubmitting !== null}
            onClick={() => handleLogout('current')}
          >
            {isSubmitting === 'current' ? 'Chiqilmoqda...' : 'Logout'}
          </Button>
          <Button
            variant="ghost"
            disabled={isSubmitting !== null}
            onClick={() => handleLogout('all')}
          >
            {isSubmitting === 'all' ? 'Yopilmoqda...' : 'Logout all'}
          </Button>
        </div>
      </div>
    </header>
  )
}
