import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { NavLink, useLocation } from 'react-router-dom'
import { useAppShell } from '../../app/hooks/useAppShell'
import { useLocale } from '../../app/hooks/useLocale'
import { useTheme } from '../../app/hooks/useTheme'
import { useAuth } from '../../features/auth/hooks/useAuth'
import { authService } from '../../shared/api/services/auth.service'
import { env } from '../../shared/config/env'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { projectKeys } from '../../features/projects/lib/queryKeys'
import { cn } from '../../shared/lib/cn'
import { getAccessibleNavigation } from '../../shared/lib/permissions'
import { getErrorMessage } from '../../shared/lib/error'
import { resolveMediaUrl } from '../../shared/lib/media-url'
import { useToast } from '../../shared/toast/useToast'
import { Button } from '../../shared/ui/button'
import { Dialog } from '../../shared/ui/dialog'
import { Input } from '../../shared/ui/input'
import { PROJECTS_NAVIGATION_UPDATED_EVENT } from '../../features/projects/lib/navigationSync'
import { NavGlyph } from './NavGlyph'
import { getNavigationGlyphName } from './navGlyphMap'

const profileSchema = z
  .object({
    name: z.string().min(1, 'Ism majburiy'),
    surname: z.string().min(1, 'Familiya majburiy'),
    current_password: z.string(),
    new_password: z.string(),
  })
  .refine(
    (data) => !(data.current_password.trim() && !data.new_password.trim()),
    { message: 'Yangi parol majburiy', path: ['new_password'] },
  )
  .refine(
    (data) => !(!data.current_password.trim() && data.new_password.trim()),
    { message: 'Joriy parol majburiy', path: ['current_password'] },
  )

type ProfileSchema = z.infer<typeof profileSchema>

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
  const { closeSidebar, isSidebarCollapsed, isSidebarOpen, toggleSidebar, toggleSidebarCollapsed } = useAppShell()
  const { t } = useLocale()
  const { theme } = useTheme()
  const { showToast } = useToast()
  const { user, refreshUser } = useAuth()
  const isDark = theme === 'dark'
  const isMobileViewport =
    typeof window !== 'undefined'
      ? window.matchMedia('(max-width: 960px)').matches
      : false
  const isSidebarVisible = isMobileViewport ? isSidebarOpen : !isSidebarCollapsed
  const visibleNavigation = getAccessibleNavigation(user, { sidebarOnly: true })
  const sidebarNavigation = useMemo(() => visibleNavigation, [visibleNavigation])
  const hasProjectsAccess = sidebarNavigation.some((item) => item.to === '/projects')
  const isProjectsRoute = location.pathname === '/projects' || location.pathname.startsWith('/projects/') || location.pathname.startsWith('/boards/')
  const [isMemberDialogOpen, setIsMemberDialogOpen] = useState(false)
  const [isEditingMember, setIsEditingMember] = useState(false)
  const [isSavingMember, setIsSavingMember] = useState(false)
  const profileForm = useForm<ProfileSchema>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: '', surname: '', current_password: '', new_password: '' },
  })
  const [isProjectsExpanded, setIsProjectsExpanded] = useState(isProjectsRoute)
  const shouldLoadProjects = hasProjectsAccess && Boolean(user) && (isProjectsExpanded || isProjectsRoute)
  const queryClient = useQueryClient()
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
  const projectsQuery = useQuery({
    queryKey: projectKeys.list(user?.id),
    queryFn: async () => {
      const { projectsService } = await import('../../shared/api/services/projects.service')
      return projectsService.listReadableProjects(user?.id)
    },
    enabled: shouldLoadProjects,
  })
  const sidebarProjects = useMemo(
    () => [...(projectsQuery.data?.projects ?? [])].sort((a, b) => a.project_name.localeCompare(b.project_name)),
    [projectsQuery.data?.projects],
  )
  const resolvedUserProfileImage = resolveMediaUrl(user?.profile_image) ?? user?.profile_image ?? null
  const profilePreviewUrl = useMemo(() => {
    if (!profileImageFile) return resolvedUserProfileImage
    return URL.createObjectURL(profileImageFile)
  }, [profileImageFile, resolvedUserProfileImage])

  useEffect(() => {
    closeSidebar()
  }, [closeSidebar, location.pathname])

  useEffect(() => {
    if (isProjectsRoute) setIsProjectsExpanded(true)
  }, [isProjectsRoute])

  useEffect(() => {
    if (!hasProjectsAccess) return
    function handleProjectsNavigationUpdated() {
      void queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
    }
    window.addEventListener(PROJECTS_NAVIGATION_UPDATED_EVENT, handleProjectsNavigationUpdated)
    return () => {
      window.removeEventListener(PROJECTS_NAVIGATION_UPDATED_EVENT, handleProjectsNavigationUpdated)
    }
  }, [hasProjectsAccess])

  useEffect(() => {
    if (!profileImageFile || !profilePreviewUrl?.startsWith('blob:')) return
    return () => { URL.revokeObjectURL(profilePreviewUrl) }
  }, [profileImageFile, profilePreviewUrl])

  function openMemberDialog() {
    if (!user) return
    profileForm.reset({
      name: user.name ?? '',
      surname: user.surname ?? '',
      current_password: '',
      new_password: '',
    })
    setProfileImageFile(null)
    setIsEditingMember(false)
    setIsMemberDialogOpen(true)
  }

  function closeMemberDialog() {
    setIsMemberDialogOpen(false)
    setIsEditingMember(false)
    setProfileImageFile(null)
    profileForm.reset()
  }

  function handleSidebarToggle() {
    if (isMobileViewport) { toggleSidebar(); return }
    toggleSidebarCollapsed()
  }

  const sidebarToggleStyle = isMobileViewport
    ? { left: isSidebarOpen ? 'calc(min(88vw, 280px) - 3.25rem)' : '0.75rem', top: '0.75rem' }
    : { left: isSidebarCollapsed ? '0.75rem' : 'calc(var(--app-shell-sidebar-width, 240px) - 3.25rem)', top: '0.75rem' }

  async function handleSaveMemberProfile(data: ProfileSchema) {
    if (!user) return
    const nextName = data.name.trim()
    const nextSurname = data.surname.trim()
    const currentPassword = data.current_password.trim()
    const newPassword = data.new_password.trim()
    const hasNameChange = nextName !== (user.name ?? '') || nextSurname !== (user.surname ?? '')
    const hasPasswordChange = Boolean(currentPassword || newPassword)
    const hasImageChange = profileImageFile instanceof File
    if (!hasNameChange && !hasPasswordChange && !hasImageChange) {
      showToast({ title: t('profile.no_changes_title', 'No changes'), description: t('profile.no_changes_description', 'Update a field before saving.'), tone: 'error' })
      return
    }
    setIsSavingMember(true)
    try {
      await authService.updateProfile({ name: nextName, surname: nextSurname, current_password: currentPassword || undefined, new_password: newPassword || undefined, image: profileImageFile })
      await refreshUser()
      profileForm.reset({ name: nextName, surname: nextSurname, current_password: '', new_password: '' })
      setProfileImageFile(null)
      setIsEditingMember(false)
      showToast({ title: t('profile.updated'), tone: 'success' })
    } catch (error) {
      showToast({ title: t('profile.update_failed'), description: getErrorMessage(error), tone: 'error' })
    } finally {
      setIsSavingMember(false)
    }
  }

  return (
    <>
      {/* Mobile/collapse toggle */}
      <button
        type="button"
        onClick={handleSidebarToggle}
        aria-label={t('shell.toggle_navigation')}
        style={sidebarToggleStyle}
        className={cn(
          'fixed z-50 inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-lg)] border border-[var(--border-solid)] bg-[var(--background)] text-[var(--muted)] shadow-[var(--shadow-md)] transition-[left,top,opacity] duration-200 hover:bg-[var(--background-alt)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]',
          isSidebarVisible ? 'pointer-events-none opacity-0' : 'opacity-100',
        )}
      >
        <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <path d="M2.5 4h11M2.5 8h11M2.5 12h11" strokeLinecap="round" />
        </svg>
      </button>

      {/* Mobile overlay */}
      <button
        type="button"
        aria-label={t('shell.close_navigation_overlay')}
        onClick={closeSidebar}
        className={cn(
          'shell-scrim fixed inset-0 z-30 bg-[rgba(55,53,47,0.30)] min-[961px]:hidden',
          isSidebarOpen ? 'shell-scrim--open pointer-events-auto' : 'shell-scrim--closed pointer-events-none',
        )}
      />

      {/* Sidebar */}
      <aside
        className={cn(
          'shell-sidebar fixed inset-y-0 left-0 z-40 flex w-[min(88vw,280px)] flex-col border-r border-[var(--shell-sidebar-border)] bg-[var(--shell-sidebar-bg)]',
          'min-[961px]:inset-auto min-[961px]:sticky min-[961px]:top-0 min-[961px]:h-screen min-[961px]:self-start min-[961px]:overflow-hidden min-[961px]:transition-[width,opacity,transform] min-[961px]:duration-200',
          isSidebarOpen ? 'shell-sidebar--open' : 'shell-sidebar--closed',
          isSidebarCollapsed
            ? 'min-[961px]:pointer-events-none min-[961px]:!w-0 min-[961px]:opacity-0 min-[961px]:-translate-x-4'
            : 'min-[961px]:translate-x-0 min-[961px]:opacity-100',
        )}
      >
        {/* App name */}
        <div className="flex items-center gap-2.5 border-b border-[var(--shell-sidebar-border)] px-4 py-3.5">
          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-[var(--radius-md)] bg-[var(--foreground)] text-[var(--background)]">
            <span className="text-[10px] font-bold tracking-tight">CI</span>
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-[var(--shell-app-name-color)]">{env.appName}</p>
          </div>
          {/* Close for mobile */}
          <button
            type="button"
            onClick={handleSidebarToggle}
            className="ml-auto inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-[var(--muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--foreground)] min-[961px]:hidden"
            aria-label={t('shell.close_navigation_overlay')}
          >
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <path d="M4 4l8 8M12 4 4 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-2">
          {sidebarNavigation.map((item) => {
            const itemLabel = getNavigationLabel(item.to, item.label)
            const itemGroup = getNavigationGroup(item.to, item.group)

            if (item.to === '/projects') {
              return (
                <div key={item.to}>
                  <div className="relative flex items-center">
                    <NavLink
                      to={item.to}
                      aria-label={itemLabel}
                      onClick={() => setIsProjectsExpanded(true)}
                      className={({ isActive }) =>
                        cn(
                          'flex flex-1 items-center gap-2.5 rounded-[var(--radius-md)] px-2 py-1.5 text-[13px] font-medium transition-colors duration-100',
                          isActive || isProjectsRoute
                            ? 'bg-[var(--shell-nav-active-bg)] text-[var(--shell-nav-active-text)]'
                            : 'text-[var(--shell-nav-text)] hover:bg-[var(--shell-nav-hover-bg)] hover:text-[var(--shell-nav-active-text)]',
                        )
                      }
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center text-[var(--caption)]">
                        <NavGlyph name={getNavigationGlyphName(item.to)} />
                      </span>
                      <span className="truncate">{itemLabel}</span>
                      {sidebarProjects.length > 0 ? (
                        <span className="ml-auto shrink-0 rounded-full bg-[var(--border-solid)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--muted)]">
                          {sidebarProjects.length}
                        </span>
                      ) : null}
                    </NavLink>
                    <button
                      type="button"
                      onClick={() => setIsProjectsExpanded((c) => !c)}
                      aria-label={isProjectsExpanded ? t('shell.collapse_projects') : t('shell.expand_projects')}
                      className="ml-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-[var(--caption)] hover:bg-[var(--shell-nav-hover-bg)] hover:text-[var(--foreground)]"
                    >
                      <svg
                        viewBox="0 0 16 16"
                        className={cn('h-3 w-3 transition-transform duration-150', isProjectsExpanded && 'rotate-180')}
                        fill="none" stroke="currentColor" strokeWidth="1.6"
                      >
                        <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>

                  {isProjectsExpanded ? (
                    <div className="ml-4 mt-0.5 border-l border-[var(--border-solid)] pl-3 pb-1">
                      {projectsQuery.isLoading ? (
                        <div className="space-y-0.5 py-1">
                          {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="h-7 animate-pulse rounded-[var(--radius-md)] bg-[var(--background-alt)]" />
                          ))}
                        </div>
                      ) : projectsQuery.isError ? (
                        <button
                          type="button"
                          onClick={() => void queryClient.invalidateQueries({ queryKey: projectKeys.lists() })}
                          className="w-full rounded-[var(--radius-md)] px-2 py-1.5 text-left text-[12px] text-[var(--danger-text)] hover:bg-[var(--danger-dim)]"
                        >
                          {t('shell.failed_load_projects')} {t('shell.retry')}
                        </button>
                      ) : sidebarProjects.length === 0 ? (
                        <p className="px-2 py-1.5 text-[12px] text-[var(--caption)]">{t('shell.no_projects')}</p>
                      ) : (
                        sidebarProjects.map((project) => (
                          <NavLink
                            key={project.id}
                            to={`/projects/${project.id}`}
                            className={({ isActive }) =>
                              cn(
                                'flex items-center justify-between gap-2 rounded-[var(--radius-md)] px-2 py-1.5 text-[12px] transition-colors duration-100',
                                isActive
                                  ? 'bg-[var(--shell-nav-active-bg)] font-medium text-[var(--shell-nav-active-text)]'
                                  : 'text-[var(--shell-nav-text)] hover:bg-[var(--shell-nav-hover-bg)] hover:text-[var(--shell-nav-active-text)]',
                              )
                            }
                          >
                            <span className="truncate">{project.project_name}</span>
                            {project.boards_count > 0 ? (
                              <span className="shrink-0 text-[11px] text-[var(--caption)]">{project.boards_count}</span>
                            ) : null}
                          </NavLink>
                        ))
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
                aria-label={`${itemLabel} — ${itemGroup}`}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2.5 rounded-[var(--radius-md)] px-2 py-1.5 text-[13px] font-medium transition-colors duration-100',
                    isActive
                      ? 'bg-[var(--shell-nav-active-bg)] text-[var(--shell-nav-active-text)]'
                      : 'text-[var(--shell-nav-text)] hover:bg-[var(--shell-nav-hover-bg)] hover:text-[var(--shell-nav-active-text)]',
                  )
                }
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center text-[var(--caption)]">
                  <NavGlyph name={getNavigationGlyphName(item.to)} />
                </span>
                <span className="truncate">{itemLabel}</span>
              </NavLink>
            )
          })}
        </nav>

        {/* Profile */}
        <div className="border-t border-[var(--shell-sidebar-border)] p-3">
          <button
            type="button"
            onClick={openMemberDialog}
            disabled={!user}
            className="flex w-full items-center gap-2.5 rounded-[var(--radius-md)] px-2 py-2 text-left transition-colors hover:bg-[var(--shell-nav-hover-bg)] disabled:cursor-default disabled:opacity-70"
            aria-label={t('profile.member_details')}
          >
            {resolvedUserProfileImage ? (
              <img
                src={resolvedUserProfileImage}
                alt={user ? `${user.name} ${user.surname}` : t('shell.authenticated_user')}
                className="h-7 w-7 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className={cn(
                'grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-semibold',
                isDark ? 'bg-[#37352f] text-[#e6e3de]' : 'bg-[#37352f] text-white',
              )}>
                {getInitials(user?.name, user?.surname)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-[var(--shell-text-primary)]">
                {user ? `${user.name} ${user.surname}` : t('shell.authenticated_user')}
              </p>
              <p className="truncate text-[11px] text-[var(--caption)]">
                {user?.email ?? user?.role ?? t('shell.user')}
              </p>
            </div>
          </button>
        </div>
      </aside>

      {/* Profile dialog */}
      <Dialog
        open={isMemberDialogOpen}
        onClose={closeMemberDialog}
        title={user ? `${user.name} ${user.surname}` : t('profile.member_details')}
        description={user?.email ?? t('profile.current_user')}
        size="lg"
        footer={
          isEditingMember ? (
            <>
              <Button variant="ghost" onClick={() => setIsEditingMember(false)} disabled={isSavingMember}>
                {t('shell.cancel')}
              </Button>
              <Button
                loading={isSavingMember}
                onClick={() => void profileForm.handleSubmit(handleSaveMemberProfile)()}
              >
                {t('shell.save_changes')}
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={closeMemberDialog}>{t('shell.close')}</Button>
              <Button variant="secondary" onClick={() => setIsEditingMember(true)}>{t('shell.edit')}</Button>
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

        {/* Avatar row */}
        <div className="mb-4 flex items-center gap-4 rounded-[var(--radius-lg)] border border-[var(--border-solid)] bg-[var(--background-alt)] px-4 py-4">
          {profilePreviewUrl ? (
            <img
              src={profilePreviewUrl}
              alt={user ? `${user.name} ${user.surname}` : t('profile.member_details')}
              className="h-14 w-14 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#37352f] text-base font-semibold text-white">
              {getInitials(user?.name, user?.surname)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-[var(--foreground)]">
              {user ? `${user.name} ${user.surname}` : t('profile.member_details')}
            </p>
            <p className="mt-0.5 text-[12px] text-[var(--muted)]">
              {profileImageFile ? profileImageFile.name : t('profile.photo_hint', 'Upload a new profile photo if needed.')}
            </p>
          </div>
          {isEditingMember ? (
            <Button variant="secondary" size="sm" onClick={() => profileImageInputRef.current?.click()} disabled={isSavingMember}>
              {resolvedUserProfileImage || profileImageFile ? t('profile.change_photo', 'Change') : t('profile.upload_photo', 'Upload')}
            </Button>
          ) : null}
        </div>

        {/* Info grid */}
        <div className="grid gap-3 md:grid-cols-2">
          {[
            { label: t('profile.role'), value: user?.role ?? t('shell.user') },
            { label: t('profile.company_code'), value: user?.company_code ?? '—' },
            { label: t('profile.job_title'), value: user?.job_title ?? '—' },
            { label: t('profile.email'), value: user?.email ?? '—' },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-[var(--radius-md)] border border-[var(--border-solid)] bg-[var(--background)] px-4 py-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--caption)]">{label}</p>
              <p className="mt-1.5 text-[14px] font-medium text-[var(--foreground)] break-all">{value}</p>
            </div>
          ))}
          <div className="rounded-[var(--radius-md)] border border-[var(--border-solid)] bg-[var(--background)] px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--caption)]">{t('profile.status')}</p>
            <div className="mt-1.5 flex items-center gap-2">
              <span className={cn('status-dot', user?.is_active ? 'status-dot-success' : 'status-dot-muted')} />
              <p className="text-[14px] font-medium text-[var(--foreground)]">{user?.is_active ? t('status.active', 'Active') : t('status.inactive', 'Inactive')}</p>
            </div>
          </div>

          {isEditingMember ? (
            <>
              {(['name', 'surname'] as const).map((field) => (
                <div key={field} className="rounded-[var(--radius-md)] border border-[var(--border-solid)] bg-[var(--background)] px-4 py-3">
                  <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--caption)]">
                    {field === 'name' ? t('profile.name') : t('profile.surname')}
                  </p>
                  <Input
                    {...profileForm.register(field)}
                    aria-invalid={profileForm.formState.errors[field] ? true : undefined}
                  />
                  {profileForm.formState.errors[field] ? (
                    <p className="mt-1 text-[11px] text-[var(--danger-text)]">{profileForm.formState.errors[field]?.message}</p>
                  ) : null}
                </div>
              ))}
              {(['current_password', 'new_password'] as const).map((field) => (
                <div key={field} className="rounded-[var(--radius-md)] border border-[var(--border-solid)] bg-[var(--background)] px-4 py-3">
                  <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--caption)]">
                    {field === 'current_password' ? t('profile.current_password', 'Current password') : t('profile.new_password', 'New password')}
                  </p>
                  <Input
                    type="password"
                    {...profileForm.register(field)}
                    aria-invalid={profileForm.formState.errors[field] ? true : undefined}
                    placeholder={field === 'current_password' ? t('profile.current_password_hint', 'Fill only if changing password') : t('profile.new_password_hint', 'Leave blank to keep current')}
                  />
                  {profileForm.formState.errors[field] ? (
                    <p className="mt-1 text-[11px] text-[var(--danger-text)]">{profileForm.formState.errors[field]?.message}</p>
                  ) : null}
                </div>
              ))}
            </>
          ) : null}
        </div>

        {/* Permissions */}
        <div className="mt-4 rounded-[var(--radius-md)] border border-[var(--border-solid)] bg-[var(--background-alt)] px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--caption)]">{t('profile.permissions')}</p>
              <p className="mt-1 text-[14px] font-semibold text-[var(--foreground)]">{activePermissions.length} {t('profile.enabled')}</p>
            </div>
            <span className="rounded-[3px] border border-[var(--border-solid)] bg-[var(--background)] px-2 py-0.5 text-[11px] font-medium text-[var(--muted)]">
              {env.appEnv}
            </span>
          </div>
          {activePermissions.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {activePermissions.map((permission) => (
                <span
                  key={permission}
                  className="rounded-[3px] border border-[var(--border-solid)] bg-[var(--background)] px-2 py-0.5 text-[11px] font-medium text-[var(--muted)]"
                >
                  {permission}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-[13px] text-[var(--muted)]">{t('profile.no_active_permissions')}</p>
          )}
        </div>
      </Dialog>
    </>
  )
}
