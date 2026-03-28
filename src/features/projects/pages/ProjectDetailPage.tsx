import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Card } from '../../../shared/ui/card'
import { Button } from '../../../shared/ui/button'
import { Badge } from '../../../shared/ui/badge'
import { StateBlock } from '../../../shared/ui/state-block'
import { useAsyncData } from '../../../shared/hooks/useAsyncData'
import { useToast } from '../../../shared/toast/useToast'
import { useConfirm } from '../../../shared/confirm/useConfirm'
import {
  projectsService,
  type ProjectRecord,
  type UserSummary,
  type UserOpenCardRecord,
} from '../../../shared/api/services/projects.service'
import { resolveMediaUrl } from '../../../shared/lib/media-url'
import { useAuth } from '../../auth/hooks/useAuth'
import { Avatar } from '../components/Avatar'
import { BoardFormModal } from '../components/BoardFormModal'
import { BoardWorkspace } from '../components/BoardWorkspace'
import { ProjectFormModal } from '../components/ProjectFormModal'
import { formatProjectDate, getPriorityConfig, isDueDateOverdue, isDueDateSoon } from '../lib/format'
import { notifyProjectsNavigationChanged } from '../lib/navigationSync'

function parseBoardId(rawValue: string | null) {
  if (!rawValue) {
    return null
  }

  const parsed = Number(rawValue)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { confirm } = useConfirm()
  const { user, hasPermission } = useAuth()

  const id = Number(projectId)
  const canManageProjects = hasPermission('projects')

  const projectQuery = useAsyncData(
    async () => {
      if (!user) {
        throw new Error('User session is unavailable')
      }

      return canManageProjects
        ? projectsService.getProject(id)
        : projectsService.getUserOpenProjectDetail(id, user.id)
    },
    [id, canManageProjects, user?.id],
    { enabled: !Number.isNaN(id) && Boolean(user) },
  )

  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false)
  const [isCreateBoardOpen, setIsCreateBoardOpen] = useState(false)
  const [isProjectSubmitting, setIsProjectSubmitting] = useState(false)
  const [isBoardSubmitting, setIsBoardSubmitting] = useState(false)
  const [expandedMemberId, setExpandedMemberId] = useState<number | null>(null)

  const project = projectQuery.data
  const projectImage = resolveMediaUrl(project?.image) ?? project?.image ?? null
  const priorityConfigMap = getPriorityConfig()

  const selectedBoardId = parseBoardId(searchParams.get('board'))
  const activeBoards = project?.boards.filter((board) => !board.is_archived) ?? []
  const archivedBoards = project?.boards.filter((board) => board.is_archived) ?? []
  const allBoards = project?.boards ?? []
  const selectedBoard =
    allBoards.find((board) => board.id === selectedBoardId) ??
    activeBoards[0] ??
    allBoards[0] ??
    null

  const projectMembers = useMemo(() => {
    if (!project) {
      return []
    }

    const membersById = new Map<number, UserSummary>()

    for (const member of project.members) {
      if (member.id > 0 && !membersById.has(member.id)) {
        membersById.set(member.id, member)
      }
    }

    return Array.from(membersById.values())
  }, [project])

  const expandedMember = useMemo(
    () => projectMembers.find((member) => member.id === expandedMemberId) ?? null,
    [expandedMemberId, projectMembers],
  )

  const expandedMemberTasksQuery = useAsyncData(
    async () => {
      if (expandedMemberId === null) {
        return [] as UserOpenCardRecord[]
      }

      const response = await projectsService.listUserOpenCards(expandedMemberId, id)
      return response.cards
    },
    [expandedMemberId, id],
    { enabled: expandedMemberId !== null && !Number.isNaN(id) },
  )

  const expandedMemberTasks = useMemo(() => {
    if (expandedMemberId === null) {
      return []
    }

    const cards = expandedMemberTasksQuery.data ?? []

    return [...cards]
      .filter((card) => card.project_id === id)
      .sort((left, right) => {
        if (left.due_date && right.due_date) {
          return left.due_date.localeCompare(right.due_date)
        }

        if (left.due_date) {
          return -1
        }

        if (right.due_date) {
          return 1
        }

        return right.updated_at.localeCompare(left.updated_at)
      })
  }, [expandedMemberId, expandedMemberTasksQuery.data, id])

  const expandedMemberBoardsCount = useMemo(
    () => new Set(expandedMemberTasks.map((task) => task.board_id)).size,
    [expandedMemberTasks],
  )
  const isExpandedMemberTasksLoading = expandedMemberId !== null && expandedMemberTasksQuery.isLoading

  const expandedMemberTasksDueSoon = useMemo(
    () =>
      expandedMemberTasks.filter(
        (task) => task.due_date && isDueDateSoon(task.due_date) && !isDueDateOverdue(task.due_date),
      ).length,
    [expandedMemberTasks],
  )
  const expandedMemberActiveItemsCount = useMemo(
    () => expandedMemberTasks.filter((task) => task.column_name.trim().length > 0).length,
    [expandedMemberTasks],
  )

  useEffect(() => {
    if (!project) {
      return
    }

    if (!selectedBoard) {
      if (selectedBoardId === null) {
        return
      }

      setSearchParams((current) => {
        const next = new URLSearchParams(current)
        next.delete('board')
        return next
      }, { replace: true })
      return
    }

    if (selectedBoard.id === selectedBoardId) {
      return
    }

    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      next.set('board', String(selectedBoard.id))
      return next
    }, { replace: true })
  }, [project, selectedBoard, selectedBoardId, setSearchParams])

  useEffect(() => {
    if (projectMembers.length === 0) {
      if (expandedMemberId !== null) {
        setExpandedMemberId(null)
      }
      return
    }

    if (expandedMemberId !== null && !projectMembers.some((member) => member.id === expandedMemberId)) {
      setExpandedMemberId(null)
    }
  }, [expandedMemberId, projectMembers])

  function selectBoard(boardIdToSelect: number | null) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)

      if (boardIdToSelect === null) {
        next.delete('board')
      } else {
        next.set('board', String(boardIdToSelect))
      }

      return next
    }, { replace: true })
  }

  function toggleMember(memberId: number) {
    setExpandedMemberId((current) => (current === memberId ? null : memberId))
  }

  async function handleUpdateProject(fd: FormData) {
    if (!canManageProjects || !project) {
      return
    }

    setIsProjectSubmitting(true)
    try {
      await projectsService.updateProject(project.id, fd)
      showToast({ title: 'Project updated', tone: 'success' })
      setIsEditProjectOpen(false)
      await projectQuery.refetch()
      notifyProjectsNavigationChanged()
    } catch {
      showToast({ title: 'Failed to update project', tone: 'error' })
    } finally {
      setIsProjectSubmitting(false)
    }
  }

  async function handleDeleteProject() {
    if (!canManageProjects || !project) {
      return
    }

    const ok = await confirm({
      title: 'Delete project?',
      description: `"${project.project_name}" and all its boards will be permanently deleted.`,
      tone: 'danger',
    })

    if (!ok) {
      return
    }

    try {
      await projectsService.deleteProject(project.id)
      showToast({ title: 'Project deleted', tone: 'success' })
      notifyProjectsNavigationChanged()
      navigate('/projects')
    } catch {
      showToast({ title: 'Failed to delete project', tone: 'error' })
    }
  }

  async function handleCreateBoard(values: { name: string; description?: string }) {
    if (!canManageProjects || !project) {
      return
    }

    setIsBoardSubmitting(true)
    try {
      const createdBoard = await projectsService.createBoard(project.id, values)
      showToast({ title: 'Board created', tone: 'success' })
      setIsCreateBoardOpen(false)
      await projectQuery.refetch()
      selectBoard(createdBoard.id)
      notifyProjectsNavigationChanged()
    } catch {
      showToast({ title: 'Failed to create board', tone: 'error' })
    } finally {
      setIsBoardSubmitting(false)
    }
  }

  if (projectQuery.isLoading) {
    return (
      <div className="flex flex-col gap-6 page-enter">
        <div className="h-48 animate-pulse rounded-[28px] border border-[var(--border)] bg-[var(--surface-elevated)]" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)]"
            />
          ))}
        </div>
      </div>
    )
  }

  if (projectQuery.isError || !project) {
    return (
      <StateBlock
        tone="error"
        eyebrow="Error"
        title="Failed to load project"
        description="The project could not be found or loaded."
        actionLabel="Back to projects"
        onAction={() => navigate('/projects')}
      />
    )
  }

  return (
    <>
      <div className="flex flex-col gap-6 page-enter">
        <Link
          to="/projects"
          className="inline-flex w-fit items-center gap-1.5 text-xs text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
        >
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M10 4L6 8l4 4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          All projects
        </Link>

        <Card variant="glass" noPadding className="overflow-hidden rounded-[28px]">
          <div className="relative overflow-hidden">
            {projectImage ? (
              <div className="relative h-40 w-full overflow-hidden">
                <img src={projectImage} alt={project.project_name} className="h-full w-full object-cover opacity-40" />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[var(--surface-elevated)]" />
              </div>
            ) : null}

            <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.22),transparent_72%)]" />
            <div className="pointer-events-none absolute -left-12 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-blue-500/8 blur-3xl" />

            <div className="relative z-10 flex flex-col gap-5 px-7 py-7">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-start gap-4">
                  {projectImage ? (
                    <img
                      src={projectImage}
                      alt={project.project_name}
                      className="h-16 w-16 shrink-0 rounded-2xl border border-[var(--border)] object-cover shadow-lg"
                    />
                  ) : (
                    <div
                      className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-[var(--border)] text-2xl font-bold"
                      style={{
                        background: `hsl(${project.project_name.charCodeAt(0) * 7 % 360}, 45%, 18%)`,
                        color: `hsl(${project.project_name.charCodeAt(0) * 7 % 360}, 65%, 65%)`,
                      }}
                    >
                      {project.project_name.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0">
                    <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-[1.75rem]">
                      {project.project_name}
                    </h1>
                    {project.project_description ? (
                      <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                        {project.project_description}
                      </p>
                    ) : null}
                    {project.project_url ? (
                      <a
                        href={project.project_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1.5 inline-flex items-center gap-1 text-xs text-blue-400 transition-colors hover:text-blue-300"
                      >
                        <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M5 8h6M8 5l3 3-3 3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        {project.project_url.replace(/^https?:\/\//, '')}
                      </a>
                    ) : null}
                  </div>
                </div>

                {canManageProjects ? (
                  <div className="flex shrink-0 items-center gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setIsEditProjectOpen(true)}>
                      Edit
                    </Button>
                    <Button variant="danger" size="sm" onClick={handleDeleteProject}>
                      Delete
                    </Button>
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-4 border-t border-[var(--border)] pt-4">
                <div className="flex items-center gap-2">
                  <Avatar
                    name={project.created_by.name}
                    surname={project.created_by.surname}
                    imageUrl={project.created_by.profile_image}
                    size="sm"
                  />
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">Created by</p>
                    <p className="text-xs font-medium text-[var(--foreground)]">
                      {project.created_by.name} {project.created_by.surname}
                    </p>
                  </div>
                </div>

                <div className="h-8 w-px bg-[var(--border)]" />

                <div>
                  <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">Created</p>
                  <p className="text-xs font-medium text-[var(--foreground)]">
                    {formatProjectDate(project.created_at)}
                  </p>
                </div>

                <div className="h-8 w-px bg-[var(--border)]" />

                <div>
                  <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">Boards</p>
                  <p className="text-xs font-medium text-[var(--foreground)]">{project.boards_count}</p>
                </div>

                {projectMembers.length > 0 ? (
                  <>
                    <div className="h-8 w-px bg-[var(--border)]" />
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">Members</p>
                      <div className="mt-1 flex items-center gap-2">
                        {projectMembers.slice(0, 6).map((member) => {
                          const isExpanded = member.id === expandedMemberId

                          return (
                            <button
                              key={member.id}
                              type="button"
                              onClick={() => toggleMember(member.id)}
                              className={
                                isExpanded
                                  ? 'rounded-full ring-2 ring-blue-400/60 ring-offset-2 ring-offset-[var(--surface-elevated)] transition'
                                  : 'rounded-full ring-2 ring-[var(--surface-elevated)] transition hover:ring-[var(--border-hover)]'
                              }
                              title={`${member.name} ${member.surname}`}
                              aria-label={`Show ${member.name} ${member.surname} tasks`}
                              aria-expanded={isExpanded}
                            >
                              <Avatar
                                name={member.name}
                                surname={member.surname}
                                imageUrl={member.profile_image}
                                size="sm"
                              />
                            </button>
                          )
                        })}
                        {projectMembers.length > 6 ? (
                          <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 text-[10px] font-semibold text-[var(--muted)]">
                            +{projectMembers.length - 6}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </Card>

        {projectMembers.length > 0 ? (
          <Card variant="glass" className="rounded-[28px]">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">
                  Assigned Members
                </h2>
                <p className="text-sm text-[var(--muted)]">
                  Memberni bossangiz, aynan shu project ichidagi unga biriktirilgan tasklar ochiladi.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {projectMembers.map((member) => {
                  const isExpanded = member.id === expandedMemberId

                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => toggleMember(member.id)}
                      className="group flex w-[88px] flex-col items-center gap-2 text-center"
                      aria-expanded={isExpanded}
                      aria-controls={isExpanded ? `project-member-panel-${member.id}` : undefined}
                    >
                      <div
                        className={
                          isExpanded
                            ? 'rounded-full border border-blue-400/45 bg-blue-500/10 p-1 shadow-[0_12px_30px_rgba(37,99,235,0.18)] transition'
                            : 'rounded-full border border-[var(--border)] bg-[var(--surface)] p-1 transition group-hover:border-[var(--border-hover)] group-hover:bg-[var(--accent-soft)]'
                        }
                      >
                        <Avatar
                          name={member.name}
                          surname={member.surname}
                          imageUrl={member.profile_image}
                          size="lg"
                        />
                      </div>
                      <span className="line-clamp-2 text-[11px] font-medium leading-4 text-[var(--foreground)]">
                        {member.name} {member.surname}
                      </span>
                    </button>
                  )
                })}
              </div>

              {expandedMember ? (
                <div
                  id={`project-member-panel-${expandedMember.id}`}
                  className="overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--surface)]"
                >
                  <button
                    type="button"
                    onClick={() => toggleMember(expandedMember.id)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-[var(--accent-soft)]"
                    aria-expanded
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar
                        name={expandedMember.name}
                        surname={expandedMember.surname}
                        imageUrl={expandedMember.profile_image}
                        size="md"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                          {expandedMember.name} {expandedMember.surname}
                        </p>
                        <p className="truncate text-[11px] text-[var(--muted)]">
                          {expandedMember.job_title?.trim() || 'Project member'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge
                        variant={!isExpandedMemberTasksLoading && expandedMemberTasks.length > 0 ? 'blue' : 'secondary'}
                      >
                        {isExpandedMemberTasksLoading ? 'Loading...' : `${expandedMemberTasks.length} tasks`}
                      </Badge>
                      <svg
                        viewBox="0 0 16 16"
                        className="h-4 w-4 shrink-0 text-[var(--muted)] transition-transform duration-200 rotate-180"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </button>

                  <div className="border-t border-[var(--border)] px-5 py-5">
                    {isExpandedMemberTasksLoading ? (
                      <div className="grid gap-3 md:grid-cols-2">
                        {Array.from({ length: 4 }).map((_, index) => (
                          <div
                            key={index}
                            className="h-24 animate-pulse rounded-[20px] border border-[var(--border)] bg-[var(--muted-surface)]"
                          />
                        ))}
                      </div>
                    ) : expandedMemberTasksQuery.isError ? (
                      <StateBlock
                        tone="error"
                        eyebrow="Error"
                        title="Failed to load member tasks"
                        description="Shu memberning tasklarini yuklashda xatolik bo'ldi."
                        actionLabel="Retry"
                        onAction={() => expandedMemberTasksQuery.refetch()}
                      />
                    ) : expandedMemberTasks.length === 0 ? (
                      <StateBlock
                        tone="empty"
                        eyebrow="No tasks"
                        title="No tasks assigned in this project"
                        description="Hozircha shu memberga ushbu project ichida task biriktirilmagan."
                      />
                    ) : (
                      <div className="flex flex-col gap-4">
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary">{expandedMemberBoardsCount} boards</Badge>
                          <Badge variant={expandedMemberTasksDueSoon > 0 ? 'warning' : 'secondary'}>
                            {expandedMemberTasksDueSoon} due soon
                          </Badge>
                          <Badge variant="blue">
                            {expandedMemberActiveItemsCount} active items
                          </Badge>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          {expandedMemberTasks.map((task) => {
                            const priorityConfig = task.priority ? priorityConfigMap[task.priority] : null
                            const dueVariant = task.due_date
                              ? isDueDateOverdue(task.due_date)
                                ? 'danger'
                                : isDueDateSoon(task.due_date)
                                  ? 'warning'
                                  : 'secondary'
                              : 'ghost'

                            return (
                              <Link
                                key={task.id}
                                to={`/projects/${project.id}?board=${task.board_id}`}
                                className="rounded-[20px] border border-[var(--border)] bg-[var(--muted-surface)] px-4 py-4 transition hover:border-[var(--border-hover)] hover:bg-[var(--accent-soft)]"
                              >
                                <div className="flex flex-col gap-3">
                                  <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                                        {task.title}
                                      </p>
                                      <p className="mt-1 text-[11px] text-[var(--muted)]">
                                        {task.board_name} - {task.column_name}
                                      </p>
                                    </div>

                                    {priorityConfig ? (
                                      <Badge variant={priorityConfig.badgeVariant}>
                                        {priorityConfig.label}
                                      </Badge>
                                    ) : null}
                                  </div>

                                  <div className="flex flex-wrap gap-2">
                                    <Badge variant="secondary">
                                      Board: {task.board_name}
                                    </Badge>
                                    <Badge variant={dueVariant}>
                                      {task.due_date ? `Due ${formatProjectDate(task.due_date)}` : 'No due date'}
                                    </Badge>
                                  </div>
                                </div>
                              </Link>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-[24px] border border-dashed border-[var(--border)] bg-[var(--surface)] px-5 py-6 text-sm text-[var(--muted)]">
                  Tepadagi memberlardan bittasini bosing, shu project ichidagi tasklari shu yerda ochiladi.
                </div>
              )}
            </div>
          </Card>
        ) : null}

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">
                Project Lists
              </h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Open the project and work with its lists directly here without an extra board layer.
              </p>
            </div>
            {canManageProjects ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsCreateBoardOpen(true)}
                leftIcon={(
                  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M8 3v10M3 8h10" strokeLinecap="round" />
                  </svg>
                )}
              >
                New board
              </Button>
            ) : null}
          </div>

          {project.boards.length === 0 ? (
            <StateBlock
              tone="empty"
              eyebrow="No boards"
              title="No boards yet"
              description={
                canManageProjects
                  ? 'Create a board to start organizing your work with columns and cards.'
                  : 'This project does not have any visible boards yet.'
              }
              actionLabel={canManageProjects ? 'Create board' : undefined}
              onAction={canManageProjects ? () => setIsCreateBoardOpen(true) : undefined}
            />
          ) : (
            <>
              <div className="flex flex-col gap-3">
                {activeBoards.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {activeBoards.map((board) => {
                      const isSelected = selectedBoard?.id === board.id

                      return (
                        <button
                          key={board.id}
                          type="button"
                          onClick={() => selectBoard(board.id)}
                          className={
                            isSelected
                              ? 'rounded-full border border-blue-500/40 bg-blue-500/12 px-4 py-2 text-sm font-medium text-blue-100 shadow-[0_8px_24px_rgba(37,99,235,0.16)] transition'
                              : 'rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-2 text-sm font-medium text-[var(--muted)] transition hover:border-[var(--border-hover)] hover:bg-[var(--accent-soft)] hover:text-[var(--foreground)]'
                          }
                        >
                          {board.name}
                        </button>
                      )
                    })}
                  </div>
                ) : null}

                {archivedBoards.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                      Archived
                    </span>
                    {archivedBoards.map((board) => {
                      const isSelected = selectedBoard?.id === board.id

                      return (
                        <button
                          key={board.id}
                          type="button"
                          onClick={() => selectBoard(board.id)}
                          className={
                            isSelected
                              ? 'rounded-full border border-white/20 bg-white/8 px-4 py-2 text-sm font-medium text-[var(--foreground)] transition'
                              : 'rounded-full border border-[var(--border)] bg-transparent px-4 py-2 text-sm font-medium text-[var(--muted)] transition hover:border-[var(--border-hover)] hover:text-[var(--foreground)]'
                          }
                        >
                          {board.name}
                        </button>
                      )
                    })}
                  </div>
                ) : null}
              </div>

              {selectedBoard ? (
                <BoardWorkspace
                  boardId={selectedBoard.id}
                  projectId={project.id}
                  mode="embedded"
                  onBoardsChanged={() => projectQuery.refetch()}
                />
              ) : null}
            </>
          )}
        </div>
      </div>

      {canManageProjects ? (
        <>
          <ProjectFormModal
            open={isEditProjectOpen}
            onClose={() => setIsEditProjectOpen(false)}
            onSubmit={handleUpdateProject}
            initial={project as ProjectRecord}
            title="Edit project"
            submitLabel="Save changes"
            isSubmitting={isProjectSubmitting}
          />

          <BoardFormModal
            open={isCreateBoardOpen}
            onClose={() => setIsCreateBoardOpen(false)}
            onSubmit={handleCreateBoard}
            title="Create board"
            submitLabel="Create"
            isSubmitting={isBoardSubmitting}
          />
        </>
      ) : null}
    </>
  )
}
