import { useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAppShell } from '../../app/hooks/useAppShell'
import { useAuth } from '../../features/auth/hooks/useAuth'
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
        <div className="flex h-full flex-col bg-black px-3 py-3 sm:px-4">
          <div className="px-2 pb-8 pt-4">
            <h2 className="text-lg font-bold text-white tracking-tight">Cognilabs</h2>
          </div>

          <div className="mt-6 flex items-center justify-between px-2">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted)]">Menu</p>
            <Badge>{visibleNavigation.length} modules</Badge>
          </div>

          <nav className="mt-2 flex flex-1 flex-col gap-1 overflow-y-auto pr-1">
            {visibleNavigation.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/overview'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300',
                  )
                }
              >
                <div className="flex h-5 w-5 items-center justify-center">
                  <NavGlyph name={getNavigationGlyphName(item.to)} />
                </div>
                <span className="truncate">{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="mt-4 border-t border-white/5 pt-4">
            <div className="flex items-center gap-3 px-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-bold text-zinc-400">
                {getInitials(user?.name, user?.surname)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-white">
                  {user ? `${user.name} ${user.surname}` : 'User'}
                </p>
                <p className="truncate text-[11px] text-zinc-500">{user?.email ?? 'Account'}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
