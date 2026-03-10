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
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-500">Cognilabs</p>
            <div className="mt-2 flex items-center gap-2">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-700/20">
                <NavGlyph name="default" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">{env.appName}</h2>
                <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted)]">Management System</p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between px-2">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted)]">Menu</p>
            <Badge>{visibleNavigation.length} modules</Badge>
          </div>

          <nav className="mt-3 flex flex-1 flex-col gap-1 overflow-y-auto pr-1">
            {visibleNavigation.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-all duration-300',
                    isActive
                      ? 'border-blue-500/30 bg-blue-600/10 text-white shadow-sm'
                      : 'border-transparent text-[var(--muted)] hover:bg-white/5 hover:text-white',
                  )
                }
              >
                <div className={cn(
                  "grid h-8 w-8 place-items-center rounded-lg border transition-colors",
                  "border-[var(--border)] bg-[#1a1a1a] text-[var(--muted-strong)]"
                )}>
                  <NavGlyph name={getNavigationGlyphName(item.to)} />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{item.label}</p>
                  <p className="truncate text-[10px] uppercase tracking-wider text-[var(--muted)] opacity-70">{item.group}</p>
                </div>
              </NavLink>
            ))}
          </nav>

          <div className="mt-4 rounded-2xl border border-[var(--border)] bg-white/5 p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 text-sm font-bold text-white shadow-lg shadow-blue-700/20">
                {getInitials(user?.name, user?.surname)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-white">
                  {user ? `${user.name} ${user.surname}` : 'Authenticated user'}
                </p>
                <p className="truncate text-[10px] uppercase tracking-wider text-[var(--muted)]">{user?.email ?? user?.role ?? 'User'}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">
              <span>{user?.role ?? 'Session'}</span>
              <Badge className="bg-white/10 text-white border-white/20">{env.appEnv}</Badge>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
