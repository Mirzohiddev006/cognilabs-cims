import { request } from '../http'
import type { CreateResponse, SuccessResponse } from '../types'

// ─── Shared domain types ─────────────────────────────────────────────────────

export type UserSummary = {
  id: number
  name: string
  surname: string
  email: string
  job_title?: string | null
}

export type CardImage = {
  id: number
  url: string
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
}

// ─── File types ───────────────────────────────────────────────────────────────

export type FileRecord = {
  id: number
  url: string
  filename: string
  created_at: string
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const projectsService = {
  // Projects
  listProjects() {
    return request<ProjectListResponse>({ path: '/projects' })
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
    return request<ProjectDetail>({ path: `/projects/${projectId}` })
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

  createBoard(projectId: number, payload: { name: string; description?: string }) {
    return request<CreateResponse>({
      path: `/projects/${projectId}/boards`,
      method: 'POST',
      body: payload,
    })
  },

  getBoard(boardId: number) {
    return request<BoardDetail>({ path: `/boards/${boardId}` })
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
    return request<CardRecord>({ path: `/cards/${cardId}` })
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
