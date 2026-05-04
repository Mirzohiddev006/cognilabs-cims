/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAppShell } from '../../app/hooks/useAppShell'
import { useLocale } from '../../app/hooks/useLocale'
import { useTheme } from '../../app/hooks/useTheme'
import { useAuth } from '../../features/auth/hooks/useAuth'
import { authService } from '../../shared/api/services/auth.service'
import { env } from '../../shared/config/env'
import { useAsyncData } from '../../shared/hooks/useAsyncData'
import { cn } from '../../shared/lib/cn'
import { getAccessibleNavigation } from '../../shared/lib/permissions'
import { getApiErrorMessage } from '../../shared/lib/api-error'
import { resolveMediaUrl } from '../../shared/lib/media-url'
import { useToast } from '../../shared/toast/useToast'
import { Badge } from '../../shared/ui/badge'
import { Button } from '../../shared/ui/button'
import { Dialog } from '../../shared/ui/dialog'
import { Input } from '../../shared/ui/input'
import { PROJECTS_NAVIGATION_UPDATED_EVENT } from '../../features/projects/lib/navigationSync'
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

type MemberProfileFormState = {
  name: string
  surname: string
  current_password: string
  new_password: string
}

// ─── Shared nav-item style helpers ──────────────────────────────────────────
// Every item in the sidebar — top-level routes AND project sub-entries — uses
// these helpers so borders, radii, padding and colour logic are identical.

function navItemBase() {
  return 'group relative flex min-w-0 items-center gap-3 overflow-hidden rounded-2xl border px-3.5 py-3 text-sm transition-all duration-200'
}

function navItemActive(isLight: boolean) {
  return isLight
    ? 'nav-active-accent border-blue-200 bg-[linear-gradient(180deg,#EFF6FF,#E7F0FF)] text-blue-700 shadow-[0_10px_24px_rgba(37,99,235,0.10)]'
    : 'nav-active-accent border-blue-500/30 bg-blue-600/10 text-white shadow-sm'
}

function navItemInactive() {
  return 'border-transparent bg-transparent text-(--muted) hover:-translate-y-0.5 hover:border-(--shell-nav-inactive-border) hover:bg-(--shell-nav-hover-bg) hover:text-(--shell-nav-hover-text)'
}

function navIconBase() {
  return 'grid shrink-0 place-items-center border text-(--muted-strong) transition-all duration-150 h-9 w-9 rounded-xl border-(--shell-icon-border) bg-(--shell-icon-bg) group-hover:scale-105'
}

// Small coloured dot used in the project icon slot to represent a project
function ProjectDot({ isActive, isLight }: { isActive: boolean; isLight: boolean }) {
  return (
    <div
      className={cn(
        'h-2.5 w-2.5 rounded-full transition-all duration-150',
        isActive
          ? isLight
            ? 'bg-blue-500 shadow-[0_0_0_3px_rgba(59,130,246,0.18)]'
            : 'bg-blue-400 shadow-[0_0_0_3px_rgba(96,165,250,0.18)]'
          : 'bg-[var(--muted)] group-hover:bg-[var(--foreground)]',
      )}
    />
  )
}

export function AppSidebar() {
  const location = useLocation()
  const { closeSidebar, isSidebarCollapsed, isSidebarOpen, toggleSidebar, toggleSidebarCollapsed } = useAppShell()
  const { t } = useLocale()
  const { theme } = useTheme()
  const { showToast } = useToast()
  const { user, refreshUser } = useAuth()
  const isLight = theme === 'light'
  const [isMobileViewport, setIsMobileViewport] = useState(
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 960px)').matches : false,
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mediaQuery = window.matchMedia('(max-width: 960px)')
    const handleChange = (event: MediaQueryListEvent) => setIsMobileViewport(event.matches)
    setIsMobileViewport(mediaQuery.matches)
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const visibleNavigation = getAccessibleNavigation(user, { sidebarOnly: true })
  const sidebarNavigation = useMemo(() => visibleNavigation, [visibleNavigation])
  const hasProjectsAccess = sidebarNavigation.some((item) => item.to === '/projects')
  const isProjectsRoute =
    location.pathname === '/projects' ||
    location.pathname.startsWith('/projects/') ||
    location.pathname.startsWith('/boards/')

  const [isMemberDialogOpen, setIsMemberDialogOpen] = useState(false)
  const [isEditingMember, setIsEditingMember] = useState(false)
  const [memberForm, setMemberForm] = useState<MemberProfileFormState>({
    name: '',
    surname: '',
    current_password: '',
    new_password: '',
  })
  const [isSavingMember, setIsSavingMember] = useState(false)
  const [isProjectsExpanded, setIsProjectsExpanded] = useState(isProjectsRoute)
  const shouldLoadProjects = hasProjectsAccess && Boolean(user) && (isProjectsExpanded || isProjectsRoute)
  const [projectsRefreshKey, setProjectsRefreshKey] = useState(0)
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null)
  const profileImageInputRef = useRef<HTMLInputElement>(null)

  const activePermissions = useMemo(
    () =>
      Object.entries(user?.permissions ?? {})
        .filter(([, isEnabled]) => isEnabled)
        .map(([key]) => humanizePermissionKey(key)),
    [user?.permissions],
  )

  const getNavigationLabel = (path: string, fallback: string) => t(`nav.${path}.label`, fallback)

  const projectsQuery = useAsyncData(
    async () => {
      const { projectsService } = await import('../../shared/api/services/projects.service')
      return projectsService.listReadableProjects(user?.id)
    },
    [projectsRefreshKey, shouldLoadProjects, user?.id],
    { enabled: shouldLoadProjects },
  )

  const sidebarProjects = useMemo(
    () =>
      [...(projectsQuery.data?.projects ?? [])].sort((left, right) =>
        left.project_name.localeCompare(right.project_name),
      ),
    [projectsQuery.data?.projects],
  )

  const resolvedUserProfileImage = resolveMediaUrl(user?.profile_image) ?? user?.profile_image ?? null
  const profilePreviewUrl = useMemo(() => {
    if (!profileImageFile) return resolvedUserProfileImage
    return URL.createObjectURL(profileImageFile)
  }, [profileImageFile, resolvedUserProfileImage])

  useEffect(() => { closeSidebar() }, [closeSidebar, location.pathname])
  useEffect(() => { if (isProjectsRoute) setIsProjectsExpanded(true) }, [isProjectsRoute])

  useEffect(() => {
    if (!hasProjectsAccess) return
    function handleProjectsNavigationUpdated() {
      setProjectsRefreshKey((c) => c + 1)
    }
    window.addEventListener(PROJECTS_NAVIGATION_UPDATED_EVENT, handleProjectsNavigationUpdated)
    return () => window.removeEventListener(PROJECTS_NAVIGATION_UPDATED_EVENT, handleProjectsNavigationUpdated)
  }, [hasProjectsAccess])

  useEffect(() => {
    if (!profileImageFile || !profilePreviewUrl?.startsWith('blob:')) return
    return () => { URL.revokeObjectURL(profilePreviewUrl) }
  }, [profileImageFile, profilePreviewUrl])

  function openMemberDialog() {
    if (!user) return
    setMemberForm({ name: user.name ?? '', surname: user.surname ?? '', current_password: '', new_password: '' })
    setProfileImageFile(null)
    setIsEditingMember(false)
    setIsMemberDialogOpen(true)
  }

  function toggleProjectsExpanded() {
    setIsProjectsExpanded((c) => !c)
  }

  function closeMemberDialog() {
    setIsMemberDialogOpen(false)
    setIsEditingMember(false)
    setProfileImageFile(null)
  }

  function handleSidebarToggle() {
    if (isMobileViewport) { toggleSidebar(); return }
    toggleSidebarCollapsed()
  }

  function updateMemberForm<K extends keyof MemberProfileFormState>(key: K, value: MemberProfileFormState[K]) {
    setMemberForm((c) => ({ ...c, [key]: value }))
  }

  async function handleSaveMemberProfile() {
    if (!user) return
    const nextName = memberForm.name.trim()
    const nextSurname = memberForm.surname.trim()
    const currentPassword = memberForm.current_password.trim()
    const newPassword = memberForm.new_password.trim()

    if (!nextName || !nextSurname) {
      showToast({ title: t('profile.update_failed'), description: t('profile.fill_required', 'Name and surname are required.'), tone: 'error' })
      return
    }
    if ((currentPassword && !newPassword) || (!currentPassword && newPassword)) {
      showToast({ title: t('profile.update_failed'), description: t('profile.password_pair_required', 'Both password fields must be filled to change the password.'), tone: 'error' })
      return
    }
    const hasNameChange = nextName !== (user.name ?? '') || nextSurname !== (user.surname ?? '')
    const hasPasswordChange = Boolean(currentPassword || newPassword)
    const hasImageChange = profileImageFile instanceof File
    if (!hasNameChange && !hasPasswordChange && !hasImageChange) {
      showToast({ title: t('profile.no_changes_title', 'No profile changes'), description: t('profile.no_changes_description', 'Update a field, password, or photo before saving.'), tone: 'error' })
      return
    }

    setIsSavingMember(true)
    try {
      await authService.updateProfile({ name: nextName, surname: nextSurname, current_password: currentPassword || undefined, new_password: newPassword || undefined, image: profileImageFile })
      await refreshUser()
      setMemberForm({ name: nextName, surname: nextSurname, current_password: '', new_password: '' })
      setProfileImageFile(null)
      setIsEditingMember(false)
      showToast({ title: t('profile.updated'), tone: 'success' })
    } catch (error) {
      showToast({ title: t('profile.update_failed'), description: getApiErrorMessage(error), tone: 'error' })
    } finally {
      setIsSavingMember(false)
    }
  }

  return (
    <>
      {/* Mobile scrim */}
      <button
        type="button"
        aria-label={t('shell.close_navigation_overlay')}
        onClick={closeSidebar}
        className={cn(
          'shell-scrim fixed inset-0 z-30 bg-[rgba(15,23,42,0.35)] min-[961px]:hidden',
          isSidebarOpen ? 'shell-scrim--open pointer-events-auto' : 'shell-scrim--closed pointer-events-none',
        )}
      />

      <aside
        className={cn(
          'shell-sidebar fixed inset-y-0 left-0 z-40 w-[min(88vw,320px)] p-4 min-[961px]:inset-auto min-[961px]:sticky min-[961px]:top-0 min-[961px]:h-screen min-[961px]:self-start min-[961px]:w-auto min-[961px]:overflow-hidden min-[961px]:p-4 min-[961px]:pr-0',
          isSidebarOpen ? 'shell-sidebar--open' : 'shell-sidebar--closed',
          isSidebarCollapsed
            ? 'min-[961px]:pointer-events-none min-[961px]:!w-0 min-[961px]:!p-0 min-[961px]:opacity-0'
            : 'min-[961px]:opacity-100',
        )}
      >
        <div className="glass-panel flex h-full flex-col overflow-hidden rounded-[30px] bg-[linear-gradient(180deg,var(--surface-elevated),var(--surface))] px-3 py-4 shadow-[0_18px_48px_rgba(15,23,42,0.12)] sm:px-4">

          {/* ── Logo / brand toggle ── */}
          <button
            type="button"
            onClick={handleSidebarToggle}
            aria-label={t('shell.toggle_navigation')}
            className="flex w-full items-center gap-3 border-b border-[var(--border)] px-2 pb-4 text-left transition-colors hover:bg-[var(--accent-soft)]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/35"
          >
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(180deg,#3B82F6,#1D4ED8)] text-white shadow-[0_14px_28px_rgba(37,99,235,0.28)] ring-1 ring-blue-400/25">
              <span className="text-[11px] font-extrabold tracking-[0.18em]">CI</span>
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <h2 className="truncate text-[14px] font-bold text-(--shell-text-primary) tracking-tight">{env.appName}</h2>
              <p className="ui-eyebrow truncate text-[var(--muted)]">{t('shell.management_system')}</p>
            </div>
          </button>

          {/* ── Menu label + badge ── */}
          <div className="mt-5 flex items-center justify-between px-2">
            <p className="ui-eyebrow text-[var(--muted)]">{t('shell.menu')}</p>
            <Badge className="rounded-full border-[var(--border)] bg-[var(--surface-elevated)] px-2.5 py-1 shadow-sm">
              {sidebarNavigation.length} {t('shell.modules')}
            </Badge>
          </div>

          {/* ── Navigation list ── */}
          <nav className="mt-3 flex flex-1 flex-col gap-1.5 overflow-y-auto pr-1">
            {sidebarNavigation.map((item) => {
              const itemLabel = getNavigationLabel(item.to, item.label)

              // ── Projects: collapsible with sub-items ──
              if (item.to === '/projects') {
                return (
                  <div key={item.to} className="flex flex-col gap-1.5">
                    {/* Projects parent card */}
                    <div className="relative">
                      <NavLink
                        to={item.to}
                        aria-label={itemLabel}
                        onClick={() => setIsProjectsExpanded(true)}
                        className={({ isActive }) =>
                          cn(
                            navItemBase(),
                            'pr-12',
                            isActive || isProjectsRoute ? navItemActive(isLight) : navItemInactive(),
                          )
                        }
                      >
                        <div className={navIconBase()}>
                          <NavGlyph name={getNavigationGlyphName(item.to)} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="ui-body truncate font-semibold">{itemLabel}</p>
                            {sidebarProjects.length > 0 && (
                              <Badge
                                size="sm"
                                variant={isProjectsRoute ? 'blue' : 'secondary'}
                                className="rounded-full px-1.5 py-0 shadow-none"
                              >
                                {sidebarProjects.length}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </NavLink>

                      {/* Expand / collapse toggle */}
                      <button
                        type="button"
                        onClick={toggleProjectsExpanded}
                        aria-label={isProjectsExpanded ? t('shell.collapse_projects') : t('shell.expand_projects')}
                        className={cn(
                          'absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl border transition-colors',
                          isProjectsRoute
                            ? isLight
                              ? 'border-blue-200 bg-blue-100/80 text-blue-700'
                              : 'border-blue-500/30 bg-blue-600/15 text-blue-100'
                            : 'border-transparent bg-transparent text-[var(--muted)] hover:border-[var(--border)] hover:bg-[var(--accent-soft)] hover:text-[var(--foreground)]',
                        )}
                      >
                        <svg
                          viewBox="0 0 16 16"
                          className={cn('h-3.5 w-3.5 transition-transform duration-200', isProjectsExpanded && 'rotate-180')}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                        >
                          <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </div>

                    {/* ── Project sub-items ─────────────────────────────────────────────────
                         Each project uses the exact same card shape as top-level nav items:
                         rounded-2xl, same border, same px-3.5 py-3, same active colours.
                         Only difference: a 14px left-margin indent to signal hierarchy.
                    ──────────────────────────────────────────────────────────────────────── */}
                    {isProjectsExpanded && (
                      <div className="ml-3.5 flex flex-col gap-1.5 max-h-[34vh] overflow-y-auto pr-0.5">
                        {projectsQuery.isLoading ? (
                          // Loading skeletons — same height as real cards
                          Array.from({ length: 4 }).map((_, i) => (
                            <div
                              key={i}
                              className="h-[52px] animate-pulse rounded-2xl border border-transparent bg-[var(--muted-surface)]"
                            />
                          ))
                        ) : projectsQuery.isError ? (
                          <button
                            type="button"
                            onClick={() => void projectsQuery.refetch()}
                            className={cn(
                              navItemBase(),
                              'border-[var(--danger-border)] bg-[var(--danger-dim)] text-[var(--danger-text)] hover:bg-red-500/10',
                            )}
                          >
                            <div className={cn(navIconBase(), 'text-[var(--danger-text)]')}>
                              <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                                <circle cx="8" cy="8" r="6" />
                                <path d="M8 5v3M8 11h.01" strokeLinecap="round" />
                              </svg>
                            </div>
                            <p className="ui-body truncate font-semibold">
                              {t('shell.failed_load_projects')} — {t('shell.retry')}
                            </p>
                          </button>
                        ) : sidebarProjects.length === 0 ? (
                          <div className={cn(navItemBase(), 'border-transparent text-[var(--muted)] cursor-default')}>
                            <div className={navIconBase()}>
                              <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                                <rect x="2" y="4" width="12" height="9" rx="1.5" />
                                <path d="M5 4V3a1 1 0 011-1h4a1 1 0 011 1v1" strokeLinecap="round" />
                              </svg>
                            </div>
                            <p className="ui-body truncate font-semibold">{t('shell.no_projects')}</p>
                          </div>
                        ) : (
                          sidebarProjects.map((project) => {
                            const isActiveProject =
                              location.pathname === `/projects/${project.id}` ||
                              location.pathname.startsWith(`/projects/${project.id}/`) ||
                              location.pathname.startsWith(`/boards/`) // board belongs to a project

                            return (
                              <NavLink
                                key={project.id}
                                to={`/projects/${project.id}`}
                                className={({ isActive }) =>
                                  cn(
                                    navItemBase(),
                                    isActive || isActiveProject
                                      ? navItemActive(isLight)
                                      : navItemInactive(),
                                  )
                                }
                              >
                                {/* Icon slot — same dimensions as top-level icons */}
                                {({ isActive }: { isActive: boolean }) => (
                                  <>
                                    <div className={navIconBase()}>
                                      <ProjectDot isActive={isActive || isActiveProject} isLight={isLight} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center justify-between gap-2">
                                        <p className="ui-body truncate font-semibold">{project.project_name}</p>
                                        {project.boards_count > 0 && (
                                          <Badge
                                            size="sm"
                                            variant={isActive || isActiveProject ? 'blue' : 'secondary'}
                                            className="shrink-0 rounded-full px-1.5 py-0 shadow-none"
                                          >
                                            {project.boards_count}
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  </>
                                )}
                              </NavLink>
                            )
                          })
                        )}
                      </div>
                    )}
                  </div>
                )
              }

              // ── Standard nav item ──
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  aria-label={itemLabel}
                  className={({ isActive }) =>
                    cn(navItemBase(), isActive ? navItemActive(isLight) : navItemInactive())
                  }
                >
                  <div className={navIconBase()}>
                    <NavGlyph name={getNavigationGlyphName(item.to)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="ui-body truncate font-semibold">{itemLabel}</p>
                  </div>
                </NavLink>
              )
            })}
          </nav>

          {/* ── User profile card ── */}
          <button
            type="button"
            onClick={openMemberDialog}
            disabled={!user}
            className="mt-5 w-full rounded-[26px] border border-(--shell-profile-border) bg-(--shell-profile-bg) p-4 text-left shadow-[0_18px_40px_rgba(0,0,0,0.20)] transition duration-200 hover:-translate-y-0.5 hover:border-(--shell-profile-hover-border) hover:bg-(--shell-profile-hover-bg) disabled:cursor-default disabled:opacity-80"
            aria-label={t('profile.member_details')}
          >
            <div className="flex items-start gap-3">
              {resolvedUserProfileImage ? (
                <img
                  src={resolvedUserProfileImage}
                  alt={user ? `${user.name} ${user.surname}` : t('shell.authenticated_user')}
                  className="h-12 w-12 shrink-0 rounded-full border border-blue-400/30 object-cover shadow-lg shadow-blue-900/30"
                />
              ) : (
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-blue-400/30 bg-[linear-gradient(180deg,#3b82f6,#2563eb)] text-sm font-bold text-white shadow-lg shadow-blue-900/30">
                  {getInitials(user?.name, user?.surname)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p
                  className="text-xs font-bold leading-4 text-(--shell-text-primary) wrap-anywhere"
                  title={user ? `${user.name} ${user.surname}` : t('shell.authenticated_user')}
                >
                  {user ? `${user.name} ${user.surname}` : t('shell.authenticated_user')}
                </p>
                <p
                  className="ui-helper mt-1 truncate text-[var(--muted)]"
                  title={user?.email ?? user?.role ?? t('shell.user')}
                >
                  {user?.email ?? user?.role ?? t('shell.user')}
                </p>
              </div>
            </div>
          </button>
        </div>
      </aside>

      {/* ── Profile Dialog ── */}
      <Dialog
        open={isMemberDialogOpen}
        onClose={closeMemberDialog}
        title={user ? `${user.name} ${user.surname}` : t('profile.member_details')}
        description={user?.email ?? t('profile.current_user')}
        size="lg"
        footer={
          isEditingMember ? (
            <>
              <Button variant="secondary" onClick={() => setIsEditingMember(false)} disabled={isSavingMember}>
                {t('shell.cancel')}
              </Button>
              <Button onClick={() => void handleSaveMemberProfile()} disabled={isSavingMember}>
                {isSavingMember ? `${t('shell.save_changes')}...` : t('shell.save_changes')}
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={closeMemberDialog}>
                {t('shell.close')}
              </Button>
              <Button onClick={() => setIsEditingMember(true)}>
                {t('shell.edit')}
              </Button>
            </>
          )
        }
      >
        <input
          ref={profileImageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null
            setProfileImageFile(file)
            event.target.value = ''
          }}
        />

        <div className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-[var(--border)] bg-[var(--muted-surface)] p-5">
          <div className="flex min-w-0 items-center gap-4">
            {profilePreviewUrl ? (
              <img
                src={profilePreviewUrl}
                alt={user ? `${user.name} ${user.surname}` : t('profile.member_details')}
                className="h-20 w-20 shrink-0 rounded-full border border-[var(--border)] object-cover"
              />
            ) : (
              <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full border border-blue-400/30 bg-[linear-gradient(180deg,#3b82f6,#2563eb)] text-xl font-bold text-white shadow-lg shadow-blue-900/30">
                {getInitials(user?.name, user?.surname)}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--foreground)]">
                {user ? `${user.name} ${user.surname}` : t('profile.member_details')}
              </p>
              <p className="ui-helper mt-1 text-[var(--muted)]">
                {profileImageFile
                  ? profileImageFile.name
                  : t('profile.photo_hint', 'Upload a new profile photo if needed.')}
              </p>
            </div>
          </div>
          {isEditingMember && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => profileImageInputRef.current?.click()}
              disabled={isSavingMember}
            >
              {resolvedUserProfileImage || profileImageFile
                ? t('profile.change_photo', 'Change photo')
                : t('profile.upload_photo', 'Upload photo')}
            </Button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] px-5 py-4">
            <p className={cn('ui-card-label', isLight ? 'text-blue-700/75' : 'text-blue-300/75')}>{t('profile.role')}</p>
            <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">{user?.role ?? t('shell.user')}</p>
          </div>
          <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] px-5 py-4">
            <p className={cn('ui-card-label', isLight ? 'text-blue-700/75' : 'text-blue-300/75')}>{t('profile.company_code')}</p>
            <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">{user?.company_code ?? '-'}</p>
          </div>
          <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] px-5 py-4">
            <p className={cn('ui-card-label', isLight ? 'text-blue-700/75' : 'text-blue-300/75')}>{t('profile.job_title')}</p>
            <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">{user?.job_title ?? '-'}</p>
          </div>
          <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] px-5 py-4">
            <p className={cn('ui-card-label', isLight ? 'text-blue-700/75' : 'text-blue-300/75')}>{t('profile.email')}</p>
            <p className="mt-2 text-base font-semibold text-[var(--foreground)] break-all">{user?.email ?? '-'}</p>
          </div>
          <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] px-5 py-4">
            <p className={cn('ui-card-label', isLight ? 'text-blue-700/75' : 'text-blue-300/75')}>{t('profile.status')}</p>
            <div className="mt-2 flex items-center gap-2">
              <span className={cn('status-dot', user?.is_active ? 'status-dot-success' : 'status-dot-muted')} />
              <p className="text-base font-semibold text-[var(--foreground)]">
                {user?.is_active ? t('status.active', 'Active') : t('status.inactive', 'Inactive')}
              </p>
            </div>
          </div>
          {isEditingMember && (
            <>
              <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] px-5 py-4">
                <p className={cn('ui-input-label', isLight ? 'text-blue-700/75' : 'text-blue-300/75')}>{t('profile.name')}</p>
                <Input value={memberForm.name} onChange={(e) => updateMemberForm('name', e.target.value)} className="mt-2" />
              </div>
              <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] px-5 py-4">
                <p className={cn('ui-input-label', isLight ? 'text-blue-700/75' : 'text-blue-300/75')}>{t('profile.surname')}</p>
                <Input value={memberForm.surname} onChange={(e) => updateMemberForm('surname', e.target.value)} className="mt-2" />
              </div>
              <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] px-5 py-4">
                <p className={cn('ui-input-label', isLight ? 'text-blue-700/75' : 'text-blue-300/75')}>
                  {t('profile.current_password', 'Current password')}
                </p>
                <Input
                  type="password"
                  value={memberForm.current_password}
                  onChange={(e) => updateMemberForm('current_password', e.target.value)}
                  className="mt-2"
                  placeholder={t('profile.current_password_hint', 'Fill only if changing password')}
                />
              </div>
              <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] px-5 py-4">
                <p className={cn('ui-input-label', isLight ? 'text-blue-700/75' : 'text-blue-300/75')}>
                  {t('profile.new_password', 'New password')}
                </p>
                <Input
                  type="password"
                  value={memberForm.new_password}
                  onChange={(e) => updateMemberForm('new_password', e.target.value)}
                  className="mt-2"
                  placeholder={t('profile.new_password_hint', 'Leave blank to keep current password')}
                />
              </div>
            </>
          )}
        </div>

        <div className="mt-4 rounded-[24px] border border-[var(--border)] bg-[var(--muted-surface)] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className={cn('ui-card-label', isLight ? 'text-blue-700/75' : 'text-blue-300/75')}>{t('profile.permissions')}</p>
              <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                {activePermissions.length} {t('profile.enabled')}
              </p>
            </div>
            <Badge className={cn('rounded-full px-2.5 py-1 uppercase tracking-[0.14em]', isLight ? 'border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]' : 'border-white/15 bg-white/8 text-white')}>
              {env.appEnv}
            </Badge>
          </div>
          {activePermissions.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {activePermissions.map((permission) => (
                <Badge
                  key={permission}
                  className={cn('rounded-full px-2.5 py-1 uppercase tracking-[0.12em]', isLight ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-blue-500/20 bg-blue-600/10 text-blue-100')}
                >
                  {permission}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-[var(--muted)]">{t('profile.no_active_permissions')}</p>
          )}
        </div>
      </Dialog>
    </>
  )
}