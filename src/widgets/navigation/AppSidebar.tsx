import { useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAppShell } from '../../app/hooks/useAppShell'
import { useAuth } from '../../features/auth/hooks/useAuth'
import { env } from '../../shared/config/env'
import { cn } from '../../shared/lib/cn'
import { getAccessibleNavigation } from '../../shared/lib/permissions'
import { Badge } from '../../shared/ui/badge'
import { NavGlyph } from './NavGlyph'
import { getNavigationGlyphName } from './navGlyphMap'

function getInitials(name?: string, surname?: string) {
  return `${name?.charAt(0) ?? ''}${surname?.charAt(0) ?? ''}`.toUpperCase() || 'CI'
}

export function AppSidebar() {
  const location = useLocation()
  const { closeSidebar, isSidebarOpen } = useAppShell()
  const { user } = useAuth()
  const visibleNavigation = getAccessibleNavigation(user, { sidebarOnly: true })

  useEffect(() => {
    closeSidebar()
  }, [closeSidebar, location.pathname])

  return (
    <>
      <button
        type="button"
        aria-label="Close navigation overlay"
        onClick={closeSidebar}
        className={cn(
          'shell-scrim fixed inset-0 z-30 bg-[rgba(15,23,42,0.35)] backdrop-blur-sm transition-opacity md:hidden',
          isSidebarOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        )}
      />
      <aside
        className={cn(
          'shell-sidebar fixed inset-y-0 left-0 z-40 w-[min(88vw,320px)] p-4 transition-transform duration-300 md:static md:w-auto md:p-4 md:pr-0',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-[110%] md:translate-x-0',
        )}
      >
        <div className="glass-panel flex h-full flex-col rounded-xl px-3 py-3 sm:px-4">
          <div className="border-b border-[var(--border)] px-2 pb-4 pt-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Cognilabs</p>
            <div className="mt-2 flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--accent)] text-white shadow-sm">
                <NavGlyph name="overview" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[var(--foreground)]">{env.appName}</h2>
                <p className="text-xs text-[var(--muted)]">Admin workspace</p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between px-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Navigation</p>
            <Badge>{visibleNavigation.length} modules</Badge>
          </div>

          <nav className="mt-3 flex flex-1 flex-col gap-1 overflow-y-auto pr-1">
            {visibleNavigation.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/overview'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors duration-150',
                    isActive
                      ? 'border-[var(--border)] bg-[var(--accent-soft)] text-[var(--foreground)]'
                      : 'border-transparent text-[var(--muted-strong)] hover:border-[var(--border)] hover:bg-[var(--accent-soft)]/80 hover:text-[var(--foreground)]',
                  )
                }
              >
                <div className="grid h-8 w-8 place-items-center rounded-md border border-[var(--border)] bg-white text-[var(--muted-strong)]">
                  <NavGlyph name={getNavigationGlyphName(item.to)} />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium">{item.label}</p>
                  <p className="truncate text-xs text-[var(--muted)]">{item.group}</p>
                </div>
              </NavLink>
            ))}
          </nav>

          <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--accent-soft)]/70 p-3">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--accent)] text-sm font-semibold text-white">
                {getInitials(user?.name, user?.surname)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                  {user ? `${user.name} ${user.surname}` : 'Authenticated user'}
                </p>
                <p className="truncate text-xs text-[var(--muted)]">{user?.email ?? user?.role ?? 'User'}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-[var(--muted)]">
              <span>{user?.role ?? 'Session'}</span>
              <span>{env.appEnv}</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
