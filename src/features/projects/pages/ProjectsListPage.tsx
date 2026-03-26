import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { projectsService, type ProjectRecord } from '../../../shared/api/services/projects.service'
import { useAsyncData } from '../../../shared/hooks/useAsyncData'
import { Card } from '../../../shared/ui/card'
import { Badge } from '../../../shared/ui/badge'
import { Button } from '../../../shared/ui/button'
import { Input } from '../../../shared/ui/input'
import { PageHeader } from '../../../shared/ui/page-header'
import { StateBlock } from '../../../shared/ui/state-block'
import { useConfirm } from '../../../shared/confirm/useConfirm'
import { cn } from '../../../shared/lib/cn'
import { useToast } from '../../../shared/toast/useToast'
import { Avatar } from '../components/Avatar'
import { ProjectCard, ProjectCardSkeleton } from '../components/ProjectCard'
import { ProjectFormModal } from '../components/ProjectFormModal'
import { PRIORITY_CONFIG, formatProjectDate, isDueDateOverdue, isDueDateSoon } from '../lib/format'
import { buildMemberProjectOverview } from '../lib/memberOverview'
import { notifyProjectsNavigationChanged } from '../lib/navigationSync'

function parseMemberId(rawValue: string | null) {
  if (!rawValue) {
    return null
  }

  const parsed = Number(rawValue)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export function ProjectsListPage() {
  const { showToast } = useToast()
  const { confirm } = useConfirm()
  const [searchParams, setSearchParams] = useSearchParams()

  const projectsQuery = useAsyncData(() => projectsService.listProjects(), [])
  const membersQuery = useAsyncData(() => projectsService.getAllUsers(), [])

  const [search, setSearch] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editProject, setEditProject] = useState<ProjectRecord | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const selectedMemberId = parseMemberId(searchParams.get('member'))
  const projects = projectsQuery.data?.projects ?? []
  const selectedMemberProjectsQuery = useAsyncData(
    () => projectsService.listUserOpenProjects(selectedMemberId ?? 0),
    [selectedMemberId],
    { enabled: selectedMemberId !== null },
  )
  const selectedMemberCardsQuery = useAsyncData(
    () => projectsService.listUserOpenCards(selectedMemberId ?? 0),
    [selectedMemberId],
    { enabled: selectedMemberId !== null },
  )
  const selectedMemberProjects = selectedMemberProjectsQuery.data?.projects ?? []
  const selectedMemberCards = selectedMemberCardsQuery.data?.cards ?? []
  const total = projectsQuery.data?.total_count ?? projects.length
  const projectIdsKey = useMemo(
    () => projects.map((project) => project.id).sort((left, right) => left - right).join(','),
    [projects],
  )
  const projectDetailsQuery = useAsyncData(
    async () => {
      const details = await Promise.allSettled(
        projects.map((project) => projectsService.getProject(project.id)),
      )

      return details.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []))
    },
    [projectIdsKey],
    { enabled: projects.length > 0 },
  )
  const detailedProjectsMap = useMemo(
    () => new Map((projectDetailsQuery.data ?? []).map((project) => [project.id, project])),
    [projectDetailsQuery.data],
  )
  const detailedProjects = useMemo(
    () => projects.map((project) => detailedProjectsMap.get(project.id) ?? project),
    [detailedProjectsMap, projects],
  )
  const membersPanelLoading = membersQuery.isLoading || projectsQuery.isLoading || (projects.length > 0 && projectDetailsQuery.isLoading)

  const memberProjectCounts = useMemo(() => {
    const counts = new Map<number, number>()

    for (const project of detailedProjects) {
      const memberIds = new Set<number>()

      if (project.created_by.id > 0) {
        memberIds.add(project.created_by.id)
      }

      for (const member of project.members) {
        if (member.id > 0) {
          memberIds.add(member.id)
        }
      }

      for (const memberId of memberIds) {
        counts.set(memberId, (counts.get(memberId) ?? 0) + 1)
      }
    }

    return counts
  }, [detailedProjects])

  const projectParticipantIds = useMemo(() => {
    const ids = new Set<number>()

    for (const project of detailedProjects) {
      if (project.created_by.id > 0) {
        ids.add(project.created_by.id)
      }

      for (const member of project.members) {
        if (member.id > 0) {
          ids.add(member.id)
        }
      }
    }

    return ids
  }, [detailedProjects])

  const members = useMemo(() => {
    const allUsers = membersQuery.data ?? []
    const relatedUsers = allUsers.filter((user) => projectParticipantIds.has(user.id))
    const source = relatedUsers.length > 0 ? relatedUsers : allUsers

    return [...source].sort((left, right) => {
      const leftCount = memberProjectCounts.get(left.id) ?? 0
      const rightCount = memberProjectCounts.get(right.id) ?? 0

      if (rightCount !== leftCount) {
        return rightCount - leftCount
      }

      return `${left.name} ${left.surname}`.localeCompare(`${right.name} ${right.surname}`)
    })
  }, [memberProjectCounts, membersQuery.data, projectParticipantIds])

  const selectedMember = useMemo(
    () => (membersQuery.data ?? members).find((member) => member.id === selectedMemberId) ?? null,
    [members, membersQuery.data, selectedMemberId],
  )

  const scopedProjects = selectedMemberId !== null ? selectedMemberProjects : detailedProjects
  const memberOverview = useMemo(
    () => (selectedMemberId !== null ? buildMemberProjectOverview(selectedMemberProjects, selectedMemberCards) : null),
    [selectedMemberCards, selectedMemberId, selectedMemberProjects],
  )
  const isSelectedMemberProjectsLoading = selectedMemberId !== null && selectedMemberProjectsQuery.isLoading
  const isSelectedMemberProjectsError = selectedMemberId !== null && selectedMemberProjectsQuery.isError
  const isSelectedMemberOverviewLoading = selectedMemberId !== null && (selectedMemberProjectsQuery.isLoading || selectedMemberCardsQuery.isLoading)
  const isSelectedMemberOverviewError = selectedMemberId !== null && (selectedMemberProjectsQuery.isError || selectedMemberCardsQuery.isError)

  const filteredProjects = useMemo(() => {
    if (!search.trim()) {
      return scopedProjects
    }

    const query = search.toLowerCase()
    return scopedProjects.filter(
      (project) =>
        project.project_name.toLowerCase().includes(query) ||
        (project.project_description ?? '').toLowerCase().includes(query),
    )
  }, [scopedProjects, search])

  const headerMeta = useMemo(() => {
    const meta: Array<{ label: string; value: string; tone?: 'neutral' | 'blue' | 'success' | 'warning' | 'danger' | 'violet' }> = [
      { label: 'All projects', value: String(total), tone: 'blue' },
      { label: 'Visible now', value: String(filteredProjects.length), tone: selectedMemberId !== null ? 'violet' : 'success' },
      { label: 'Members', value: String(members.length), tone: 'neutral' },
    ]

    if (selectedMember && memberOverview) {
      meta.push({
        label: 'Assigned tasks',
        value: String(memberOverview.taskCount),
        tone: memberOverview.taskCount > 0 ? 'warning' : 'neutral',
      })
    }

    return meta
  }, [filteredProjects.length, memberOverview, members.length, selectedMember, selectedMemberId, total])

  async function handleCreate(fd: FormData) {
    setIsSubmitting(true)
    try {
      await projectsService.createProject(fd)
      showToast({ title: 'Project created', tone: 'success' })
      setIsCreateOpen(false)
      await projectsQuery.refetch()
      refetchSelectedMemberData()
      notifyProjectsNavigationChanged()
    } catch {
      showToast({ title: 'Failed to create project', tone: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleUpdate(fd: FormData) {
    if (!editProject) {
      return
    }

    setIsSubmitting(true)
    try {
      await projectsService.updateProject(editProject.id, fd)
      showToast({ title: 'Project updated', tone: 'success' })
      setEditProject(null)
      await projectsQuery.refetch()
      await projectDetailsQuery.refetch()
      refetchSelectedMemberData()
      notifyProjectsNavigationChanged()
    } catch {
      showToast({ title: 'Failed to update project', tone: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(project: ProjectRecord) {
    const ok = await confirm({
      title: 'Delete project?',
      description: `"${project.project_name}" and all its boards will be permanently deleted. This cannot be undone.`,
      tone: 'danger',
    })

    if (!ok) {
      return
    }

    try {
      await projectsService.deleteProject(project.id)
      showToast({ title: 'Project deleted', tone: 'success' })
      await projectsQuery.refetch()
      refetchSelectedMemberData()
      notifyProjectsNavigationChanged()
    } catch {
      showToast({ title: 'Failed to delete project', tone: 'error' })
    }
  }

  function selectMember(memberId: number | null) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)

      if (memberId === null) {
        next.delete('member')
      } else {
        next.set('member', String(memberId))
      }

      return next
    }, { replace: true })
  }

  function refetchSelectedMemberData() {
    if (selectedMemberId === null) {
      return
    }

    void Promise.allSettled([
      selectedMemberProjectsQuery.refetch(),
      selectedMemberCardsQuery.refetch(),
    ])
  }

  async function handleOpenEdit(project: ProjectRecord) {
    try {
      const detail = await projectsService.getProject(project.id)
      setEditProject(detail)
    } catch {
      showToast({ title: 'Failed to load project members', tone: 'error' })
    }
  }

  return (
    <>
      <div className="flex flex-col gap-6 page-enter">
        <PageHeader
          title="Projects"
          meta={headerMeta}
          actions={(
            <Button
              variant="primary"
              size="md"
              onClick={() => setIsCreateOpen(true)}
              leftIcon={(
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M8 3v10M3 8h10" strokeLinecap="round" />
                </svg>
              )}
            >
              New project
            </Button>
          )}
        />

        <Card variant="glass" className="rounded-[28px]">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">Members</p>
                <h2 className="mt-2 text-lg font-semibold text-[var(--foreground)]">Project members overview</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Member ustiga bossangiz, shu member qatnashayotgan projectlar va unga biriktirilgan tasklar ko'rinadi.
                </p>
              </div>

              {selectedMemberId !== null ? (
                <Button variant="ghost" size="sm" onClick={() => selectMember(null)}>
                  Clear member filter
                </Button>
              ) : null}
            </div>

            {membersPanelLoading ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-20 animate-pulse rounded-[22px] border border-[var(--border)] bg-[var(--muted-surface)]"
                  />
                ))}
              </div>
            ) : members.length === 0 ? (
              <p className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] px-4 py-5 text-sm text-[var(--muted)]">
                Members are not available yet.
              </p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <button
                  type="button"
                  onClick={() => selectMember(null)}
                  className={cn(
                    'flex min-h-20 items-center justify-between gap-3 rounded-[22px] border px-4 py-4 text-left transition-all duration-150',
                    selectedMemberId === null
                      ? 'border-blue-400/35 bg-blue-600/10 text-[var(--foreground)] shadow-[0_12px_30px_rgba(37,99,235,0.14)]'
                      : 'border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--border-hover)] hover:bg-[var(--accent-soft)] hover:text-[var(--foreground)]',
                  )}
                >
                  <div>
                    <p className="text-sm font-semibold">All members</p>
                    <p className="mt-1 text-[11px] text-[var(--muted)]">Show every project</p>
                  </div>
                  <Badge variant={selectedMemberId === null ? 'blue' : 'secondary'}>
                    {total}
                  </Badge>
                </button>

                {members.map((member) => {
                  const projectCount = memberProjectCounts.get(member.id) ?? 0
                  const isSelected = member.id === selectedMemberId

                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => selectMember(member.id)}
                      className={cn(
                        'flex min-h-20 items-center gap-3 rounded-[22px] border px-4 py-4 text-left transition-all duration-150',
                        isSelected
                          ? 'border-blue-400/35 bg-blue-600/10 text-[var(--foreground)] shadow-[0_12px_30px_rgba(37,99,235,0.14)]'
                          : 'border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--border-hover)] hover:bg-[var(--accent-soft)] hover:text-[var(--foreground)]',
                      )}
                    >
                      <Avatar
                        name={member.name}
                        surname={member.surname}
                        imageUrl={member.profile_image}
                        size="md"
                      />

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                          {member.name} {member.surname}
                        </p>
                        <p className="truncate text-[11px] text-[var(--muted)]">
                          {member.job_title?.trim() || member.email}
                        </p>
                      </div>

                      <Badge variant={isSelected ? 'blue' : 'secondary'}>
                        {projectCount}
                      </Badge>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </Card>

        {selectedMember ? (
          <Card variant="glass" className="rounded-[28px]">
            <div className="flex flex-col gap-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-4">
                  <Avatar
                    name={selectedMember.name}
                    surname={selectedMember.surname}
                    imageUrl={selectedMember.profile_image}
                    size="lg"
                  />
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">Selected member</p>
                    <h2 className="mt-2 truncate text-xl font-semibold text-[var(--foreground)]">
                      {selectedMember.name} {selectedMember.surname}
                    </h2>
                    <p className="mt-1 truncate text-sm text-[var(--muted)]">
                      {selectedMember.job_title?.trim() || selectedMember.email}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge variant="violet">{selectedMemberProjects.length} projects</Badge>
                  <Badge variant="secondary">{memberOverview?.boardCount ?? 0} boards</Badge>
                  <Badge variant={(memberOverview?.taskCount ?? 0) > 0 ? 'warning' : 'secondary'}>
                    {memberOverview?.taskCount ?? 0} tasks
                  </Badge>
                </div>
              </div>

              {isSelectedMemberOverviewLoading ? (
                <div className="grid gap-4 xl:grid-cols-2">
                  {Array.from({ length: Math.max(selectedMemberProjects.length, 2) }).map((_, index) => (
                    <div
                      key={index}
                      className="h-48 animate-pulse rounded-[24px] border border-[var(--border)] bg-[var(--muted-surface)]"
                    />
                  ))}
                </div>
              ) : isSelectedMemberOverviewError ? (
                <StateBlock
                  tone="error"
                  eyebrow="Error"
                  title="Failed to load member tasks"
                  description="Member overviewni yuklashda xatolik bo'ldi. Qayta urinib ko'ring."
                  actionLabel="Retry"
                  onAction={refetchSelectedMemberData}
                />
              ) : memberOverview && memberOverview.projects.length > 0 ? (
                <div className="grid gap-4 xl:grid-cols-2">
                  {memberOverview.projects.map((project) => (
                    <div
                      key={project.projectId}
                      className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link
                            to={`/projects/${project.projectId}`}
                            className="text-base font-semibold text-[var(--foreground)] transition hover:text-blue-400"
                          >
                            {project.projectName}
                          </Link>
                          {project.projectDescription ? (
                            <p className="mt-1 text-sm text-[var(--muted)]">
                              {project.projectDescription}
                            </p>
                          ) : null}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary">{project.boardCount} boards</Badge>
                          <Badge variant={project.taskCount > 0 ? 'warning' : 'secondary'}>
                            {project.taskCount} tasks
                          </Badge>
                        </div>
                      </div>

                      {project.tasks.length === 0 ? (
                        <p className="mt-4 rounded-[18px] border border-[var(--border)] bg-[var(--muted-surface)] px-4 py-3 text-sm text-[var(--muted)]">
                          This member has no assigned tasks in active boards for this project.
                        </p>
                      ) : (
                        <div className="mt-4 space-y-3">
                          {project.tasks.map((task) => {
                            const priorityConfig = task.priority ? PRIORITY_CONFIG[task.priority] : null
                            const dueVariant = task.dueDate
                              ? isDueDateOverdue(task.dueDate)
                                ? 'danger'
                                : isDueDateSoon(task.dueDate)
                                  ? 'warning'
                                  : 'secondary'
                              : 'ghost'

                            return (
                              <Link
                                key={task.cardId}
                                to={`/boards/${task.boardId}`}
                                className="block rounded-[18px] border border-[var(--border)] bg-[var(--muted-surface)] px-4 py-3 transition hover:border-[var(--border-hover)] hover:bg-[var(--accent-soft)]"
                              >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                                      {task.title}
                                    </p>
                                    <p className="mt-1 text-[11px] text-[var(--muted)]">
                                      {task.boardName} - {task.columnName}
                                    </p>
                                  </div>

                                  <div className="flex flex-wrap gap-2">
                                    {priorityConfig ? (
                                      <Badge variant={priorityConfig.badgeVariant}>
                                        {priorityConfig.label}
                                      </Badge>
                                    ) : null}
                                    <Badge variant={dueVariant}>
                                      {task.dueDate ? `Due ${formatProjectDate(task.dueDate)}` : 'No due date'}
                                    </Badge>
                                  </div>
                                </div>
                              </Link>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <StateBlock
                  tone="empty"
                  eyebrow="No tasks"
                  title="No member activity found"
                  description="Bu member projectlarda qatnashgan bo'lishi mumkin, lekin active boardlarda unga biriktirilgan task topilmadi."
                />
              )}
            </div>
          </Card>
        ) : null}

        <div className="flex items-center gap-3">
          <div className="relative max-w-sm flex-1">
            <svg
              viewBox="0 0 16 16"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <circle cx="6.5" cy="6.5" r="3.5" />
              <path d="M9.5 9.5l3 3" strokeLinecap="round" />
            </svg>
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={selectedMember ? 'Search selected member projects...' : 'Search projects...'}
              className="pl-9"
            />
          </div>
          {search ? (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="text-xs text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
            >
              Clear
            </button>
          ) : null}
        </div>

        {projectsQuery.isLoading || isSelectedMemberProjectsLoading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <ProjectCardSkeleton key={index} />
            ))}
          </div>
        ) : projectsQuery.isError || isSelectedMemberProjectsError ? (
          <StateBlock
            tone="error"
            eyebrow="Error"
            title="Failed to load projects"
            description="Something went wrong. Please try again."
            actionLabel="Retry"
            onAction={selectedMemberId !== null ? refetchSelectedMemberData : () => void projectsQuery.refetch()}
          />
        ) : filteredProjects.length === 0 ? (
          <StateBlock
            tone="empty"
            eyebrow="No results"
            title={
              search
                ? 'No projects match your search'
                : selectedMember
                  ? 'This member has no matching projects'
                  : 'No projects yet'
            }
            description={
              search
                ? 'Try a different search term.'
                : selectedMember
                  ? 'Choose another member or clear the filter to see all projects.'
                  : 'Create your first project to get started organizing your work.'
            }
            actionLabel={!search && !selectedMember ? 'Create project' : undefined}
            onAction={!search && !selectedMember ? () => setIsCreateOpen(true) : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onEdit={(nextProject) => void handleOpenEdit(nextProject)}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      <ProjectFormModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreate}
        title="Create project"
        submitLabel="Create"
        isSubmitting={isSubmitting}
      />

      <ProjectFormModal
        open={editProject !== null}
        onClose={() => setEditProject(null)}
        onSubmit={handleUpdate}
        initial={editProject}
        title="Edit project"
        submitLabel="Save changes"
        isSubmitting={isSubmitting}
      />
    </>
  )
}
