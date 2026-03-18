import { useEffect, useMemo, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAppShell } from '../../app/hooks/useAppShell'
import { useTheme } from '../../app/hooks/useTheme'
import { useAuth } from '../../features/auth/hooks/useAuth'
import { env } from '../../shared/config/env'
import { cn } from '../../shared/lib/cn'
import { getAccessibleNavigation } from '../../shared/lib/permissions'
import { Badge } from '../../shared/ui/badge'
import { Button } from '../../shared/ui/button'
import { Dialog } from '../../shared/ui/dialog'
import { NavGlyph } from './NavGlyph'
import { getNavigationGlyphName } from './navGlyphMap'

function getInitials(name?: string, surname?: string) {
  return `${name?.charAt(0) ?? ''}${surname?.charAt(0) ?? ''}`.toUpperCase() || 'CI'
}

function humanizePermissionKey(value: string) {
  return value
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function AppSidebar() {
  const location = useLocation()
  const { closeSidebar, isSidebarOpen } = useAppShell()
  const { theme } = useTheme()
  const { user } = useAuth()
  const isLight = theme === 'light'
  const visibleNavigation = getAccessibleNavigation(user, { sidebarOnly: true })
  const [isMemberDialogOpen, setIsMemberDialogOpen] = useState(false)
  const activePermissions = useMemo(
    () =>
      Object.entries(user?.permissions ?? {})
        .filter(([, isEnabled]) => isEnabled)
        .map(([key]) => humanizePermissionKey(key)),
    [user?.permissions],
  )

  useEffect(() => {
    closeSidebar()
  }, [closeSidebar, location.pathname])

  function openMemberDialog() {
    if (!user) {
      return
    }

    setIsMemberDialogOpen(true)
  }

  return (
    <>
      <button
        type="button"
        aria-label="Close navigation overlay"
        onClick={closeSidebar}
        className={cn(
          'shell-scrim fixed inset-0 z-30 bg-[rgba(15,23,42,0.35)] min-[961px]:hidden',
          isSidebarOpen ? 'shell-scrim--open pointer-events-auto' : 'shell-scrim--closed pointer-events-none',
        )}
      />
      <aside
        className={cn(
          'shell-sidebar fixed inset-y-0 left-0 z-40 w-[min(88vw,320px)] p-4 min-[961px]:inset-auto min-[961px]:sticky min-[961px]:top-0 min-[961px]:h-screen min-[961px]:self-start min-[961px]:w-auto min-[961px]:p-4 min-[961px]:pr-0',
          isSidebarOpen ? 'shell-sidebar--open' : 'shell-sidebar--closed',
        )}
      >
        <div className="glass-panel flex h-full flex-col overflow-hidden rounded-xl px-3 py-3 sm:px-4">
          <div className="border-b border-[var(--border)] px-2 pb-4 pt-2">
            <div className="relative">
              <button
                type="button"
                onClick={closeSidebar}
                aria-label="Close navigation"
                className="absolute right-0 top-0 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--input-surface)] text-[var(--foreground)] shadow-[inset_0_1px_2px_rgba(0,0,0,0.08)] transition hover:bg-[var(--accent-soft)] min-[961px]:hidden"
              >
                <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d="M4 4l8 8M12 4 4 12" strokeLinecap="round" />
                </svg>
              </button>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-(--shell-label-color)">Cognilabs</p>
              <div className="mt-2 flex items-center gap-2 pr-12 min-[961px]:pr-0">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-700/20">
                  <NavGlyph name="default" />
                </div>
                <div className="min-w-0 overflow-hidden">
                  <h2 className="text-sm font-bold text-(--shell-text-primary) tracking-tight whitespace-nowrap">{env.appName}</h2>
                  <p className="text-[9px] font-medium uppercase tracking-wider text-[var(--muted)] whitespace-nowrap">Management System</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between px-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted)]">Menu</p>
            <Badge>{visibleNavigation.length} modules</Badge>
          </div>

          <nav className="mt-3 flex flex-1 flex-col gap-1 overflow-y-auto pr-1">
            {visibleNavigation.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                aria-label={item.label}
                className={({ isActive }) =>
                  cn(
                    'group relative flex items-center gap-3 overflow-hidden rounded-xl border px-3 py-2.5 text-sm transition-all duration-200',
                    isActive
                      ? isLight
                        ? 'nav-active-accent border-blue-200 bg-blue-50 text-blue-700 shadow-sm'
                        : 'nav-active-accent border-blue-500/30 bg-blue-600/10 text-white shadow-sm'
                      : 'border-transparent text-(--muted) hover:-translate-y-0.5 hover:border-(--shell-nav-inactive-border) hover:bg-(--shell-nav-hover-bg) hover:text-(--shell-nav-hover-text)',
                  )
                }
              >
                <div className={cn(
                  'grid place-items-center border text-(--muted-strong) transition-all duration-150',
                  'h-8 w-8 rounded-lg border-(--shell-icon-border) bg-(--shell-icon-bg) group-hover:scale-105',
                )}>
                  <NavGlyph name={getNavigationGlyphName(item.to)} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold">{item.label}</p>
                  <p className="truncate text-[9px] uppercase tracking-wider text-[var(--muted)] opacity-70">{item.group}</p>
                </div>
              </NavLink>
            ))}
          </nav>

          <button
            type="button"
            onClick={openMemberDialog}
            disabled={!user}
            className="mt-4 w-full rounded-[22px] border border-(--shell-profile-border) bg-(--shell-profile-bg) p-4 text-left shadow-[0_18px_40px_rgba(0,0,0,0.28)] transition duration-200 hover:-translate-y-0.5 hover:border-(--shell-profile-hover-border) hover:bg-(--shell-profile-hover-bg) disabled:cursor-default disabled:opacity-80"
            aria-label="Open member details"
          >
            <div className="flex items-start gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-blue-400/30 bg-[linear-gradient(180deg,#3b82f6,#2563eb)] text-sm font-bold text-white shadow-lg shadow-blue-900/30">
                {getInitials(user?.name, user?.surname)}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className="text-xs font-bold leading-4 text-(--shell-text-primary) wrap-anywhere"
                  title={user ? `${user.name} ${user.surname}` : 'Authenticated user'}
                >
                  {user ? `${user.name} ${user.surname}` : 'Authenticated user'}
                </p>
                <p
                  className="mt-1 truncate text-[10px] text-[var(--muted)]"
                  title={user?.email ?? user?.role ?? 'User'}
                >
                  {user?.email ?? user?.role ?? 'User'}
                </p>
                {user?.job_title?.trim() ? (
                  <p className={cn('mt-1 truncate text-[10px] font-medium', isLight ? 'text-blue-700/75' : 'text-blue-100/75')} title={user.job_title}>
                    {user.job_title}
                  </p>
                ) : null}
              </div>
            </div>
          </button>
        </div>
      </aside>

      <Dialog
        open={isMemberDialogOpen}
        onClose={() => setIsMemberDialogOpen(false)}
        title={user ? `${user.name} ${user.surname}` : 'Member details'}
        description={user?.email ?? 'Current authenticated user'}
        size="lg"
        footer={
          <Button variant="secondary" onClick={() => setIsMemberDialogOpen(false)}>
            Close
          </Button>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] px-5 py-4">
            <p className={cn('text-[10px] font-semibold uppercase tracking-[0.22em]', isLight ? 'text-blue-700/75' : 'text-blue-300/75')}>Role</p>
            <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">{user?.role ?? 'User'}</p>
          </div>
          <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] px-5 py-4">
            <p className={cn('text-[10px] font-semibold uppercase tracking-[0.22em]', isLight ? 'text-blue-700/75' : 'text-blue-300/75')}>Company code</p>
            <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">{user?.company_code ?? '-'}</p>
          </div>
          <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] px-5 py-4">
            <p className={cn('text-[10px] font-semibold uppercase tracking-[0.22em]', isLight ? 'text-blue-700/75' : 'text-blue-300/75')}>Job title</p>
            <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">{user?.job_title ?? '-'}</p>
          </div>
          <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] px-5 py-4">
            <p className={cn('text-[10px] font-semibold uppercase tracking-[0.22em]', isLight ? 'text-blue-700/75' : 'text-blue-300/75')}>Email</p>
            <p className="mt-2 text-base font-semibold text-[var(--foreground)] break-all">{user?.email ?? '-'}</p>
          </div>
          <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] px-5 py-4">
            <p className={cn('text-[10px] font-semibold uppercase tracking-[0.22em]', isLight ? 'text-blue-700/75' : 'text-blue-300/75')}>Status</p>
            <div className="mt-2 flex items-center gap-2">
              <span className={cn('status-dot', user?.is_active ? 'status-dot-success' : 'status-dot-muted')} />
              <p className="text-base font-semibold text-[var(--foreground)]">{user?.is_active ? 'Active' : 'Inactive'}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-[24px] border border-[var(--border)] bg-[var(--muted-surface)] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className={cn('text-[10px] font-semibold uppercase tracking-[0.22em]', isLight ? 'text-blue-700/75' : 'text-blue-300/75')}>Permissions</p>
              <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">{activePermissions.length} enabled</p>
            </div>
            <Badge className={cn('rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.14em]', isLight ? 'border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]' : 'border-white/15 bg-white/8 text-white')}>
              {env.appEnv}
            </Badge>
          </div>

          {activePermissions.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {activePermissions.map((permission) => (
                <Badge
                  key={permission}
                  className={cn('rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.12em]', isLight ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-blue-500/20 bg-blue-600/10 text-blue-100')}
                >
                  {permission}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-[var(--muted)]">No active permissions available.</p>
          )}
        </div>
      </Dialog>
    </>
  )
}
