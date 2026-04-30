import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { getIntlLocale, translateCurrentLiteral } from '../../../shared/i18n/translations'
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
import { formatProjectDate } from '../lib/format'
import { notifyProjectsNavigationChanged } from '../lib/navigationSync'
import { cn } from '../../../shared/lib/cn'

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
  const { user } = useAuth()
  const lt = translateCurrentLiteral
  const locale = getIntlLocale()
  const tr = (key: string, uzFallback: string, ruFallback: string) => {
    const value = lt(key)

    if (value !== key) {
      return value
    }

    if (locale.startsWith('ru')) {
      return ruFallback
    }

    if (locale.startsWith('en')) {
      return key
    }

    return uzFallback
  }

  const id = Number(projectId)
  const canManageProjects = Boolean(user)

  const projectQuery = useAsyncData(
    async () => {
      if (!user) {
        throw new Error('User session is unavailable')
      }

      return projectsService.getReadableProjectDetail(id, user.id)
    },
    [id, user?.id],
    { enabled: !Number.isNaN(id) && Boolean(user) },
  )

  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false)
  const [isCreateBoardOpen, setIsCreateBoardOpen] = useState(false)
  const [isProjectSubmitting, setIsProjectSubmitting] = useState(false)
  const [isBoardSubmitting, setIsBoardSubmitting] = useState(false)
  const [expandedMemberId, setExpandedMemberId] = useState<number | null>(null)

  const project = projectQuery.data
  const projectImage = resolveMediaUrl(project?.image) ?? project?.image ?? null

  const selectedBoardId = parseBoardId(searchParams.get('board'))
  const selectedBoardParam = searchParams.get('board')
  const activeBoards = project?.boards.filter((board) => !board.is_archived) ?? []
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

  const isExpandedMemberTasksLoading = expandedMemberId !== null && expandedMemberTasksQuery.isLoading

  useEffect(() => {
    if (!project) {
      return
    }

    const nextBoardParam = selectedBoard ? String(selectedBoard.id) : null

    if ((selectedBoardParam ?? null) === nextBoardParam) {
      return
    }

    setSearchParams((current) => {
      const nextSearchParams = new URLSearchParams(current)

      if (nextBoardParam === null) {
        nextSearchParams.delete('board')
      } else {
        nextSearchParams.set('board', nextBoardParam)
      }

      return nextSearchParams
    }, { replace: true })
  }, [project, selectedBoard, selectedBoardParam, setSearchParams])

  useEffect(() => {
    if (projectMembers.length === 0) {
      if (expandedMemberId !== null) {
        setExpandedMemberId(null)
      }
      return
    }
  }, [expandedMemberId, projectMembers])

  function selectBoard(boardIdToSelect: number | null) {
    const nextBoardParam = boardIdToSelect === null ? null : String(boardIdToSelect)

    if ((selectedBoardParam ?? null) === nextBoardParam) {
      return
    }

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

  function selectMember(memberId: number) {
    setExpandedMemberId((prev) => prev === memberId ? null : memberId)
  }

  async function handleUpdateProject(fd: FormData) {
    if (!canManageProjects || !project) {
      return
    }

    setIsProjectSubmitting(true)
    try {
      await projectsService.updateProject(project.id, fd)
      showToast({ title: lt('Project updated'), tone: 'success' })
      setIsEditProjectOpen(false)
      await projectQuery.refetch()
      notifyProjectsNavigationChanged()
    } catch {
      showToast({ title: lt('Failed to update project'), tone: 'error' })
    } finally {
      setIsProjectSubmitting(false)
    }
  }

  async function handleDeleteProject() {
    if (!canManageProjects || !project) {
      return
    }

    const ok = await confirm({
      title: lt('Delete project?'),
      description: `"${project.project_name}" ${lt('and all its boards will be permanently deleted.')}`,
      tone: 'danger',
    })

    if (!ok) {
      return
    }

    try {
      await projectsService.deleteProject(project.id)
      showToast({ title: lt('Project deleted'), tone: 'success' })
      notifyProjectsNavigationChanged()
      navigate('/projects')
    } catch {
      showToast({ title: lt('Failed to delete project'), tone: 'error' })
    }
  }

  async function handleCreateBoard(values: { name: string; description?: string }) {
    if (!canManageProjects || !project) {
      return
    }

    setIsBoardSubmitting(true)
    try {
      const createdBoard = await projectsService.createBoard(project.id, values)
      showToast({ title: lt('Board created'), tone: 'success' })
      setIsCreateBoardOpen(false)
      await projectQuery.refetch()
      selectBoard(createdBoard.id)
      notifyProjectsNavigationChanged()
    } catch {
      showToast({ title: lt('Failed to create board'), tone: 'error' })
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
        eyebrow={lt('Error')}
        title={lt('Failed to load project')}
        description={lt('The project could not be found or loaded.')}
        actionLabel={lt('Back to projects')}
        onAction={() => navigate('/projects')}
      />
    )
  }

  return (
    <>
      <div className="relative flex flex-col gap-4 sm:gap-8 page-enter h-full overflow-hidden">
        {/* Background Project Header (Jira Style) - More compact on mobile */}
        <div className="relative shrink-0 overflow-hidden rounded-[24px] sm:rounded-[32px] border border-[var(--border)] bg-[var(--surface-elevated)] p-4 sm:p-8 shadow-sm">
          <div className="page-header-decor pointer-events-none absolute inset-x-0 top-0 h-32 sm:h-40 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.18),transparent_72%)]" />

          <div className="relative z-10 flex flex-col gap-4 sm:gap-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-start gap-3 sm:gap-5">
                {projectImage ? (
                  <img
                    src={projectImage}
                    alt={project.project_name}
                    className="h-10 w-10 sm:h-14 sm:w-14 shrink-0 rounded-xl sm:rounded-2xl border border-[var(--border)] object-cover shadow-md"
                  />
                ) : (
                  <div
                    className="flex h-10 w-10 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl border border-[var(--border)] text-lg sm:text-xl font-black"
                    style={{
                      background: `hsl(${project.project_name.charCodeAt(0) * 7 % 360}, 45%, 18%)`,
                      color: `hsl(${project.project_name.charCodeAt(0) * 7 % 360}, 65%, 65%)`,
                    }}
                  >
                    {project.project_name.charAt(0).toUpperCase()}
                  </div>
                )}

                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 sm:mb-1.5">
                     <Link to="/projects" className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.25em] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
                        {lt('Projects')}
                     </Link>
                     <span className="text-[var(--border)] text-[9px] sm:text-[10px]">/</span>
                     <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.25em] text-blue-400">{lt('Board')}</span>
                  </div>
                  <h1 className="text-xl sm:text-3xl font-black tracking-tight text-[var(--foreground)] truncate">
                    {project.project_name}
                  </h1>
                </div>
              </div>

              {canManageProjects ? (
                <div className="flex shrink-0 items-center gap-2 sm:mt-0">
                  <Button variant="ghost" size="sm" className="rounded-xl h-8 sm:h-10 bg-[var(--accent-soft)] px-3 sm:px-4 text-[11px] sm:text-sm" onClick={() => setIsEditProjectOpen(true)}>
                    {lt('Edit')}
                  </Button>
                  <Button variant="danger" size="sm" className="rounded-xl h-8 sm:h-10 bg-red-500/10 text-red-400 border-transparent px-3 sm:px-4 text-[11px] sm:text-sm" onClick={handleDeleteProject}>
                    {lt('Delete')}
                  </Button>
                </div>
              ) : null}
            </div>

            {/* Stats row - Hidden/compact on mobile */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 border-t border-[var(--border)]/30 pt-3 sm:pt-0 sm:border-0">
              <div className="flex items-center gap-2 sm:gap-3">
                <Avatar
                  name={project.created_by.name}
                  surname={project.created_by.surname}
                  imageUrl={project.created_by.profile_image}
                  size="xs"
                  className="sm:w-8 sm:h-8 ring-2 ring-[var(--border)]"
                />
                <div className="hidden sm:block">
                  <p className="text-[9px] font-black uppercase tracking-widest text-[var(--muted)]">{lt('Lead')}</p>
                  <p className="text-xs font-bold text-[var(--foreground)]">
                    {project.created_by.name} {project.created_by.surname}
                  </p>
                </div>
                <div className="sm:hidden">
                  <span className="text-[10px] font-bold text-[var(--foreground)] truncate max-w-[100px] block">
                    {project.created_by.name}
                  </span>
                </div>
              </div>

              <div className="h-4 sm:h-6 w-px bg-[var(--border)] opacity-60" />

              <div>
                <p className="hidden sm:block text-[9px] font-black uppercase tracking-widest text-[var(--muted)]">{lt('Timeline')}</p>
                <p className="text-[10px] sm:text-xs font-bold text-[var(--foreground)]">
                  {formatProjectDate(project.created_at)}
                </p>
              </div>

              <div className="h-4 sm:h-6 w-px bg-[var(--border)] opacity-60" />

              <div>
                <p className="hidden sm:block text-[9px] font-black uppercase tracking-widest text-[var(--muted)]">{lt('Stats')}</p>
                <p className="text-[10px] sm:text-xs font-bold text-[var(--foreground)]">
                  {project.boards_count} <span className="hidden sm:inline">{lt('boards')}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Boards Content Overlay Container - Full screen on mobile */}
        <div className="relative z-20 flex-1 -mt-2 sm:-mt-4 bg-[var(--background)] rounded-t-[28px] sm:rounded-t-[40px] px-0 sm:px-2 pt-1 sm:pt-2 min-h-0 flex flex-col">
           <Card noPadding className="flex-1 flex flex-col overflow-hidden rounded-t-[24px] sm:rounded-[32px] border-x border-t sm:border border-[var(--border)] shadow-xl bg-[var(--surface)] backdrop-blur-xl">
              {/* Board Header & Filters Area - Highly scrollable on mobile */}
              <div className="flex flex-col border-b border-[var(--border)] bg-[var(--accent-soft)]/20 px-4 sm:px-8 py-3 sm:py-5">
                 <div className="flex items-center justify-between gap-4 mb-3 sm:mb-0">
                    <div className="flex items-center gap-3 sm:gap-6 overflow-hidden flex-1">
                       {/* Board Tabs - Horizontal Scroll on mobile */}
                       <div className="flex items-center gap-1 p-1 rounded-xl sm:rounded-2xl bg-black/10 dark:bg-white/5 border border-[var(--border)] overflow-x-auto custom-scrollbar-none scroll-smooth">
                         {activeBoards.map((board) => {
                           const isSelected = selectedBoard?.id === board.id
                           return (
                             <button
                               key={board.id}
                               type="button"
                               onClick={() => selectBoard(board.id)}
                               className={cn(
                                  "whitespace-nowrap px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all shrink-0",
                                  isSelected 
                                    ? "bg-[var(--surface-elevated)] text-[var(--foreground)] shadow-md border border-[var(--border)] scale-105"
                                    : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-white/5"
                               )}
                             >
                               {board.name}
                             </button>
                           )
                         })}
                         {canManageProjects && (
                            <button
                               type="button"
                               onClick={() => setIsCreateBoardOpen(true)}
                               className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg sm:rounded-xl text-[var(--muted)] hover:bg-white/5 transition-colors shrink-0"
                               title={lt('Add board')}
                            >
                               <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <path d="M8 3v10M3 8h10" strokeLinecap="round" />
                               </svg>
                            </button>
                         )}
                       </div>

                       <div className="hidden sm:block h-8 w-px bg-[var(--border)] shrink-0" />

                       {/* Members Selector (Desktop) */}
                       <div className="hidden sm:flex items-center gap-3 shrink-0">
                          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">{lt('Members')}:</p>
                          <div className="flex items-center -space-x-2">
                             {projectMembers.map((member) => {
                               const isExpanded = member.id === expandedMemberId
                               return (
                                 <button
                                   key={member.id}
                                   type="button"
                                   onClick={() => selectMember(member.id)}
                                   className={cn(
                                     'relative transition-transform hover:scale-110 hover:z-10',
                                     isExpanded ? 'scale-110 z-10' : 'z-0'
                                   )}
                                 >
                                   <Avatar
                                     name={member.name}
                                     surname={member.surname}
                                     imageUrl={member.profile_image}
                                     size="sm"
                                     className={cn(
                                        "ring-2 ring-[var(--surface)] transition-all",
                                        isExpanded ? "ring-blue-500 shadow-glow-blue" : "ring-[var(--border)]"
                                     )}
                                   />
                                 </button>
                               )
                             })}
                          </div>
                       </div>
                    </div>

                    {/* Desktop Right Actions */}
                    <div className="hidden sm:flex items-center gap-3 shrink-0">
                       {canManageProjects && (
                          <Button
                             variant="secondary"
                             size="sm"
                             className="h-9 rounded-xl font-black uppercase tracking-widest bg-[var(--accent-soft)]"
                             onClick={() => setIsCreateBoardOpen(true)}
                          >
                            {tr('New list', 'Yangi list', 'Novyi spisok')}
                          </Button>
                       )}
                    </div>

                    {/* Mobile Create Button */}
                    <div className="sm:hidden flex items-center shrink-0">
                       {canManageProjects && (
                          <button
                             onClick={() => setIsCreateBoardOpen(true)}
                             className="h-9 w-9 rounded-xl bg-blue-500 flex items-center justify-center text-white shadow-lg"
                          >
                             <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14" strokeLinecap="round"/></svg>
                          </button>
                       )}
                    </div>
                 </div>

                 {/* Mobile Members Row */}
                 <div className="sm:hidden flex items-center gap-3 overflow-hidden">
                    <p className="text-[9px] font-black uppercase tracking-widest text-[var(--muted)] shrink-0">{lt('Team')}:</p>
                    <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar-none pb-1">
                       {projectMembers.map((member) => {
                         const isExpanded = member.id === expandedMemberId
                         return (
                           <button
                             key={member.id}
                             type="button"
                             onClick={() => selectMember(member.id)}
                             className="shrink-0"
                           >
                             <Avatar
                               name={member.name}
                               surname={member.surname}
                               imageUrl={member.profile_image}
                               size="sm"
                               className={cn(
                                  "h-7 w-7 ring-2 transition-all",
                                  isExpanded ? "ring-blue-500 shadow-glow-blue scale-110" : "ring-[var(--border)]"
                               )}
                             />
                           </button>
                         )
                       })}
                    </div>
                 </div>
              </div>

              {/* Scrollable Board Workspace */}
              <div className="flex-1 min-h-0">
                 {selectedBoard ? (
                    <BoardWorkspace
                      boardId={selectedBoard.id}
                      projectId={project.id}
                      mode="embedded"
                      onBoardsChanged={() => projectQuery.refetch()}
                    />
                 ) : (
                    <div className="flex h-full items-center justify-center p-8 sm:p-12">
                       <StateBlock
                         tone="empty"
                         eyebrow={lt('No boards')}
                         title={lt('Select or create a board')}
                         description={lt('Choose a board from the list above to start managing tasks.')}
                       />
                    </div>
                 )}
              </div>
           </Card>
        </div>

        {/* Member Tasks Panel (Overlay when member is selected) */}
        {expandedMember && expandedMemberId !== null && (
           <div className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 z-[60] w-[calc(100vw-2rem)] sm:w-[420px] max-w-full">
              <Card variant="glass" className="rounded-[28px] sm:rounded-[32px] shadow-2xl border-[var(--blue-border)] overflow-hidden">
                 <div className="flex items-center justify-between p-5 border-b border-[var(--border)] bg-[var(--blue-dim)]/20 backdrop-blur-md">
                    <div className="flex items-center gap-3">
                       <Avatar name={expandedMember.name} surname={expandedMember.surname} imageUrl={expandedMember.profile_image} size="md" />
                       <div>
                          <p className="text-sm font-black text-[var(--foreground)]">{expandedMember.name} {expandedMember.surname}</p>
                          <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">{expandedMember.job_title || lt('Member')}</p>
                       </div>
                    </div>
                    <button onClick={() => setExpandedMemberId(null)} className="h-8 w-8 rounded-full flex items-center justify-center bg-black/10 hover:bg-black/20 text-[var(--muted-strong)]">
                       <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round"/></svg>
                    </button>
                 </div>
                 <div className="max-h-[400px] overflow-y-auto p-4 custom-scrollbar-visible space-y-3 bg-[var(--surface-elevated)]">
                    {isExpandedMemberTasksLoading ? (
                       <div className="space-y-3">
                          {[1,2,3].map(i => <div key={i} className="h-20 animate-pulse rounded-2xl bg-white/5 border border-white/5" />)}
                       </div>
                    ) : expandedMemberTasks.length === 0 ? (
                       <p className="text-center py-8 text-xs font-bold text-[var(--muted)]">{lt('No active tasks')}</p>
                    ) : (
                       expandedMemberTasks.map(task => (
                          <Link key={task.id} to={`/projects/${project.id}?board=${task.board_id}`} className="block p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--accent-soft)] transition-all">
                             <p className="text-sm font-bold text-[var(--foreground)] mb-1">{task.title}</p>
                             <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-[var(--muted-strong)]">{task.board_name}</span>
                                <Badge variant="blue" size="sm" className="text-[9px]">{task.column_name}</Badge>
                             </div>
                          </Link>
                       ))
                    )}
                 </div>
              </Card>
           </div>
        )}
      </div>

      {canManageProjects ? (
        <>
          <ProjectFormModal
            open={isEditProjectOpen}
            onClose={() => setIsEditProjectOpen(false)}
            onSubmit={handleUpdateProject}
            initial={project as ProjectRecord}
            title={lt('Edit project')}
            submitLabel={lt('Save changes')}
            isSubmitting={isProjectSubmitting}
          />

          <BoardFormModal
            open={isCreateBoardOpen}
            onClose={() => setIsCreateBoardOpen(false)}
            onSubmit={handleCreateBoard}
            title={lt('Create board')}
            submitLabel={lt('Create')}
            isSubmitting={isBoardSubmitting}
          />
        </>
      ) : null}
    </>
  )
}
