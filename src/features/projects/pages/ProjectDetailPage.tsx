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

  async function handleDeleteBoard(boardId: number, boardName: string) {
    if (!canManageProjects) return

    const ok = await confirm({
      title: lt('Delete board?'),
      description: `"${boardName}" ${lt('will be permanently deleted.')}`,
      tone: 'danger',
    })

    if (!ok) return

    try {
      if (selectedBoard?.id === boardId) {
        const otherBoard = activeBoards.find((b) => b.id !== boardId)
        selectBoard(otherBoard?.id ?? null)
      }
      await projectsService.deleteBoard(boardId)
      showToast({ title: lt('Board deleted'), tone: 'success' })
      await projectQuery.refetch()
      notifyProjectsNavigationChanged()
    } catch {
      showToast({ title: lt('Failed to delete board'), tone: 'error' })
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
      <div className="relative flex flex-col gap-4 sm:gap-6 page-enter h-[calc(100vh-100px)] sm:h-[calc(100vh-120px)] overflow-hidden">
        {/* Background Project Header (Jira Style) - More compact on mobile */}
        <div className="relative shrink-0 overflow-hidden rounded-[24px] sm:rounded-[32px] border border-[var(--border)] bg-[var(--surface-elevated)] p-4 sm:p-6 shadow-sm">
          <div className="page-header-decor pointer-events-none absolute inset-x-0 top-0 h-32 sm:h-40 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.18),transparent_72%)]" />

          <div className="relative z-10 flex flex-col gap-4 sm:gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-start gap-3 sm:gap-5">
                {projectImage ? (
                  <img
                    src={projectImage}
                    alt={project.project_name}
                    className="h-10 w-10 sm:h-12 sm:w-12 shrink-0 rounded-xl border border-[var(--border)] object-cover shadow-md"
                  />
                ) : (
                  <div
                    className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] text-lg sm:text-xl font-black"
                    style={{
                      background: `hsl(${project.project_name.charCodeAt(0) * 7 % 360}, 45%, 18%)`,
                      color: `hsl(${project.project_name.charCodeAt(0) * 7 % 360}, 65%, 65%)`,
                    }}
                  >
                    {project.project_name.charAt(0).toUpperCase()}
                  </div>
                )}

                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 sm:mb-1">
                     <Link to="/projects" className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.25em] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
                        {lt('Projects')}
                     </Link>
                     <span className="text-[var(--border)] text-[9px] sm:text-[10px]">/</span>
                     <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.25em] text-blue-400">{lt('Board')}</span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[var(--foreground)] truncate">
                    {project.project_name}
                  </h1>
                </div>
              </div>

              {canManageProjects ? (
                <div className="flex shrink-0 items-center gap-2 sm:mt-0">
                  <Button variant="ghost" size="sm" className="rounded-xl h-8 sm:h-9 bg-[var(--accent-soft)] px-3 sm:px-4 text-[11px] sm:text-xs" onClick={() => setIsEditProjectOpen(true)}>
                    {lt('Edit')}
                  </Button>
                  <Button variant="danger" size="sm" className="rounded-xl h-8 sm:h-9 bg-red-500/10 text-red-400 border-transparent px-3 sm:px-4 text-[11px] sm:text-xs" onClick={handleDeleteProject}>
                    {lt('Delete')}
                  </Button>
                </div>
              ) : null}
            </div>

            {/* Stats row - Hidden/compact on mobile */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 border-t border-[var(--border)]/30 pt-3 sm:pt-2 sm:border-t-0 sm:mt-0">
              <div className="flex items-center gap-2 sm:gap-3">
                <Avatar
                  name={project.created_by.name}
                  surname={project.created_by.surname}
                  imageUrl={project.created_by.profile_image}
                  size="xs"
                  className="ring-2 ring-[var(--border)]"
                />
                <div className="hidden sm:block">
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

              <div className="h-4 sm:h-4 w-px bg-[var(--border)] opacity-60" />

              <div>
                <p className="text-[10px] sm:text-xs font-bold text-[var(--foreground)]">
                  {formatProjectDate(project.created_at)}
                </p>
              </div>

              <div className="h-4 sm:h-4 w-px bg-[var(--border)] opacity-60" />

              <div>
                <p className="text-[10px] sm:text-xs font-bold text-[var(--foreground)]">
                  {project.boards_count} <span className="hidden sm:inline">{lt('boards')}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Boards Content Overlay Container - Scroll internally */}
        <div className="relative z-20 flex-1 -mt-2 sm:-mt-4 bg-[var(--background)] rounded-t-[28px] sm:rounded-t-[40px] px-0 sm:px-2 pt-1 sm:pt-2 min-h-0 flex flex-col">
           <Card noPadding className="flex-1 flex flex-col overflow-hidden rounded-t-[24px] sm:rounded-t-[32px] border-x border-t sm:border border-[var(--border)] shadow-xl bg-[var(--surface)] backdrop-blur-xl">
              {/* Board Header & Filters Area - Highly scrollable on mobile */}
              <div className="flex flex-col border-b border-[var(--border)] bg-[var(--blue-dim)]/30 px-4 sm:px-8 py-3 sm:py-4 backdrop-blur-md">
                 <div className="flex items-center justify-between gap-4 mb-3 sm:mb-0">
                    <div className="flex items-center gap-3 sm:gap-6 overflow-hidden flex-1">
                       {/* Board Tabs - Horizontal Scroll on mobile */}
                       <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-black/20 dark:bg-white/5 border border-[var(--border)] overflow-x-auto custom-scrollbar-none scroll-smooth">
                         {activeBoards.map((board) => {
                           const isSelected = selectedBoard?.id === board.id
                           return (
                             <div key={board.id} className="group relative flex shrink-0 items-center">
                               <button
                                 type="button"
                                 onClick={() => selectBoard(board.id)}
                                 className={cn(
                                   "whitespace-nowrap pl-4 sm:pl-5 py-2 sm:py-2.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all",
                                   canManageProjects ? "pr-7" : "pr-4 sm:pr-5",
                                   isSelected
                                     ? "bg-blue-600 text-white shadow-[0_4px_12px_rgba(37,99,235,0.3)] scale-105"
                                     : "text-[var(--muted-strong)] hover:text-[var(--foreground)] hover:bg-white/5"
                                 )}
                               >
                                 {board.name}
                               </button>
                               {canManageProjects && (
                                 <button
                                   type="button"
                                   onClick={(e) => { e.stopPropagation(); void handleDeleteBoard(board.id, board.name) }}
                                   className={cn(
                                     "absolute right-1.5 flex h-4 w-4 items-center justify-center rounded transition-all",
                                     isSelected
                                       ? "text-white/70 hover:text-white hover:bg-white/20"
                                       : "opacity-0 group-hover:opacity-100 text-[var(--muted)] hover:text-red-400 hover:bg-red-400/10"
                                   )}
                                   title={lt('Delete board')}
                                 >
                                   <svg viewBox="0 0 16 16" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2.5">
                                     <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round"/>
                                   </svg>
                                 </button>
                               )}
                             </div>
                           )
                         })}
                         {canManageProjects && (
                            <button
                               type="button"
                               onClick={() => setIsCreateBoardOpen(true)}
                               className="w-9 h-9 flex items-center justify-center rounded-xl text-[var(--muted-strong)] hover:bg-white/10 hover:text-[var(--foreground)] transition-all shrink-0"
                               title={lt('Add board')}
                            >
                               <svg viewBox="0 0 16 16" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="2.5">
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
              <div className="flex flex-col flex-1 min-h-0">
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

        {/* Member Tasks Panel (Centered Overlay with Backdrop) */}
        {expandedMember && expandedMemberId !== null && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8">
              {/* Backdrop */}
              <button 
                 className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-default" 
                 onClick={() => setExpandedMemberId(null)}
              />
              
              {/* Center Modal */}
              <Card variant="glass" className="relative z-10 w-full max-w-5xl rounded-[32px] shadow-2xl border-[var(--blue-border)] overflow-hidden page-enter">
                 <div className="flex items-center justify-between p-6 sm:p-8 border-b border-[var(--border)] bg-[var(--blue-dim)]/20 backdrop-blur-md">
                    <div className="flex items-center gap-5">
                       <Avatar name={expandedMember.name} surname={expandedMember.surname} imageUrl={expandedMember.profile_image} size="lg" className="ring-4 ring-blue-500/20" />
                       <div>
                          <p className="text-xl font-black text-[var(--foreground)] tracking-tight">{expandedMember.name} {expandedMember.surname}</p>
                          <p className="text-xs font-bold text-blue-400 uppercase tracking-[0.2em] mt-1">{expandedMember.job_title || lt('Member')}</p>
                       </div>
                    </div>
                    <button onClick={() => setExpandedMemberId(null)} className="h-12 w-12 rounded-2xl flex items-center justify-center bg-black/10 hover:bg-red-500/20 hover:text-red-400 transition-all text-[var(--muted-strong)]">
                       <svg viewBox="0 0 16 16" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round"/></svg>
                    </button>
                 </div>
                 
                 <div className="max-h-[70vh] overflow-y-auto p-6 sm:p-10 custom-scrollbar-visible bg-[var(--surface-elevated)]">
                    <div className="flex items-center justify-between mb-8">
                       <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--muted)]">{lt('Active Tasks Assignment')}</h4>
                       <Badge variant="blue" className="px-3 py-1 rounded-full font-black">{expandedMemberTasks.length} {lt('Items')}</Badge>
                    </div>

                    {isExpandedMemberTasksLoading ? (
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          {[1,2,3,4].map(i => <div key={i} className="h-32 animate-pulse rounded-3xl bg-white/5 border border-white/5" />)}
                       </div>
                    ) : expandedMemberTasks.length === 0 ? (
                       <div className="flex flex-col items-center justify-center py-20 opacity-30">
                          <svg viewBox="0 0 24 24" className="h-16 w-16 mb-6" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M12 22c5.523 0 9-4.477 9-10S17.523 2 12 2 3 6.477 3 12s3.477 10 9 10z"/><path d="M12 8v4M12 16h.01" strokeWidth="2" strokeLinecap="round"/></svg>
                          <p className="text-base font-black tracking-widest text-[var(--muted)] uppercase">{lt('No active tasks')}</p>
                       </div>
                    ) : (
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          {expandedMemberTasks.map(task => (
                             <Link 
                                key={task.id} 
                                to={`/projects/${project.id}?board=${task.board_id}`} 
                                onClick={() => setExpandedMemberId(null)}
                                className="group flex flex-col justify-between p-6 rounded-3xl border border-[var(--border)] bg-[var(--surface)] hover:border-blue-500/50 hover:bg-[var(--accent-soft)] transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1"
                             >
                                <div className="mb-5">
                                   <div className="flex items-center gap-2 mb-2 opacity-60">
                                      <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">{task.board_name}</span>
                                      <span className="text-[var(--border)]">•</span>
                                      <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">{task.column_name}</span>
                                   </div>
                                   <p className="text-[17px] font-black leading-snug text-[var(--foreground)] group-hover:text-blue-400 transition-colors line-clamp-2">
                                      {task.title}
                                   </p>
                                </div>
                                <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]/50">
                                   <div className="flex items-center gap-2">
                                      <div className="h-1.5 w-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_var(--blue-glow)]" />
                                      <span className="text-[10px] font-black text-[var(--muted-strong)] uppercase tracking-tighter">{lt('Priority High')}</span>
                                   </div>
                                   <div className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--muted)]">
                                      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                      {formatProjectDate(task.updated_at)}
                                   </div>
                                </div>
                             </Link>
                          ))}
                       </div>
                    )}
                 </div>
                 
                 <div className="p-6 border-t border-[var(--border)] bg-[var(--accent-soft)]/10 flex justify-end">
                    <Button variant="ghost" className="rounded-xl font-black uppercase tracking-widest text-[var(--muted-strong)]" onClick={() => setExpandedMemberId(null)}>
                       {lt('Close Dashboard')}
                    </Button>
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
