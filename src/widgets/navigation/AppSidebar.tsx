import { useEffect, useState } from 'react'
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

function SidebarCollapseGlyph({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      {collapsed ? <path d="m8 5.75 4 4.25-4 4.25" /> : <path d="m12 5.75-4 4.25 4 4.25" />}
    </svg>
  )
}

export function AppSidebar() {
  const location = useLocation()
  const { closeSidebar, isSidebarCollapsed, isSidebarOpen, toggleSidebarCollapsed } = useAppShell()
  const { user } = useAuth()
  const visibleNavigation = getAccessibleNavigation(user, { sidebarOnly: true })
  const [showExpandedProfile, setShowExpandedProfile] = useState(() => !isSidebarCollapsed)

  useEffect(() => {
    closeSidebar()
  }, [closeSidebar, location.pathname])

  useEffect(() => {
    if (isSidebarCollapsed) {
      setShowExpandedProfile(false)
      return
    }

    const timeoutId = window.setTimeout(() => {
      setShowExpandedProfile(true)
    }, 180)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [isSidebarCollapsed])

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
          'shell-sidebar fixed inset-y-0 left-0 z-40 w-[min(88vw,320px)] p-4 transition-transform duration-300 md:sticky md:top-0 md:h-screen md:self-start md:w-auto md:p-4 md:pr-0',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-[110%] md:translate-x-0',
        )}
      >
        <div className={cn('glass-panel flex h-full flex-col overflow-hidden rounded-xl py-3', isSidebarCollapsed ? 'px-2.5' : 'px-3 sm:px-4')}>
          {isSidebarCollapsed ? (
            <div className="border-b border-[var(--border)] px-0 pb-3 pt-2">
              <div className="flex flex-col items-center gap-3">
                <button
                  type="button"
                  aria-label="Expand sidebar"
                  title="Expand sidebar"
                  onClick={toggleSidebarCollapsed}
                  className="app-shell-collapse-toggle flex h-10 w-10 items-center justify-center rounded-xl border border-white/30 bg-black/70 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-colors hover:border-white/45 hover:bg-black/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/10"
                >
                  <SidebarCollapseGlyph collapsed />
                </button>
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-700/20">
                  <NavGlyph name="default" />
                </div>
              </div>
            </div>
          ) : (
            <div className="border-b border-[var(--border)] px-2 pb-4 pt-2">
              <div className="relative">
                <button
                  type="button"
                  aria-label="Collapse sidebar"
                  title="Collapse sidebar"
                  onClick={toggleSidebarCollapsed}
                  className="app-shell-collapse-toggle absolute right-0 top-0 flex h-10 w-10 items-center justify-center rounded-xl border border-white/30 bg-black/70 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-colors hover:border-white/45 hover:bg-black/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/10"
                >
                  <SidebarCollapseGlyph collapsed={false} />
                </button>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-500">Cognilabs</p>
                <div className="mt-2 flex items-center gap-2 pr-12">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-700/20">
                    <NavGlyph name="default" />
                  </div>
                  <div className="min-w-0 overflow-hidden transition-[max-width,opacity] duration-160 ease-out delay-75 max-w-[180px] opacity-100">
                    <h2 className="text-base font-bold text-white tracking-tight whitespace-nowrap">{env.appName}</h2>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted)] whitespace-nowrap">Management System</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className={cn('mt-6 flex items-center justify-between', isSidebarCollapsed ? 'mt-4 justify-center px-0' : 'px-2')}>
            {!isSidebarCollapsed ? (
              <>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted)]">Menu</p>
                <Badge>{visibleNavigation.length} modules</Badge>
              </>
            ) : null}
          </div>

          <nav className={cn('mt-3 flex flex-1 flex-col overflow-y-auto transition-all duration-300', isSidebarCollapsed ? 'items-center gap-2' : 'gap-1 pr-1')}>
            {visibleNavigation.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                aria-label={item.label}
                title={isSidebarCollapsed ? `${item.label} (${item.group})` : undefined}
                className={({ isActive }) =>
                  cn(
                    'overflow-hidden transition-all duration-300',
                    isSidebarCollapsed
                      ? 'flex h-12 w-12 items-center justify-center rounded-xl border'
                      : 'flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm',
                    isActive
                      ? isSidebarCollapsed
                        ? 'border-blue-500/30 bg-blue-600/12 text-white shadow-sm'
                        : 'border-blue-500/30 bg-blue-600/10 text-white shadow-sm'
                      : isSidebarCollapsed
                        ? 'border-white/10 bg-white/[0.03] text-[var(--muted)] hover:bg-white/5 hover:text-white'
                        : 'border-transparent text-[var(--muted)] hover:bg-white/5 hover:text-white',
                  )
                }
              >
                <div className={cn(
                  'grid place-items-center border text-[var(--muted-strong)] transition-all duration-300',
                  isSidebarCollapsed
                    ? 'h-9 w-9 rounded-xl border-white/10 bg-black/30'
                    : 'h-8 w-8 rounded-lg border-[var(--border)] bg-[#1a1a1a]',
                )}>
                  <NavGlyph name={getNavigationGlyphName(item.to)} />
                </div>

                <div
                  className={cn(
                    'min-w-0 overflow-hidden transition-[max-width,opacity] duration-160 ease-out',
                    isSidebarCollapsed ? 'max-w-0 opacity-0 delay-0' : 'max-w-[170px] opacity-100 delay-75',
                  )}
                  aria-hidden={isSidebarCollapsed}
                >
                  <p className="truncate font-semibold">{item.label}</p>
                  <p className="truncate text-[10px] uppercase tracking-wider text-[var(--muted)] opacity-70">{item.group}</p>
                </div>
              </NavLink>
            ))}
          </nav>

          {isSidebarCollapsed || !showExpandedProfile ? (
            <div className="mt-4 flex justify-center">
              <div
                className="grid h-12 w-12 place-items-center rounded-full border border-blue-400/30 bg-[linear-gradient(180deg,#3b82f6,#2563eb)] text-sm font-bold text-white shadow-lg shadow-blue-900/30"
                title={user ? `${user.name} ${user.surname}` : 'Authenticated user'}
              >
                {getInitials(user?.name, user?.surname)}
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))] p-4 shadow-[0_18px_40px_rgba(0,0,0,0.28)]">
              <div className="flex items-start gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-blue-400/30 bg-[linear-gradient(180deg,#3b82f6,#2563eb)] text-sm font-bold text-white shadow-lg shadow-blue-900/30">
                  {getInitials(user?.name, user?.surname)}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className="text-sm font-bold leading-5 text-white [overflow-wrap:anywhere]"
                    title={user ? `${user.name} ${user.surname}` : 'Authenticated user'}
                  >
                    {user ? `${user.name} ${user.surname}` : 'Authenticated user'}
                  </p>
                  <p
                    className="mt-1 truncate text-xs text-[var(--muted)]"
                    title={user?.email ?? user?.role ?? 'User'}
                  >
                    {user?.email ?? user?.role ?? 'User'}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Badge className="rounded-full border-blue-500/20 bg-blue-600/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-blue-100">
                  {user?.role ?? 'Session'}
                </Badge>
                <Badge className="rounded-full border-white/15 bg-white/8 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-white">
                  {env.appEnv}
                </Badge>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
