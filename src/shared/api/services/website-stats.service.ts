import { env } from '../../config/env'
import { request } from '../http'
import type { CreateResponse, SuccessResponse } from '../types'

const websiteStatsApiBaseUrl = env.websiteStatsApiBaseUrl
const websiteStatsAdminTokenKey = 'website_stats_admin_token'
const legacyWebsiteStatsTokenKey = 'token'

export const websiteStatsQuillStylesheetUrl = 'https://cdn.quilljs.com/1.3.6/quill.snow.css'

export type WebsiteStatsAdminStatus = {
  isAdmin: boolean
  raw: Record<string, unknown> | null
}

export type WebsiteBlogRecord = {
  id: number
  title: string
  content: string
  language: string
  is_active: boolean
  image_url: string | null
  created_at: string | null
  updated_at: string | null
  raw: Record<string, unknown>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function parsePayload(payload: unknown): unknown {
  if (typeof payload !== 'string') {
    return payload
  }

  const trimmed = payload.trim()

  if (!trimmed) {
    return ''
  }

  try {
    return JSON.parse(trimmed) as unknown
  } catch {
    return payload
  }
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number(value.trim())
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

function toBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'number') {
    return value !== 0
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()

    if (['true', '1', 'yes', 'active'].includes(normalized)) {
      return true
    }

    if (['false', '0', 'no', 'inactive'].includes(normalized)) {
      return false
    }
  }

  return null
}

function pickString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key]

    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }

  return null
}

function pickBoolean(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = toBoolean(record[key])

    if (value !== null) {
      return value
    }
  }

  return null
}

function pickNestedRecord(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key]

    if (isRecord(value)) {
      return value
    }
  }

  return null
}

function normalizeBlog(item: unknown): WebsiteBlogRecord | null {
  if (!isRecord(item)) {
    return null
  }

  const id = toNumber(item.id ?? item.blog_id ?? item.pk)
  const title = pickString(item, ['title', 'name'])

  if (!id || !title) {
    return null
  }

  return {
    id,
    title,
    content: pickString(item, ['content', 'body', 'description', 'text']) ?? '',
    language: pickString(item, ['language', 'lang', 'locale']) ?? 'uz',
    is_active: pickBoolean(item, ['is_active', 'active', 'published']) ?? false,
    image_url: pickString(item, ['image_url', 'image', 'imageUrl', 'photo', 'thumbnail']),
    created_at: pickString(item, ['created_at', 'createdAt', 'published_at', 'date']),
    updated_at: pickString(item, ['updated_at', 'updatedAt', 'modified_at']),
    raw: item,
  }
}

function normalizeBlogList(payload: unknown): WebsiteBlogRecord[] {
  const parsed = parsePayload(payload)

  if (Array.isArray(parsed)) {
    return parsed
      .map(normalizeBlog)
      .filter((item): item is WebsiteBlogRecord => Boolean(item))
      .sort((left, right) => (right.updated_at ?? right.created_at ?? '').localeCompare(left.updated_at ?? left.created_at ?? ''))
  }

  if (!isRecord(parsed)) {
    return []
  }

  const directArray = ['blogs', 'items', 'results', 'data']
    .map((key) => parsed[key])
    .find(Array.isArray)

  if (Array.isArray(directArray)) {
    return directArray
      .map(normalizeBlog)
      .filter((item): item is WebsiteBlogRecord => Boolean(item))
      .sort((left, right) => (right.updated_at ?? right.created_at ?? '').localeCompare(left.updated_at ?? left.created_at ?? ''))
  }

  const nestedRecord = pickNestedRecord(parsed, ['data', 'result', 'blog'])

  if (nestedRecord) {
    return normalizeBlogList(nestedRecord)
  }

  const single = normalizeBlog(parsed)
  return single ? [single] : []
}

function normalizeBlogDetail(payload: unknown): WebsiteBlogRecord | null {
  const parsed = parsePayload(payload)

  if (isRecord(parsed)) {
    const nestedRecord = pickNestedRecord(parsed, ['blog', 'data', 'result', 'item'])
    return normalizeBlog(nestedRecord ?? parsed)
  }

  return normalizeBlog(parsed)
}

function extractLoginToken(payload: unknown) {
  const parsed = parsePayload(payload)

  if (!isRecord(parsed)) {
    throw new Error('Login response did not include a usable access token.')
  }

  if (typeof parsed.access_token === 'string' && parsed.access_token.trim()) {
    return parsed.access_token.trim()
  }

  const nestedToken = pickNestedRecord(parsed, ['access_token', 'tokens', 'token'])

  if (!nestedToken) {
    throw new Error('Login response did not include access_token.access.')
  }

  const access = pickString(nestedToken, ['access', 'token', 'access_token'])

  if (!access) {
    throw new Error('Login response did not include access_token.access.')
  }

  return access
}

function normalizeAdminStatus(payload: unknown): WebsiteStatsAdminStatus {
  const parsed = parsePayload(payload)

  if (!isRecord(parsed)) {
    return {
      isAdmin: true,
      raw: null,
    }
  }

  return {
    isAdmin: pickBoolean(parsed, ['is_admin', 'isAdmin', 'admin']) ?? true,
    raw: parsed,
  }
}

function getAuthHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
  }
}

export function getWebsiteStatsToken() {
  return localStorage.getItem(websiteStatsAdminTokenKey) ?? localStorage.getItem(legacyWebsiteStatsTokenKey)
}

export function setWebsiteStatsToken(token: string) {
  localStorage.setItem(websiteStatsAdminTokenKey, token)
  localStorage.setItem(legacyWebsiteStatsTokenKey, token)
}

export function clearWebsiteStatsToken() {
  localStorage.removeItem(websiteStatsAdminTokenKey)
  localStorage.removeItem(legacyWebsiteStatsTokenKey)
}

export function resolveWebsiteBlogImageUrl(imageUrl?: string | null) {
  if (!imageUrl?.trim()) {
    return null
  }

  if (/^https?:\/\//i.test(imageUrl)) {
    return imageUrl
  }

  const normalized = imageUrl.replace(/^\/+/, '')
  const path = normalized.startsWith('uploads/') ? normalized : `uploads/${normalized}`

  return new URL(path, websiteStatsApiBaseUrl).toString()
}

export const websiteStatsService = {
  apiBaseUrl: websiteStatsApiBaseUrl,

  login(payload: { email: string; password: string }) {
    return request<unknown>({
      path: new URL('auth/login', websiteStatsApiBaseUrl).toString(),
      method: 'POST',
      auth: false,
      body: payload,
    }).then((response) => ({
      accessToken: extractLoginToken(response),
      raw: parsePayload(response),
    }))
  },

  isAdmin(token: string) {
    return request<unknown>({
      path: new URL('admin/is-admin/', websiteStatsApiBaseUrl).toString(),
      auth: false,
      headers: getAuthHeaders(token),
    }).then(normalizeAdminStatus)
  },

  listBlogs(token: string) {
    return request<unknown>({
      path: new URL('admin/all-blogs/', websiteStatsApiBaseUrl).toString(),
      auth: false,
      headers: getAuthHeaders(token),
    }).then(normalizeBlogList)
  },

  getBlog(blogId: number, token: string) {
    return request<unknown>({
      path: new URL(`admin/get-blog/${blogId}/`, websiteStatsApiBaseUrl).toString(),
      auth: false,
      headers: getAuthHeaders(token),
    }).then(normalizeBlogDetail)
  },

  createBlog(formData: FormData, token: string) {
    return request<CreateResponse | SuccessResponse>({
      path: new URL('admin/create/blog/', websiteStatsApiBaseUrl).toString(),
      method: 'POST',
      auth: false,
      headers: getAuthHeaders(token),
      body: formData,
    })
  },

  updateBlog(blogId: number, formData: FormData, token: string) {
    return request<SuccessResponse>({
      path: new URL(`admin/edit-blog/${blogId}/`, websiteStatsApiBaseUrl).toString(),
      method: 'PATCH',
      auth: false,
      headers: getAuthHeaders(token),
      body: formData,
    })
  },

  deleteBlog(blogId: number, token: string) {
    return request<SuccessResponse>({
      path: new URL(`admin/delete-blog/${blogId}/`, websiteStatsApiBaseUrl).toString(),
      method: 'DELETE',
      auth: false,
      headers: getAuthHeaders(token),
    })
  },
}
