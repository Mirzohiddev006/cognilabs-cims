import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Card } from '../../../shared/ui/card'
import { Button } from '../../../shared/ui/button'
import { StateBlock } from '../../../shared/ui/state-block'
import { useAsyncData } from '../../../shared/hooks/useAsyncData'
import { useToast } from '../../../shared/toast/useToast'
import { useConfirm } from '../../../shared/confirm/useConfirm'
import { projectsService, type BoardRecord, type ProjectRecord } from '../../../shared/api/services/projects.service'
import { resolveMediaUrl } from '../../../shared/lib/media-url'
import { useAuth } from '../../auth/hooks/useAuth'
import { Avatar, AvatarGroup } from '../components/Avatar'
import { BoardCard } from '../components/BoardCard'
import { BoardFormModal } from '../components/BoardFormModal'
import { ProjectFormModal } from '../components/ProjectFormModal'
import { formatProjectDate } from '../lib/format'
import { notifyProjectsNavigationChanged } from '../lib/navigationSync'

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>()
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
  const [editBoard, setEditBoard] = useState<BoardRecord | null>(null)
  const [isProjectSubmitting, setIsProjectSubmitting] = useState(false)
  const [isBoardSubmitting, setIsBoardSubmitting] = useState(false)

  const project = projectQuery.data
  const projectImage = resolveMediaUrl(project?.image) ?? project?.image ?? null

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
      await projectsService.createBoard(project.id, values)
      showToast({ title: 'Board created', tone: 'success' })
      setIsCreateBoardOpen(false)
      await projectQuery.refetch()
    } catch {
      showToast({ title: 'Failed to create board', tone: 'error' })
    } finally {
      setIsBoardSubmitting(false)
    }
  }

  async function handleUpdateBoard(values: { name: string; description?: string }) {
    if (!canManageProjects || !editBoard) {
      return
    }

    setIsBoardSubmitting(true)
    try {
      await projectsService.updateBoard(editBoard.id, values)
      showToast({ title: 'Board updated', tone: 'success' })
      setEditBoard(null)
      await projectQuery.refetch()
    } catch {
      showToast({ title: 'Failed to update board', tone: 'error' })
    } finally {
      setIsBoardSubmitting(false)
    }
  }

  async function handleArchiveBoard(board: BoardRecord) {
    if (!canManageProjects) {
      return
    }

    const ok = await confirm({
      title: 'Archive board?',
      description: `"${board.name}" will be archived. It will no longer be active.`,
      tone: 'danger',
    })

    if (!ok) {
      return
    }

    try {
      await projectsService.deleteBoard(board.id)
      showToast({ title: 'Board archived', tone: 'success' })
      await projectQuery.refetch()
    } catch {
      showToast({ title: 'Failed to archive board', tone: 'error' })
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

  const activeBoards = project.boards.filter((board) => !board.is_archived)
  const archivedBoards = project.boards.filter((board) => board.is_archived)

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

                {project.members.length > 0 ? (
                  <>
                    <div className="h-8 w-px bg-[var(--border)]" />
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">Members</p>
                      <AvatarGroup users={project.members} max={6} size="sm" className="mt-1" />
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </Card>

        {project.members.length > 0 ? (
          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">
              Members ({project.members.length})
            </h2>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {project.members.map((member) => (
                <Link
                  key={member.id}
                  to={`/projects?member=${member.id}`}
                  className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-3 transition hover:border-[var(--border-hover)] hover:bg-[var(--accent-soft)]"
                >
                  <Avatar name={member.name} surname={member.surname} imageUrl={member.profile_image} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-[var(--foreground)]">
                      {member.name} {member.surname}
                    </p>
                    {member.job_title ? (
                      <p className="truncate text-[10px] text-[var(--muted)]">{member.job_title}</p>
                    ) : null}
                    <p className="mt-1 text-[10px] text-blue-400">
                      View member projects and tasks
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">
              Active Boards ({activeBoards.length})
            </h2>
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

          {activeBoards.length === 0 ? (
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {activeBoards.map((board) => (
                <BoardCard
                  key={board.id}
                  board={board}
                  onEdit={setEditBoard}
                  onArchive={handleArchiveBoard}
                  canManage={canManageProjects}
                />
              ))}
            </div>
          )}
        </div>

        {archivedBoards.length > 0 ? (
          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">
              Archived Boards ({archivedBoards.length})
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {archivedBoards.map((board) => (
                <BoardCard
                  key={board.id}
                  board={board}
                  onEdit={setEditBoard}
                  onArchive={handleArchiveBoard}
                  canManage={canManageProjects}
                />
              ))}
            </div>
          </div>
        ) : null}
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

          <BoardFormModal
            open={editBoard !== null}
            onClose={() => setEditBoard(null)}
            onSubmit={handleUpdateBoard}
            initial={editBoard}
            title="Edit board"
            submitLabel="Save changes"
            isSubmitting={isBoardSubmitting}
          />
        </>
      ) : null}
    </>
  )
}
