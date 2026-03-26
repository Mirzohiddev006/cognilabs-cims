import { request } from '../http'
import type { CreateResponse, SuccessResponse } from '../types'

// ─── Shared domain types ─────────────────────────────────────────────────────

export type UserSummary = {
  id: number
  name: string
  surname: string
  email: string
  job_title?: string | null
  profile_image?: string | null
}

export type CardImage = {
  id: number
  url: string
  url_path?: string
  filename: string
}

export type CardPriority = 'low' | 'medium' | 'high' | 'urgent'

// ─── Project types ────────────────────────────────────────────────────────────

export type ProjectRecord = {
  id: number
  project_name: string
  project_description: string | null
  project_url: string | null
  image: string | null
  created_by: UserSummary
  members: UserSummary[]
  boards_count: number
  created_at: string
  updated_at: string
}

export type ProjectDetail = ProjectRecord & {
  boards: BoardRecord[]
}

export type ProjectListResponse = {
  projects: ProjectRecord[]
  total_count: number
}

export type UserOpenProjectListResponse = ProjectListResponse

// ─── Board types ──────────────────────────────────────────────────────────────

export type BoardRecord = {
  id: number
  name: string
  description: string | null
  project_id: number
  created_by: UserSummary
  is_archived: boolean
  created_at: string
  updated_at: string
}

export type BoardDetail = BoardRecord & {
  columns: ColumnRecord[]
  files: FileRecord[]
}

export type BoardListResponse = {
  boards: BoardRecord[]
  total_count: number
}

// ─── Column types ─────────────────────────────────────────────────────────────

export type ColumnRecord = {
  id: number
  name: string
  color: string | null
  order: number
  board_id: number
  cards: CardRecord[]
}

// ─── Card types ───────────────────────────────────────────────────────────────

export type CardRecord = {
  id: number
  title: string
  description: string | null
  order: number
  priority: CardPriority | null
  assignee: UserSummary | null
  assignee_id: number | null
  due_date: string | null
  column_id: number
  created_by: UserSummary
  created_at: string
  updated_at: string
  images: CardImage[]
  files?: CardImage[]
}

export type UserOpenCardRecord = CardRecord & {
  board_id: number
  project_id: number
  project_name: string
  board_name: string
  column_name: string
}

export type UserOpenCardListResponse = {
  cards: UserOpenCardRecord[]
  total_count: number
}

// ─── File types ───────────────────────────────────────────────────────────────

export type FileRecord = {
  id: number
  url: string
  url_path?: string
  filename: string
  created_at: string
}

type ApiCardImage = {
  id?: number
  url?: string | null
  url_path?: string | null
  filename?: string | null
  created_at?: string
}

type ApiCardRecord = Omit<Partial<CardRecord>, 'images' | 'files' | 'created_by'> & {
  created_by?: ApiUserSummary | number | null
  created_by_user?: ApiUserSummary
  images?: ApiCardImage[] | null
  files?: ApiCardImage[] | null
  board_id?: number
  project_id?: number
  project_name?: string | null
  board_name?: string | null
  column_name?: string | null
}

type ApiColumnRecord = Omit<Partial<ColumnRecord>, 'cards'> & {
  cards?: ApiCardRecord[] | null
}

type ApiBoardRecord = Omit<Partial<BoardRecord>, 'created_by'> & {
  created_by?: ApiUserSummary | number | null
  created_by_user?: ApiUserSummary
}

type ApiBoardDetail = Omit<ApiBoardRecord, 'columns'> & {
  columns?: ApiColumnRecord[] | null
  files?: ApiCardImage[] | null
}

type ApiUserSummary = Partial<UserSummary> | null | undefined

type ApiProjectRecord = Omit<Partial<ProjectRecord>, 'created_by' | 'members' | 'boards_count'> & {
  boards_count?: number | null
  image_url?: string | null
  image_path?: string | null
  project_image?: string | null
  thumbnail?: string | null
  board_count?: number | null
  member_count?: number | null
  created_by?: ApiUserSummary | number | null
  created_by_user?: ApiUserSummary
  members?: ApiUserSummary[] | null
}

type ApiProjectDetail = Omit<ApiProjectRecord, 'boards'> & {
  boards?: Array<ApiBoardRecord | null> | null
}

function normalizeUserSummary(user: ApiUserSummary): UserSummary {
  return {
    id: user?.id ?? 0,
    name: user?.name ?? '',
    surname: user?.surname ?? '',
    email: user?.email ?? '',
    job_title: user?.job_title ?? null,
    profile_image: user?.profile_image ?? null,
  }
}

function resolveUserReference(primary?: ApiUserSummary | number | null, fallback?: ApiUserSummary) {
  if (fallback) {
    return fallback
  }

  return typeof primary === 'object' ? primary : null
}

function resolveProjectImage(project: ApiProjectRecord) {
  return project.image ?? project.image_url ?? project.image_path ?? project.project_image ?? project.thumbnail ?? null
}

function normalizeProject(project: ApiProjectRecord): ProjectRecord {
  return {
    id: project.id ?? 0,
    project_name: project.project_name ?? '',
    project_description: project.project_description ?? null,
    project_url: project.project_url ?? null,
    image: resolveProjectImage(project),
    created_by: normalizeUserSummary(resolveUserReference(project.created_by, project.created_by_user)),
    members: Array.isArray(project.members) ? project.members.map(normalizeUserSummary) : [],
    boards_count: project.boards_count ?? project.board_count ?? 0,
    created_at: project.created_at ?? '',
    updated_at: project.updated_at ?? '',
  }
}

function normalizeBoardRecord(board: ApiBoardRecord | null | undefined, fallbackProjectId = 0): BoardRecord {
  return {
    id: board?.id ?? 0,
    name: board?.name ?? '',
    description: board?.description ?? null,
    project_id: board?.project_id ?? fallbackProjectId,
    created_by: normalizeUserSummary(resolveUserReference(board?.created_by, board?.created_by_user)),
    is_archived: Boolean(board?.is_archived),
    created_at: board?.created_at ?? '',
    updated_at: board?.updated_at ?? '',
  }
}

function normalizeProjectDetail(project: ApiProjectDetail): ProjectDetail {
  return {
    ...normalizeProject(project),
    boards: Array.isArray(project.boards)
      ? project.boards.map((board) => normalizeBoardRecord(board, project.id ?? 0))
      : [],
  }
}

function normalizeCardImage(image: ApiCardImage): CardImage {
  const url = image.url ?? image.url_path ?? ''
  const fallbackFilename = url.split('/').filter(Boolean).at(-1) ?? 'Attachment'

  return {
    id: image.id ?? 0,
    url,
    url_path: image.url_path ?? undefined,
    filename: image.filename ?? fallbackFilename,
  }
}

function normalizeCard(card: ApiCardRecord): CardRecord {
  const images = Array.isArray(card.images)
    ? card.images
    : Array.isArray(card.files)
      ? card.files
      : []

  return {
    id: card.id ?? 0,
    title: card.title ?? '',
    description: card.description ?? null,
    order: card.order ?? 0,
    priority: card.priority ?? null,
    assignee: card.assignee ? normalizeUserSummary(card.assignee) : null,
    assignee_id: card.assignee_id ?? null,
    due_date: card.due_date ?? null,
    column_id: card.column_id ?? 0,
    created_by: normalizeUserSummary(resolveUserReference(card.created_by, card.created_by_user)),
    created_at: card.created_at ?? '',
    updated_at: card.updated_at ?? '',
    images: images.map(normalizeCardImage),
    files: Array.isArray(card.files) ? card.files.map(normalizeCardImage) : undefined,
  }
}

function normalizeOpenCard(card: ApiCardRecord): UserOpenCardRecord {
  const normalizedCard = normalizeCard(card)

  return {
    ...normalizedCard,
    board_id: card.board_id ?? 0,
    project_id: card.project_id ?? 0,
    project_name: card.project_name ?? '',
    board_name: card.board_name ?? '',
    column_name: card.column_name ?? '',
  }
}

function normalizeBoardFiles(files?: ApiCardImage[] | null) {
  return Array.isArray(files)
    ? files.map((file) => ({
        id: file.id ?? 0,
        url: file.url ?? file.url_path ?? '',
        url_path: file.url_path ?? undefined,
        filename: file.filename ?? ((file.url ?? file.url_path ?? '').split('/').filter(Boolean).at(-1) ?? 'Attachment'),
        created_at: file.created_at ?? '',
      }))
    : []
}

function normalizeBoardDetail(board: ApiBoardDetail): BoardDetail {
  const normalizedBoard = normalizeBoardRecord(board, board.project_id ?? 0)

  return {
    ...normalizedBoard,
    columns: Array.isArray(board.columns)
      ? board.columns.map((column) => ({
          id: column.id ?? 0,
          name: column.name ?? '',
          color: column.color ?? null,
          order: column.order ?? 0,
          board_id: column.board_id ?? 0,
          cards: Array.isArray(column.cards) ? column.cards.map(normalizeCard) : [],
        }))
      : [],
    files: normalizeBoardFiles(board.files),
  }
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const projectsService = {
  // Projects
  listProjects() {
    return request<ProjectListResponse & { projects?: ApiProjectRecord[] }>({ path: '/projects' }).then((response) => ({
      ...response,
      projects: Array.isArray(response.projects) ? response.projects.map(normalizeProject) : [],
      total_count: response.total_count ?? (Array.isArray(response.projects) ? response.projects.length : 0),
    }))
  },

  listUserOpenProjects(userId: number) {
    return request<UserOpenProjectListResponse & { projects?: ApiProjectRecord[] }>({
      path: `/open/projects/user/${userId}`,
    }).then((response) => ({
      ...response,
      projects: Array.isArray(response.projects) ? response.projects.map(normalizeProject) : [],
      total_count: response.total_count ?? (Array.isArray(response.projects) ? response.projects.length : 0),
    }))
  },

  getAllUsers() {
    return request<UserSummary[]>({ path: '/projects/users/all' })
  },

  createProject(formData: FormData) {
    return request<CreateResponse>({
      path: '/projects',
      method: 'POST',
      body: formData,
    })
  },

  getProject(projectId: number) {
    return request<ApiProjectDetail>({ path: `/projects/${projectId}` }).then(normalizeProjectDetail)
  },

  getUserOpenProjectDetail(projectId: number, userId: number) {
    return request<ApiProjectDetail>({
      path: `/open/projects/${projectId}/detail/user/${userId}`,
    }).then(normalizeProjectDetail)
  },

  updateProject(projectId: number, formData: FormData) {
    return request<SuccessResponse>({
      path: `/projects/${projectId}`,
      method: 'PATCH',
      body: formData,
    })
  },

  deleteProject(projectId: number) {
    return request<SuccessResponse>({
      path: `/projects/${projectId}`,
      method: 'DELETE',
    })
  },

  // Boards
  listBoards(projectId: number) {
    return request<BoardListResponse>({ path: `/projects/${projectId}/boards` })
  },

  listUserOpenProjectBoards(projectId: number, userId: number) {
    return request<{ project_id?: number; boards?: ApiBoardDetail[]; total_count?: number }>({
      path: `/open/projects/${projectId}/boards/detail/user/${userId}`,
    }).then((response) => ({
      project_id: response.project_id ?? projectId,
      boards: Array.isArray(response.boards) ? response.boards.map(normalizeBoardDetail) : [],
      total_count: response.total_count ?? (Array.isArray(response.boards) ? response.boards.length : 0),
    }))
  },

  async getUserOpenBoardDetail(boardId: number, userId: number, projectId?: number | null) {
    const scopedProjectIds = typeof projectId === 'number' && Number.isFinite(projectId) && projectId > 0
      ? [projectId]
      : (await this.listUserOpenProjects(userId)).projects.map((project) => project.id)

    for (const nextProjectId of scopedProjectIds) {
      const response = await this.listUserOpenProjectBoards(nextProjectId, userId)
      const matchedBoard = response.boards.find((board) => board.id === boardId)

      if (matchedBoard) {
        return matchedBoard
      }
    }

    throw new Error('Board not found in open user projects')
  },

  createBoard(projectId: number, payload: { name: string; description?: string }) {
    return request<CreateResponse>({
      path: `/projects/${projectId}/boards`,
      method: 'POST',
      body: payload,
    })
  },

  getBoard(boardId: number) {
    return request<ApiBoardDetail>({ path: `/boards/${boardId}` }).then(normalizeBoardDetail)
  },

  updateBoard(boardId: number, payload: { name?: string; description?: string }) {
    return request<SuccessResponse>({
      path: `/boards/${boardId}`,
      method: 'PATCH',
      body: payload,
    })
  },

  deleteBoard(boardId: number) {
    return request<SuccessResponse>({
      path: `/boards/${boardId}`,
      method: 'DELETE',
    })
  },

  // Columns
  createColumn(boardId: number, payload: { name: string; color?: string }) {
    return request<CreateResponse>({
      path: `/boards/${boardId}/columns`,
      method: 'POST',
      body: payload,
    })
  },

  updateColumn(columnId: number, payload: { name?: string; color?: string }) {
    return request<SuccessResponse>({
      path: `/columns/${columnId}`,
      method: 'PATCH',
      body: payload,
    })
  },

  deleteColumn(columnId: number) {
    return request<SuccessResponse>({
      path: `/columns/${columnId}`,
      method: 'DELETE',
    })
  },

  moveColumn(columnId: number, order: number) {
    return request<SuccessResponse>({
      path: `/columns/${columnId}/move`,
      method: 'PATCH',
      body: { order },
    })
  },

  // Cards
  createCard(columnId: number, formData: FormData) {
    return request<CreateResponse>({
      path: `/columns/${columnId}/cards`,
      method: 'POST',
      body: formData,
    })
  },

  getCard(cardId: number) {
    return request<ApiCardRecord>({ path: `/cards/${cardId}` }).then(normalizeCard)
  },

  listUserOpenCards(userId: number, projectId?: number | null) {
    return request<UserOpenCardListResponse & { cards?: ApiCardRecord[] }>({
      path: `/open/cards/user/${userId}`,
      query: {
        project_id: projectId,
      },
    }).then((response) => ({
      ...response,
      cards: Array.isArray(response.cards) ? response.cards.map(normalizeOpenCard) : [],
      total_count: response.total_count ?? (Array.isArray(response.cards) ? response.cards.length : 0),
    }))
  },

  getUserOpenCard(cardId: number, userId: number) {
    return request<ApiCardRecord>({
      path: `/open/cards/${cardId}/user/${userId}`,
    }).then(normalizeOpenCard)
  },

  updateCard(cardId: number, formData: FormData) {
    return request<SuccessResponse>({
      path: `/cards/${cardId}`,
      method: 'PATCH',
      body: formData,
    })
  },

  deleteCard(cardId: number) {
    return request<SuccessResponse | undefined>({
      path: `/cards/${cardId}`,
      method: 'DELETE',
    })
  },

  moveCard(cardId: number, columnId: number, order: number) {
    return request<SuccessResponse>({
      path: `/cards/${cardId}/move`,
      method: 'PATCH',
      body: { column_id: columnId, order },
    })
  },
}
