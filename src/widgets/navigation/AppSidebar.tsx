import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAppShell } from '../../app/hooks/useAppShell'
import { useLocale } from '../../app/hooks/useLocale'
import { useTheme } from '../../app/hooks/useTheme'
import { useAuth } from '../../features/auth/hooks/useAuth'
import { authService } from '../../shared/api/services/auth.service'
import { projectsService } from '../../shared/api/services/projects.service'
import { env } from '../../shared/config/env'
import { useAsyncData } from '../../shared/hooks/useAsyncData'
import { cn } from '../../shared/lib/cn'
import { getAccessibleNavigation, hasProjectsFullAccess } from '../../shared/lib/permissions'
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

export function AppSidebar() {
  const location = useLocation()
  const { closeSidebar, isSidebarCollapsed, isSidebarOpen, toggleSidebar, toggleSidebarCollapsed } = useAppShell()
  const { t } = useLocale()
  const { theme } = useTheme()
  const { showToast } = useToast()
  const { user, refreshUser } = useAuth()
  const isLight = theme === 'light'
  const isMobileViewport =
    typeof window !== 'undefined'
      ? window.matchMedia('(max-width: 960px)').matches
      : false
  const isSidebarVisible = isMobileViewport ? isSidebarOpen : !isSidebarCollapsed
  const visibleNavigation = getAccessibleNavigation(user, { sidebarOnly: true })
  const sidebarNavigation = useMemo(() => visibleNavigation, [visibleNavigation])
  const hasProjectsAccess = sidebarNavigation.some((item) => item.to === '/projects')
  const isProjectsRoute = location.pathname === '/projects' || location.pathname.startsWith('/projects/') || location.pathname.startsWith('/boards/')
  const canManageProjects = hasProjectsFullAccess(user)
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
  const getNavigationGroup = (path: string, fallback: string) => t(`nav.${path}.group`, fallback)
  const projectsQuery = useAsyncData(
    () => (
      canManageProjects || !user
        ? projectsService.listProjects()
        : projectsService.listUserOpenProjects(user.id)
    ),
    [hasProjectsAccess, projectsRefreshKey, canManageProjects, user?.id],
    { enabled: hasProjectsAccess && Boolean(user) },
  )
  const sidebarProjects = useMemo(
    () => [...(projectsQuery.data?.projects ?? [])].sort((left, right) => left.project_name.localeCompare(right.project_name)),
    [projectsQuery.data?.projects],
  )
  const resolvedUserProfileImage = resolveMediaUrl(user?.profile_image) ?? user?.profile_image ?? null
  const profilePreviewUrl = useMemo(() => {
    if (!profileImageFile) {
      return resolvedUserProfileImage
    }

    return URL.createObjectURL(profileImageFile)
  }, [profileImageFile, resolvedUserProfileImage])

  useEffect(() => {
    closeSidebar()
  }, [closeSidebar, location.pathname])

  useEffect(() => {
    if (isProjectsRoute) {
      setIsProjectsExpanded(true)
    }
  }, [isProjectsRoute])

  useEffect(() => {
    if (!hasProjectsAccess) {
      return
    }

    function handleProjectsNavigationUpdated() {
      setProjectsRefreshKey((current) => current + 1)
    }

    window.addEventListener(PROJECTS_NAVIGATION_UPDATED_EVENT, handleProjectsNavigationUpdated)

    return () => {
      window.removeEventListener(PROJECTS_NAVIGATION_UPDATED_EVENT, handleProjectsNavigationUpdated)
    }
  }, [hasProjectsAccess])

  useEffect(() => {
    if (!profileImageFile || !profilePreviewUrl?.startsWith('blob:')) {
      return
    }

    return () => {
      URL.revokeObjectURL(profilePreviewUrl)
    }
  }, [profileImageFile, profilePreviewUrl])

  function openMemberDialog() {
    if (!user) {
      return
    }

    setMemberForm({
      name: user.name ?? '',
      surname: user.surname ?? '',
      current_password: '',
      new_password: '',
    })
    setProfileImageFile(null)
    setIsEditingMember(false)
    setIsMemberDialogOpen(true)
  }

  function toggleProjectsExpanded() {
    setIsProjectsExpanded((current) => !current)
  }

  function closeMemberDialog() {
    setIsMemberDialogOpen(false)
    setIsEditingMember(false)
    setProfileImageFile(null)
  }

  function handleSidebarToggle() {
    if (isMobileViewport) {
      toggleSidebar()
      return
    }

    toggleSidebarCollapsed()
  }

  const sidebarToggleStyle = isMobileViewport
    ? {
        left: isSidebarOpen ? 'calc(min(88vw, 320px) - 3.65rem)' : '1rem',
        top: '1rem',
      }
    : {
        left: isSidebarCollapsed ? '1rem' : 'calc(var(--app-shell-sidebar-width, 272px) - 3.65rem)',
        top: '1rem',
      }

  function updateMemberForm<K extends keyof MemberProfileFormState>(key: K, value: MemberProfileFormState[K]) {
    setMemberForm((current) => ({
      ...current,
      [key]: value,
    }))
  }

  async function handleSaveMemberProfile() {
    if (!user) {
      return
    }

    const nextName = memberForm.name.trim()
    const nextSurname = memberForm.surname.trim()
    const currentPassword = memberForm.current_password.trim()
    const newPassword = memberForm.new_password.trim()

    if (!nextName || !nextSurname) {
      showToast({
        title: t('profile.update_failed'),
        description: t('profile.fill_required', 'Name and surname are required.'),
        tone: 'error',
      })
      return
    }

    if ((currentPassword && !newPassword) || (!currentPassword && newPassword)) {
      showToast({
        title: t('profile.update_failed'),
        description: t('profile.password_pair_required', 'Current password and new password must both be filled to change the password.'),
        tone: 'error',
      })
      return
    }

    const hasNameChange = nextName !== (user.name ?? '') || nextSurname !== (user.surname ?? '')
    const hasPasswordChange = Boolean(currentPassword || newPassword)
    const hasImageChange = profileImageFile instanceof File

    if (!hasNameChange && !hasPasswordChange && !hasImageChange) {
      showToast({
        title: t('profile.no_changes_title', 'No profile changes'),
        description: t('profile.no_changes_description', 'Update a field, password, or photo before saving.'),
        tone: 'error',
      })
      return
    }

    setIsSavingMember(true)

    try {
      await authService.updateProfile({
        name: nextName,
        surname: nextSurname,
        current_password: currentPassword || undefined,
        new_password: newPassword || undefined,
        image: profileImageFile,
      })
      await refreshUser()
      setMemberForm({
        name: nextName,
        surname: nextSurname,
        current_password: '',
        new_password: '',
      })
      setProfileImageFile(null)
      setIsEditingMember(false)
      showToast({ title: t('profile.updated'), tone: 'success' })
    } catch (error) {
      showToast({
        title: t('profile.update_failed'),
        description: getApiErrorMessage(error),
        tone: 'error',
      })
    } finally {
      setIsSavingMember(false)
    }
  }
  return (
    <>
      {/* Burger — faqat sidebar yopiq paytda ko'rinadi */}
      <button
        type="button"
        onClick={handleSidebarToggle}
        aria-label={t('shell.toggle_navigation')}
        style={sidebarToggleStyle}
        className={cn(
          'fixed z-50 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--foreground)] shadow-[0_14px_32px_rgba(15,23,42,0.16)] backdrop-blur-xl transition-[left,top,background-color,border-color,box-shadow,transform,opacity] duration-300 hover:-translate-y-0.5 hover:bg-[var(--accent-soft)] hover:shadow-[0_18px_36px_rgba(15,23,42,0.20)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/35 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
          isSidebarVisible
            ? 'pointer-events-none opacity-0'
            : 'bg-[var(--muted-surface)]',
        )}
      >
        <span className="relative h-4 w-4">
          <span className="absolute left-0 top-1/2 h-0.5 w-4 -translate-y-[6px] rounded-full bg-current" />
          <span className="absolute left-0 top-1/2 h-0.5 w-4 -translate-y-1/2 rounded-full bg-current" />
          <span className="absolute left-0 top-1/2 h-0.5 w-4 translate-y-[5px] rounded-full bg-current" />
        </span>
      </button>
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
          'shell-sidebar fixed inset-y-0 left-0 z-40 w-[min(88vw,320px)] p-4 min-[961px]:inset-auto min-[961px]:sticky min-[961px]:top-0 min-[961px]:h-screen min-[961px]:self-start min-[961px]:w-auto min-[961px]:overflow-hidden min-[961px]:p-4 min-[961px]:pr-0 min-[961px]:transition-[width,padding,opacity,transform] min-[961px]:duration-300',
          isSidebarOpen ? 'shell-sidebar--open' : 'shell-sidebar--closed',
          isSidebarCollapsed
            ? 'min-[961px]:pointer-events-none min-[961px]:!w-0 min-[961px]:!p-0 min-[961px]:opacity-0 min-[961px]:-translate-x-6'
            : 'min-[961px]:translate-x-0 min-[961px]:opacity-100',
        )}
      >
        <div className="glass-panel flex h-full flex-col overflow-hidden rounded-[30px] bg-[linear-gradient(180deg,var(--surface-elevated),var(--surface))] px-3 py-4 shadow-[0_18px_48px_rgba(15,23,42,0.12)] sm:px-4">
          <div className="border-b border-[var(--border)] px-2 pb-4">
            {/* Cognilabs bloki — yopish tugmasi */}
            <button
              type="button"
              onClick={handleSidebarToggle}
              className="w-full rounded-[24px] border border-[var(--border)] bg-[var(--muted-surface)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] text-left transition-opacity duration-150 hover:opacity-80 focus-visible:outline-none"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-(--shell-label-color)">Cognilabs</p>
              <div className="mt-3 flex w-full items-center gap-3 text-left">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[linear-gradient(180deg,#3B82F6,#1D4ED8)] text-white shadow-[0_14px_28px_rgba(37,99,235,0.28)] ring-1 ring-blue-400/25">
                  <span className="text-[11px] font-extrabold tracking-[0.18em]">CI</span>
                </div>
                <div className="min-w-0 overflow-hidden">
                  <h2 className="text-[14px] font-bold text-(--shell-text-primary) tracking-tight whitespace-nowrap">{env.appName}</h2>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)] whitespace-nowrap">{t('shell.management_system')}</p>
                </div>
              </div>
            </button>
          </div>

          <div className="mt-5 flex items-center justify-between px-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--muted)]">{t('shell.menu')}</p>
            <Badge className="rounded-full border-[var(--border)] bg-[var(--surface-elevated)] px-2.5 py-1 shadow-sm">
              {sidebarNavigation.length} {t('shell.modules')}
            </Badge>
          </div>

          <nav className="mt-3 flex flex-1 flex-col gap-1.5 overflow-y-auto pr-1">
            {sidebarNavigation.map((item) => {
              const itemLabel = getNavigationLabel(item.to, item.label)
              const itemGroup = getNavigationGroup(item.to, item.group)

              if (item.to === '/projects') {
                return (
                  <div key={item.to} className="space-y-1">
                    <div className="relative">
                      <NavLink
                        to={item.to}
                        aria-label={itemLabel}
                        className={({ isActive }) =>
                          cn(
                            'group relative flex items-center gap-3 overflow-hidden rounded-2xl border px-3.5 py-3 pr-12 text-sm transition-all duration-200',
                            isActive || isProjectsRoute
                              ? isLight
                                ? 'nav-active-accent border-blue-200 bg-[linear-gradient(180deg,#EFF6FF,#E7F0FF)] text-blue-700 shadow-[0_10px_24px_rgba(37,99,235,0.10)]'
                                : 'nav-active-accent border-blue-500/30 bg-blue-600/10 text-white shadow-sm'
                              : 'border-transparent bg-transparent text-(--muted) hover:-translate-y-0.5 hover:border-(--shell-nav-inactive-border) hover:bg-(--shell-nav-hover-bg) hover:text-(--shell-nav-hover-text)',
                          )
                        }
                        onClick={() => setIsProjectsExpanded(true)}
                      >
                        <div className={cn(
                          'grid place-items-center border text-(--muted-strong) transition-all duration-150',
                          'h-9 w-9 rounded-xl border-(--shell-icon-border) bg-(--shell-icon-bg) group-hover:scale-105',
                        )}>
                          <NavGlyph name={getNavigationGlyphName(item.to)} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-[13px] font-semibold">{itemLabel}</p>
                            {sidebarProjects.length > 0 ? (
                              <Badge
                                size="sm"
                                variant={isProjectsRoute ? 'blue' : 'secondary'}
                                className="rounded-full px-1.5 py-0 text-[9px] shadow-none"
                              >
                                {sidebarProjects.length}
                              </Badge>
                            ) : null}
                          </div>
                          <p className="truncate text-[9px] uppercase tracking-wider text-[var(--muted)] opacity-70">{itemGroup}</p>
                        </div>
                      </NavLink>

                      <button
                        type="button"
                        onClick={toggleProjectsExpanded}
                        aria-label={isProjectsExpanded ? t('shell.collapse_projects') : t('shell.expand_projects')}
                        className={cn(
                          'absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg border transition-colors',
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

                    {isProjectsExpanded ? (
                      <div className="ml-4 space-y-1 border-l border-[var(--border)] pl-3">
                        {projectsQuery.isLoading ? (
                          <div className="space-y-1 py-1">
                            {Array.from({ length: 4 }).map((_, index) => (
                              <div
                                key={index}
                                className="h-8 animate-pulse rounded-lg bg-[var(--muted-surface)]"
                              />
                            ))}
                          </div>
                        ) : projectsQuery.isError ? (
                          <button
                            type="button"
                            onClick={() => void projectsQuery.refetch()}
                            className="w-full rounded-lg border border-[var(--danger-border)] bg-[var(--danger-dim)] px-3 py-2 text-left text-[11px] text-[var(--danger-text)] transition hover:bg-red-500/10"
                          >
                            {t('shell.failed_load_projects')} {t('shell.retry')}
                          </button>
                        ) : sidebarProjects.length === 0 ? (
                          <p className="rounded-lg px-3 py-2 text-[11px] text-[var(--muted)]">
                            {t('shell.no_projects')}
                          </p>
                        ) : (
                          sidebarProjects.map((project) => {
                            const isActiveProject = location.pathname === `/projects/${project.id}`

                            return (
                              <NavLink
                                key={project.id}
                                to={`/projects/${project.id}`}
                                className={({ isActive }) =>
                                  cn(
                                    'flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-[12px] transition-all duration-150',
                                    'rounded-xl',
                                    isActive || isActiveProject
                                      ? isLight
                                        ? 'border-blue-200 bg-blue-50 text-blue-700'
                                        : 'border-blue-500/30 bg-blue-600/10 text-blue-100'
                                      : 'border-transparent text-[var(--muted)] hover:border-[var(--border)] hover:bg-[var(--accent-soft)] hover:text-[var(--foreground)]',
                                  )
                                }
                              >
                                <span className="truncate font-medium">{project.project_name}</span>
                                {project.boards_count > 0 ? (
                                  <span className="shrink-0 text-[10px] text-[var(--muted)]">
                                    {project.boards_count}
                                  </span>
                                ) : null}
                              </NavLink>
                            )
                          })
                        )}
                      </div>
                    ) : null}
                  </div>
                )
              }

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  aria-label={itemLabel}
                  className={({ isActive }) =>
                    cn(
                      'group relative flex items-center gap-3 overflow-hidden rounded-2xl border px-3.5 py-3 text-sm transition-all duration-200',
                      isActive
                        ? isLight
                          ? 'nav-active-accent border-blue-200 bg-[linear-gradient(180deg,#EFF6FF,#E7F0FF)] text-blue-700 shadow-[0_10px_24px_rgba(37,99,235,0.10)]'
                          : 'nav-active-accent border-blue-500/30 bg-blue-600/10 text-white shadow-sm'
                        : 'border-transparent bg-transparent text-(--muted) hover:-translate-y-0.5 hover:border-(--shell-nav-inactive-border) hover:bg-(--shell-nav-hover-bg) hover:text-(--shell-nav-hover-text)',
                    )
                  }
                >
                  <div className={cn(
                    'grid place-items-center border text-(--muted-strong) transition-all duration-150',
                    'h-9 w-9 rounded-xl border-(--shell-icon-border) bg-(--shell-icon-bg) group-hover:scale-105',
                  )}>
                    <NavGlyph name={getNavigationGlyphName(item.to)} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold">{itemLabel}</p>
                    <p className="truncate text-[9px] uppercase tracking-wider text-[var(--muted)] opacity-70">{itemGroup}</p>
                  </div>
                </NavLink>
              )
            })}
          </nav>

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
                  className="mt-1 truncate text-[10px] text-[var(--muted)]"
                  title={user?.email ?? user?.role ?? t('shell.user')}
                >
                  {user?.email ?? user?.role ?? t('shell.user')}
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
              <p className="mt-1 text-xs text-[var(--muted)]">
                {profileImageFile ? profileImageFile.name : t('profile.photo_hint', 'Upload a new profile photo if needed.')}
              </p>
            </div>
          </div>

          {isEditingMember ? (
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
          ) : null}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] px-5 py-4">
            <p className={cn('text-[10px] font-semibold uppercase tracking-[0.22em]', isLight ? 'text-blue-700/75' : 'text-blue-300/75')}>{t('profile.role')}</p>
            <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">{user?.role ?? t('shell.user')}</p>
          </div>
          <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] px-5 py-4">
            <p className={cn('text-[10px] font-semibold uppercase tracking-[0.22em]', isLight ? 'text-blue-700/75' : 'text-blue-300/75')}>{t('profile.company_code')}</p>
            <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">{user?.company_code ?? '-'}</p>
          </div>
          <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] px-5 py-4">
            <p className={cn('text-[10px] font-semibold uppercase tracking-[0.22em]', isLight ? 'text-blue-700/75' : 'text-blue-300/75')}>{t('profile.job_title')}</p>
            <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">{user?.job_title ?? '-'}</p>
          </div>
          <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] px-5 py-4">
            <p className={cn('text-[10px] font-semibold uppercase tracking-[0.22em]', isLight ? 'text-blue-700/75' : 'text-blue-300/75')}>{t('profile.email')}</p>
            <p className="mt-2 text-base font-semibold text-[var(--foreground)] break-all">{user?.email ?? '-'}</p>
          </div>
          <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] px-5 py-4">
            <p className={cn('text-[10px] font-semibold uppercase tracking-[0.22em]', isLight ? 'text-blue-700/75' : 'text-blue-300/75')}>{t('profile.status')}</p>
            <div className="mt-2 flex items-center gap-2">
              <span className={cn('status-dot', user?.is_active ? 'status-dot-success' : 'status-dot-muted')} />
              <p className="text-base font-semibold text-[var(--foreground)]">{user?.is_active ? t('status.active', 'Active') : t('status.inactive', 'Inactive')}</p>
            </div>
          </div>
          {isEditingMember ? (
            <>
              <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] px-5 py-4">
                <p className={cn('text-[10px] font-semibold uppercase tracking-[0.22em]', isLight ? 'text-blue-700/75' : 'text-blue-300/75')}>{t('profile.name')}</p>
                <Input
                  value={memberForm.name}
                  onChange={(event) => updateMemberForm('name', event.target.value)}
                  className="mt-2"
                />
              </div>
              <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] px-5 py-4">
                <p className={cn('text-[10px] font-semibold uppercase tracking-[0.22em]', isLight ? 'text-blue-700/75' : 'text-blue-300/75')}>{t('profile.surname')}</p>
                <Input
                  value={memberForm.surname}
                  onChange={(event) => updateMemberForm('surname', event.target.value)}
                  className="mt-2"
                />
              </div>
              <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] px-5 py-4">
                <p className={cn('text-[10px] font-semibold uppercase tracking-[0.22em]', isLight ? 'text-blue-700/75' : 'text-blue-300/75')}>
                  {t('profile.current_password', 'Current password')}
                </p>
                <Input
                  type="password"
                  value={memberForm.current_password}
                  onChange={(event) => updateMemberForm('current_password', event.target.value)}
                  className="mt-2"
                  placeholder={t('profile.current_password_hint', 'Fill only if changing password')}
                />
              </div>
              <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] px-5 py-4">
                <p className={cn('text-[10px] font-semibold uppercase tracking-[0.22em]', isLight ? 'text-blue-700/75' : 'text-blue-300/75')}>
                  {t('profile.new_password', 'New password')}
                </p>
                <Input
                  type="password"
                  value={memberForm.new_password}
                  onChange={(event) => updateMemberForm('new_password', event.target.value)}
                  className="mt-2"
                  placeholder={t('profile.new_password_hint', 'Leave blank to keep current password')}
                />
              </div>
            </>
          ) : null}
        </div>

        <div className="mt-4 rounded-[24px] border border-[var(--border)] bg-[var(--muted-surface)] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className={cn('text-[10px] font-semibold uppercase tracking-[0.22em]', isLight ? 'text-blue-700/75' : 'text-blue-300/75')}>{t('profile.permissions')}</p>
              <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">{activePermissions.length} {t('profile.enabled')}</p>
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
            <p className="mt-4 text-sm text-[var(--muted)]">{t('profile.no_active_permissions')}</p>
          )}
        </div>
      </Dialog>
    </>
  )
}
