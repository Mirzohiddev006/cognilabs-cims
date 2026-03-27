import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import {
  clearWebsiteStatsToken,
  getWebsiteStatsToken,
  resolveWebsiteBlogImageUrl,
  setWebsiteStatsToken,
  websiteStatsQuillStylesheetUrl,
  websiteStatsService,
  type WebsiteBlogRecord,
} from '../../../shared/api/services/website-stats.service'
import { useConfirm } from '../../../shared/confirm/useConfirm'
import { useAsyncData } from '../../../shared/hooks/useAsyncData'
import { getApiErrorMessage } from '../../../shared/lib/api-error'
import { cn } from '../../../shared/lib/cn'
import { formatCompactNumber, formatShortDate } from '../../../shared/lib/format'
import { useToast } from '../../../shared/toast/useToast'
import { ActionsMenu } from '../../../shared/ui/actions-menu'
import { Badge } from '../../../shared/ui/badge'
import { Button } from '../../../shared/ui/button'
import { Card } from '../../../shared/ui/card'
import { DataTable } from '../../../shared/ui/data-table'
import { Input } from '../../../shared/ui/input'
import { PageHeader } from '../../../shared/ui/page-header'
import { SelectField, type SelectFieldOption } from '../../../shared/ui/select-field'
import { SectionTitle } from '../../../shared/ui/section-title'
import { EmptyStateBlock, ErrorStateBlock, LoadingStateBlock } from '../../../shared/ui/state-block'
import { Textarea } from '../../../shared/ui/textarea'
import { useAuth } from '../../auth/hooks/useAuth'
import { MetricCard } from '../components/MetricCard'

type WebsiteAdminLoginValues = {
  email: string
  password: string
}

type WebsiteBlogFormValues = {
  title: string
  content: string
  language: string
  isActive: boolean
}

const initialLoginValues: WebsiteAdminLoginValues = {
  email: '',
  password: '',
}

const initialBlogFormValues: WebsiteBlogFormValues = {
  title: '',
  content: '',
  language: 'uz',
  isActive: true,
}

const baseLanguageOptions: SelectFieldOption[] = [
  { value: 'uz', label: 'Uzbek' },
  { value: 'en', label: 'English' },
  { value: 'ru', label: 'Russian' },
]

const websiteStatsApiHost = (() => {
  try {
    return new URL(websiteStatsService.apiBaseUrl).host
  } catch {
    return websiteStatsService.apiBaseUrl
  }
})()

function ensureQuillStylesheet() {
  if (typeof document === 'undefined') {
    return
  }

  if (document.getElementById('website-stats-quill-snow')) {
    return
  }

  const link = document.createElement('link')
  link.id = 'website-stats-quill-snow'
  link.rel = 'stylesheet'
  link.href = websiteStatsQuillStylesheetUrl
  document.head.appendChild(link)
}

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function countWords(value: string) {
  const normalized = stripHtml(value)
  return normalized ? normalized.split(' ').length : 0
}

function buildLanguageOptions(blogs: WebsiteBlogRecord[]) {
  const optionMap = new Map(baseLanguageOptions.map((option) => [option.value.toLowerCase(), option]))

  for (const blog of blogs) {
    const value = blog.language.trim()

    if (!value) {
      continue
    }

    const normalized = value.toLowerCase()

    if (!optionMap.has(normalized)) {
      optionMap.set(normalized, {
        value,
        label: value.toUpperCase(),
      })
    }
  }

  return Array.from(optionMap.values())
}

function formatTimestamp(value?: string | null) {
  if (!value) {
    return '-'
  }

  try {
    return formatShortDate(value)
  } catch {
    return value
  }
}

function toBlogFormValues(blog?: WebsiteBlogRecord | null): WebsiteBlogFormValues {
  if (!blog) {
    return initialBlogFormValues
  }

  return {
    title: blog.title,
    content: blog.content,
    language: blog.language || 'uz',
    isActive: blog.is_active,
  }
}

function buildBlogFormData(values: WebsiteBlogFormValues, imageFile: File | null, mode: 'create' | 'edit') {
  const formData = new FormData()
  formData.append('title', values.title.trim())
  formData.append('content', values.content)
  formData.append('language', values.language.trim())
  formData.append('is_active', String(values.isActive))

  if (imageFile) {
    formData.append('image', imageFile)
  }

  if (mode === 'create' && !imageFile) {
    throw new Error('Image file is required when creating a blog post.')
  }

  return formData
}

function getBlogExcerpt(blog: WebsiteBlogRecord) {
  const normalized = stripHtml(blog.content)
  return normalized ? normalized.slice(0, 120) : 'No content preview'
}

function getWebsiteStatsErrorMessage(error: unknown, fallback: string) {
  const message = getApiErrorMessage(error, fallback)

  if (/failed to fetch/i.test(message) || /err_name_not_resolved/i.test(message)) {
    return `Website Stats hostiga ulanib bo'lmadi (${websiteStatsApiHost}). Tunnel yoki DNS ni tekshiring.`
  }

  return message
}

export function WebsiteStatsPage() {
  const { showToast } = useToast()
  const { confirm } = useConfirm()
  const { isAuthenticated, user } = useAuth()

  const [adminToken, setAdminToken] = useState<string | null>(() => getWebsiteStatsToken())
  const [loginValues, setLoginValues] = useState<WebsiteAdminLoginValues>(() => ({
    ...initialLoginValues,
    email: user?.role === 'CEO' ? user.email : '',
  }))
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  const [blogSearch, setBlogSearch] = useState('')
  const deferredBlogSearch = useDeferredValue(blogSearch)
  const [languageFilter, setLanguageFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create')
  const [editingBlogId, setEditingBlogId] = useState<number | null>(null)
  const [blogForm, setBlogForm] = useState<WebsiteBlogFormValues>(initialBlogFormValues)
  const [blogImageFile, setBlogImageFile] = useState<File | null>(null)
  const [isSavingBlog, setIsSavingBlog] = useState(false)

  const [selectedBlogId, setSelectedBlogId] = useState<number | null>(null)
  const hasCeoAppSession = isAuthenticated && user?.role === 'CEO'

  useEffect(() => {
    ensureQuillStylesheet()
  }, [])

  useEffect(() => {
    if (!hasCeoAppSession || !user?.email) {
      return
    }

    setLoginValues((current) => (
      current.email.trim()
        ? current
        : {
            ...current,
            email: user.email,
          }
    ))
  }, [hasCeoAppSession, user?.email])

  const adminStatusQuery = useAsyncData(
    () => websiteStatsService.isAdmin(adminToken ?? ''),
    [adminToken],
    { enabled: Boolean(adminToken) },
  )

  const blogsQuery = useAsyncData(
    () => websiteStatsService.listBlogs(adminToken ?? ''),
    [adminToken],
    { enabled: Boolean(adminToken) },
  )

  const detailQuery = useAsyncData(
    () => websiteStatsService.getBlog(selectedBlogId ?? 0, adminToken ?? ''),
    [adminToken, selectedBlogId],
    { enabled: Boolean(adminToken && selectedBlogId) },
  )

  const blogs = blogsQuery.data ?? []
  const selectedBlog =
    detailQuery.data?.id === selectedBlogId
      ? detailQuery.data
      : blogs.find((blog) => blog.id === selectedBlogId) ?? null

  useEffect(() => {
    if (blogs.length === 0) {
      setSelectedBlogId(null)
      return
    }

    setSelectedBlogId((current) => (current && blogs.some((blog) => blog.id === current) ? current : blogs[0].id))
  }, [blogs])

  const languageOptions = useMemo(() => buildLanguageOptions(blogs), [blogs])

  const filteredBlogs = useMemo(() => {
    const normalizedSearch = deferredBlogSearch.trim().toLowerCase()

    return blogs.filter((blog) => {
      const matchesSearch = normalizedSearch
        ? [blog.title, blog.content, blog.language, blog.image_url]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(normalizedSearch))
        : true

      const matchesLanguage = languageFilter ? blog.language.toLowerCase() === languageFilter.toLowerCase() : true
      const matchesStatus =
        statusFilter === 'active'
          ? blog.is_active
          : statusFilter === 'inactive'
            ? !blog.is_active
            : true

      return matchesSearch && matchesLanguage && matchesStatus
    })
  }, [blogs, deferredBlogSearch, languageFilter, statusFilter])

  const totalWords = useMemo(
    () => blogs.reduce((sum, blog) => sum + countWords(blog.content), 0),
    [blogs],
  )
  const activeBlogs = useMemo(() => blogs.filter((blog) => blog.is_active).length, [blogs])
  const inactiveBlogs = blogs.length - activeBlogs
  const blogsWithImages = useMemo(() => blogs.filter((blog) => Boolean(blog.image_url)).length, [blogs])
  const selectedBlogPayload = useMemo(
    () => (selectedBlog ? JSON.stringify(selectedBlog.raw, null, 2) : ''),
    [selectedBlog],
  )

  async function refreshWebsiteStats() {
    const results = await Promise.allSettled([
      adminStatusQuery.refetch(),
      blogsQuery.refetch(),
      selectedBlogId ? detailQuery.refetch() : Promise.resolve(null),
    ])

    const failed = results.find((result) => result.status === 'rejected')

    if (failed?.status === 'rejected') {
      showToast({
        title: 'Refresh failed',
        description: getWebsiteStatsErrorMessage(failed.reason, "Website Stats data yangilanmadi."),
        tone: 'error',
      })
      return
    }

    showToast({
      title: 'Refreshed',
      description: 'Website Stats data qayta yuklandi.',
      tone: 'success',
    })
  }

  function resetEditor() {
    setEditorMode('create')
    setEditingBlogId(null)
    setBlogForm(initialBlogFormValues)
    setBlogImageFile(null)
  }

  async function handleLogin() {
    const trimmedEmail = loginValues.email.trim()

    if (!trimmedEmail.includes('@')) {
      showToast({
        title: 'Email invalid',
        description: "Admin login email ichida @ bo'lishi kerak.",
        tone: 'error',
      })
      return
    }

    if (loginValues.password.trim().length < 6) {
      showToast({
        title: 'Password invalid',
        description: "Password kamida 6 ta belgidan iborat bo'lishi kerak.",
        tone: 'error',
      })
      return
    }

    setIsLoggingIn(true)

    try {
      const response = await websiteStatsService.login({
        email: trimmedEmail,
        password: loginValues.password,
      })

      const adminStatus = await websiteStatsService.isAdmin(response.accessToken)

      if (!adminStatus.isAdmin) {
        clearWebsiteStatsToken()
        setAdminToken(null)
        throw new Error('Current account passed login but did not satisfy the admin check endpoint.')
      }

      setWebsiteStatsToken(response.accessToken)
      setAdminToken(response.accessToken)
      setLoginValues(initialLoginValues)
      showToast({
        title: 'Admin session ready',
        description: 'Website Stats admin login muvaffaqiyatli bajarildi.',
        tone: 'success',
      })
    } catch (error) {
      showToast({
        title: 'Admin login failed',
        description: getWebsiteStatsErrorMessage(error, 'Website Stats admin login bajarilmadi.'),
        tone: 'error',
      })
    } finally {
      setIsLoggingIn(false)
    }
  }

  function handleClearAdminSession() {
    clearWebsiteStatsToken()
    setAdminToken(null)
    setSelectedBlogId(null)
    setLoginValues({
      ...initialLoginValues,
      email: hasCeoAppSession ? user?.email ?? '' : '',
    })
    resetEditor()
    showToast({
      title: 'Admin session cleared',
      description: 'Website Stats admin token local storage dan olib tashlandi.',
      tone: 'success',
    })
  }

  async function handlePrepareEdit(blog: WebsiteBlogRecord) {
    if (!adminToken) {
      return
    }

    try {
      const detail = await websiteStatsService.getBlog(blog.id, adminToken)
      const resolved = detail ?? blog

      setSelectedBlogId(resolved.id)
      setEditorMode('edit')
      setEditingBlogId(resolved.id)
      setBlogForm(toBlogFormValues(resolved))
      setBlogImageFile(null)
    } catch (error) {
      showToast({
        title: 'Blog detail load failed',
        description: getWebsiteStatsErrorMessage(error, 'Blog detail olinmadi.'),
        tone: 'error',
      })
    }
  }

  async function handleDeleteBlog(blog: WebsiteBlogRecord) {
    if (!adminToken) {
      return
    }

    const approved = await confirm({
      title: `${blog.title} o'chirilsinmi?`,
      description: "Blog posti butunlay o'chiriladi.",
      confirmLabel: 'Delete blog',
      cancelLabel: 'Cancel',
      tone: 'danger',
    })

    if (!approved) {
      return
    }

    try {
      await websiteStatsService.deleteBlog(blog.id, adminToken)
      await blogsQuery.refetch()

      if (selectedBlogId === blog.id) {
        setSelectedBlogId(null)
      }

      if (editingBlogId === blog.id) {
        resetEditor()
      }

      showToast({
        title: 'Blog deleted',
        description: `${blog.title} admin blog listdan olib tashlandi.`,
        tone: 'success',
      })
    } catch (error) {
      showToast({
        title: 'Delete failed',
        description: getWebsiteStatsErrorMessage(error, "Blog o'chirilmadi."),
        tone: 'error',
      })
    }
  }

  async function handleSubmitBlog() {
    if (!adminToken) {
      return
    }

    if (!blogForm.title.trim()) {
      showToast({
        title: 'Title required',
        description: "Blog title bo'sh bo'lishi mumkin emas.",
        tone: 'error',
      })
      return
    }

    if (!blogForm.content.trim()) {
      showToast({
        title: 'Content required',
        description: "Blog content bo'sh bo'lishi mumkin emas.",
        tone: 'error',
      })
      return
    }

    if (!blogForm.title.trim()) {
      showToast({
        title: 'Title required',
        description: "Blog title bo'sh bo'lishi mumkin emas.",
        tone: 'error',
      })
      return
    }

    if (!blogForm.content.trim()) {
      showToast({
        title: 'Content required',
        description: "Blog content bo'sh bo'lishi mumkin emas.",
        tone: 'error',
      })
      return
    }

    setIsSavingBlog(true)

    try {
      const formData = buildBlogFormData(blogForm, blogImageFile, editorMode)

      if (editorMode === 'create') {
        await websiteStatsService.createBlog(formData, adminToken)
      } else if (editingBlogId) {
        await websiteStatsService.updateBlog(editingBlogId, formData, adminToken)
      }

      await blogsQuery.refetch()

      if (editorMode === 'edit' && editingBlogId) {
        setSelectedBlogId(editingBlogId)
        await detailQuery.refetch().catch(() => null)
      }

      resetEditor()
      showToast({
        title: editorMode === 'create' ? 'Blog created' : 'Blog updated',
        description: 'Website Stats blog data yangilandi.',
        tone: 'success',
      })
    } catch (error) {
      showToast({
        title: 'Blog save failed',
        description: getWebsiteStatsErrorMessage(error, 'Blog saqlanmadi.'),
        tone: 'error',
      })
    } finally {
      setIsSavingBlog(false)
    }
  }

  return (
    <section className="space-y-8">
      <PageHeader
        eyebrow="CEO / Web"
        title="Website Stats"
        description="Admin-authenticated blog publishing workspace with runtime image previews, detail fetches, and endpoint health checks."
        meta={[
          {
            label: 'Admin session',
            value: adminToken ? 'Connected' : 'Not connected',
            hint: adminToken
              ? 'Separate website admin token is available for blog CRUD.'
              : hasCeoAppSession
                ? 'CEO app session is active. Website token is stored separately and can be synced with the same credentials.'
                : 'Log in to the website admin API first.',
            tone: adminToken ? 'success' : 'warning',
          },
          {
            label: 'Admin verified',
            value: adminStatusQuery.data?.isAdmin ? 'Yes' : adminToken ? 'Pending' : 'No',
            hint: 'GET /admin/is-admin/ validation state.',
            tone: adminStatusQuery.data?.isAdmin ? 'blue' : 'neutral',
          },
          {
            label: 'Blog entries',
            value: formatCompactNumber(blogs.length),
            hint: 'GET /admin/all-blogs/ normalized rows.',
            tone: 'violet',
          },
          {
            label: 'Languages',
            value: formatCompactNumber(languageOptions.length),
            hint: 'Unique languages detected in the blog list.',
            tone: 'neutral',
          },
        ]}
        actions={
          adminToken ? (
            <>
              <Button variant="secondary" onClick={() => void refreshWebsiteStats()}>
                Refresh data
              </Button>
              <Button variant="ghost" onClick={resetEditor}>
                New draft
              </Button>
              <Button variant="danger" onClick={handleClearAdminSession}>
                Clear admin token
              </Button>
            </>
          ) : null
        }
      />

      {!adminToken ? (
        <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <Card className="p-6">
            <SectionTitle
              eyebrow="Admin auth"
              title="Website admin login"
              description={hasCeoAppSession
                ? "CIMS CEO session ishlayapti, lekin Website Stats token alohida saqlanadi. Eski session bo'lsa, bir marta qayta login qiling yoki shu formadan kiring."
                : 'POST /auth/login orqali alohida admin token olinadi va faqat shu page ichidagi CRUD uchun ishlatiladi.'}
            />
            <div className="mt-6 grid gap-4">
              <label className="grid gap-2">
                <span className="text-xs font-medium text-[var(--foreground)]">Email</span>
                <Input
                  type="email"
                  value={loginValues.email}
                  placeholder="admin@example.com"
                  onChange={(event) =>
                    setLoginValues((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-medium text-[var(--foreground)]">Password</span>
                <Input
                  type="password"
                  value={loginValues.password}
                  placeholder="Minimum 6 characters"
                  onChange={(event) =>
                    setLoginValues((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => void handleLogin()} loading={isLoggingIn}>
                  Connect admin API
                </Button>
              </div>
              {hasCeoAppSession ? (
                <div className="rounded-[20px] border border-blue-500/18 bg-blue-500/[0.08] px-4 py-4 text-sm leading-6 text-blue-100/90">
                  CEO app session topildi: <span className="font-semibold">{user?.email}</span>. Website API token alohida saqlanadi va tunnel ishlayotganida shu email bilan sync qilinadi.
                </div>
              ) : null}
            </div>
          </Card>

          <Card variant="glass" className="overflow-hidden p-0">
            <div className="border-b border-white/10 px-6 py-6">
              <SectionTitle
                eyebrow="Endpoint scope"
                title="Connected website surfaces"
                description="Login, admin verification, blog CRUD, image rendering and editor stylesheet are all represented on this page."
              />
            </div>
            <div className="grid gap-3 px-6 py-5 sm:grid-cols-2">
              <div className="rounded-[20px] border border-blue-500/20 bg-blue-600/10 px-4 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-blue-200/80">Auth</p>
                <p className="mt-2 text-sm font-semibold text-white">POST /auth/login</p>
                <p className="mt-2 text-[12px] leading-5 text-[var(--muted-strong)]">Requires JSON body with email and password.</p>
              </div>
              <div className="rounded-[20px] border border-emerald-500/20 bg-emerald-500/10 px-4 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-200/80">Admin check</p>
                <p className="mt-2 text-sm font-semibold text-white">GET /admin/is-admin/</p>
                <p className="mt-2 text-[12px] leading-5 text-[var(--muted-strong)]">Validates the stored Bearer token before blog actions.</p>
              </div>
              <div className="rounded-[20px] border border-violet-500/20 bg-violet-500/10 px-4 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-violet-200/80">Blog CRUD</p>
                <p className="mt-2 text-sm font-semibold text-white">Create, edit, delete and fetch blog posts</p>
                <p className="mt-2 text-[12px] leading-5 text-[var(--muted-strong)]">Uses FormData for title, content, language, active flag and image file.</p>
              </div>
              <div className="rounded-[20px] border border-amber-500/20 bg-amber-500/10 px-4 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-amber-200/80">Rendering</p>
                <p className="mt-2 text-sm font-semibold text-white">Uploads and Quill stylesheet</p>
                <p className="mt-2 text-[12px] leading-5 text-[var(--muted-strong)]">Image URLs resolve through /uploads and preview cards use the Quill Snow stylesheet.</p>
              </div>
            </div>
          </Card>
        </div>
      ) : adminStatusQuery.isError && !adminStatusQuery.data ? (
        <ErrorStateBlock
          eyebrow="Website Stats"
          title="Admin verification failed"
          description={getWebsiteStatsErrorMessage(
            adminStatusQuery.error,
            'Stored website admin token could not pass GET /admin/is-admin/. Refresh or clear the token and log in again.',
          )}
          actionLabel="Retry verification"
          onAction={() => {
            void adminStatusQuery.refetch().catch(() => null)
          }}
        />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Blog posts"
              value={formatCompactNumber(blogs.length)}
              caption="Normalized rows from the admin blog list endpoint"
              delta={`${activeBlogs} active`}
              deltaLabel="published now"
              trend="up"
              accent="blue"
              sparkBars={[1, Math.max(blogs.length - inactiveBlogs, 1), Math.max(blogs.length, 1), Math.max(activeBlogs, 1), Math.max(blogs.length, 1), Math.max(activeBlogs, 1)]}
            />
            <MetricCard
              label="Inactive"
              value={formatCompactNumber(inactiveBlogs)}
              caption="Draft or disabled blog posts"
              delta={`${activeBlogs} live`}
              deltaLabel="active inventory"
              trend={inactiveBlogs > 0 ? 'down' : 'flat'}
              accent="warning"
              sparkBars={[1, Math.max(inactiveBlogs, 1), Math.max(activeBlogs, 1), Math.max(inactiveBlogs, 1), Math.max(blogs.length, 1), Math.max(inactiveBlogs, 1)]}
            />
            <MetricCard
              label="Images"
              value={formatCompactNumber(blogsWithImages)}
              caption="Rows that currently expose an upload path"
              delta={`${blogs.length - blogsWithImages} missing`}
              deltaLabel="without image"
              trend="flat"
              accent="violet"
              sparkBars={[1, Math.max(blogsWithImages, 1), Math.max(blogs.length, 1), Math.max(blogsWithImages, 1), Math.max(languageOptions.length, 1), Math.max(blogsWithImages, 1)]}
            />
            <MetricCard
              label="Content words"
              value={formatCompactNumber(totalWords)}
              caption="Approximate text volume across the full blog inventory"
              delta={`${languageOptions.length} languages`}
              deltaLabel="coverage"
              trend="up"
              accent="success"
              sparkBars={[1, Math.max(totalWords / 20, 1), Math.max(totalWords / 12, 1), Math.max(totalWords / 8, 1), Math.max(totalWords / 6, 1), Math.max(totalWords / 5, 1)]}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <Card className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <SectionTitle
                  eyebrow="Editor"
                  title={editorMode === 'create' ? 'Create blog post' : 'Edit blog post'}
                  description="Create uses POST /admin/create/blog/, edit uses PATCH /admin/edit-blog/{id}/."
                />
                {editorMode === 'edit' ? (
                  <Badge variant="warning" dot>
                    Editing #{editingBlogId}
                  </Badge>
                ) : (
                  <Badge variant="success" dot>
                    New draft
                  </Badge>
                )}
              </div>

              <div className="mt-6 grid gap-4">
                <label className="grid gap-2">
                  <span className="text-xs font-medium text-[var(--foreground)]">Title</span>
                  <Input
                    value={blogForm.title}
                    placeholder="Enter blog title"
                    onChange={(event) =>
                      setBlogForm((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                  />
                </label>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="text-xs font-medium text-[var(--foreground)]">Language</span>
                    <SelectField
                      value={blogForm.language}
                      options={languageOptions}
                      onValueChange={(value) =>
                        setBlogForm((current) => ({
                          ...current,
                          language: value,
                        }))
                      }
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-xs font-medium text-[var(--foreground)]">Image file</span>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(event) => setBlogImageFile(event.target.files?.[0] ?? null)}
                    />
                  </label>
                </div>

                <label className="flex items-center gap-3 rounded-[20px] border border-[var(--border)] bg-[var(--input-surface)] px-4 py-3 shadow-[inset_0_1px_2px_rgba(0,0,0,0.12)] transition hover:border-[var(--border-hover)] hover:bg-[var(--input-surface-hover)]">
                  <input
                    type="checkbox"
                    checked={blogForm.isActive}
                    onChange={(event) =>
                      setBlogForm((current) => ({
                        ...current,
                        isActive: event.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border border-white/10 accent-blue-500"
                  />
                  <span className="text-xs text-[var(--muted-strong)]">Publish as active content</span>
                </label>

                <label className="grid gap-2">
                  <span className="text-xs font-medium text-[var(--foreground)]">Content</span>
                  <Textarea
                    rows={14}
                    value={blogForm.content}
                    placeholder="<p>Write HTML content or paste editor output here...</p>"
                    onChange={(event) =>
                      setBlogForm((current) => ({
                        ...current,
                        content: event.target.value,
                      }))
                    }
                  />
                </label>

                <div className="rounded-[24px] border border-white/10 bg-black/15 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--caption)]">Live preview</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">Quill Snow stylesheet is loaded for this content surface.</p>
                    </div>
                    <Badge variant={blogForm.isActive ? 'success' : 'secondary'} dot>
                      {blogForm.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="mt-4 overflow-hidden rounded-[20px] border border-black/10 bg-white text-black">
                    {blogForm.content.trim() ? (
                      <div className="ql-editor min-h-[220px]" dangerouslySetInnerHTML={{ __html: blogForm.content }} />
                    ) : (
                      <div className="grid min-h-[220px] place-items-center px-6 text-sm text-zinc-500">
                        Preview will appear after content is entered.
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-[var(--muted)]">
                    {blogImageFile ? `Selected file: ${blogImageFile.name}` : editorMode === 'create' ? 'Create mode requires an image file.' : 'Image is optional for updates.'}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={resetEditor}>
                      Reset
                    </Button>
                    <Button onClick={() => void handleSubmitBlog()} loading={isSavingBlog}>
                      {editorMode === 'create' ? 'Create blog' : 'Save changes'}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            <Card variant="glass" className="overflow-hidden p-0">
              <div className="border-b border-white/10 px-6 py-6">
                <SectionTitle
                  eyebrow="Detail"
                  title={selectedBlog ? selectedBlog.title : 'Blog detail'}
                  description="GET /admin/get-blog/{id}/ result with image rendering, content preview and raw payload inspection."
                />
              </div>
              <div className="grid gap-5 px-6 py-5">
                {detailQuery.isLoading && !selectedBlog ? (
                  <LoadingStateBlock
                    eyebrow="Website Stats"
                    title="Loading blog detail"
                    description="Fetching the selected blog record from the admin detail endpoint."
                  />
                ) : detailQuery.isError && !selectedBlog ? (
                  <ErrorStateBlock
                    eyebrow="Website Stats"
                    title="Blog detail unavailable"
                    description={getWebsiteStatsErrorMessage(
                      detailQuery.error,
                      'GET /admin/get-blog/{id}/ did not return a usable payload.',
                    )}
                    actionLabel="Retry"
                    onAction={() => {
                      void detailQuery.refetch().catch(() => null)
                    }}
                  />
                ) : selectedBlog ? (
                  <>
                    {resolveWebsiteBlogImageUrl(selectedBlog.image_url) ? (
                      <div className="overflow-hidden rounded-[24px] border border-white/10 bg-black/20">
                        <img
                          src={resolveWebsiteBlogImageUrl(selectedBlog.image_url) ?? ''}
                          alt={selectedBlog.title}
                          className="h-64 w-full object-cover"
                        />
                      </div>
                    ) : null}

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[20px] border border-blue-500/16 bg-blue-500/[0.08] px-4 py-4">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-blue-200/72">Language</p>
                        <p className="mt-2 text-lg font-semibold text-white">{selectedBlog.language || '-'}</p>
                      </div>
                      <div className="rounded-[20px] border border-violet-500/16 bg-violet-500/[0.08] px-4 py-4">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-violet-200/72">Status</p>
                        <p className="mt-2 text-lg font-semibold text-white">{selectedBlog.is_active ? 'Active' : 'Inactive'}</p>
                      </div>
                      <div className="rounded-[20px] border border-emerald-500/16 bg-emerald-500/[0.08] px-4 py-4">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-200/72">Created</p>
                        <p className="mt-2 text-lg font-semibold text-white">{formatTimestamp(selectedBlog.created_at)}</p>
                      </div>
                      <div className="rounded-[20px] border border-amber-500/16 bg-amber-500/[0.08] px-4 py-4">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-200/72">Updated</p>
                        <p className="mt-2 text-lg font-semibold text-white">{formatTimestamp(selectedBlog.updated_at)}</p>
                      </div>
                    </div>

                    <div className="overflow-hidden rounded-[24px] border border-white/10 bg-white text-black">
                      <div className="border-b border-black/10 px-5 py-4">
                        <p className="text-sm font-semibold text-black">Rendered content preview</p>
                      </div>
                      <div className="ql-editor min-h-[240px]" dangerouslySetInnerHTML={{ __html: selectedBlog.content || '<p>No content</p>' }} />
                    </div>

                    <div className="rounded-[24px] border border-white/10 bg-black/15 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">Raw payload</p>
                          <p className="mt-1 text-xs text-[var(--muted)]">Normalized detail row still keeps the original server payload for inspection.</p>
                        </div>
                        <Badge variant="secondary" dot>
                          #{selectedBlog.id}
                        </Badge>
                      </div>
                      <pre className="mt-4 max-h-72 overflow-auto rounded-[18px] border border-white/8 bg-black/35 p-4 text-xs leading-6 text-[var(--muted-strong)]">
                        {selectedBlogPayload}
                      </pre>
                    </div>
                  </>
                ) : (
                  <EmptyStateBlock
                    eyebrow="Website Stats"
                    title="No blog selected"
                    description="Select a row from the blog table to inspect its detail payload."
                  />
                )}
              </div>
            </Card>
          </div>

          <Card className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <SectionTitle
                eyebrow="Inventory"
                title="Website blog table"
                description="All blog rows from GET /admin/all-blogs/ with filters, row actions and detail fetch on click."
              />
              <div className="flex flex-wrap gap-2">
                <Badge variant="success" dot>
                  {activeBlogs} active
                </Badge>
                <Badge variant="secondary" dot>
                  {inactiveBlogs} inactive
                </Badge>
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.45fr_0.35fr]">
              <label className="grid gap-2">
                <span className="text-xs font-medium text-[var(--foreground)]">Search</span>
                <Input
                  value={blogSearch}
                  placeholder="Filter by title, content, language or image path"
                  onChange={(event) => setBlogSearch(event.target.value)}
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-medium text-[var(--foreground)]">Language</span>
                <SelectField
                  value={languageFilter}
                  placeholder="All languages"
                  options={[{ value: '', label: 'All languages' }, ...languageOptions]}
                  onValueChange={setLanguageFilter}
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-medium text-[var(--foreground)]">Status</span>
                <SelectField
                  value={statusFilter}
                  placeholder="All statuses"
                  options={[
                    { value: '', label: 'All statuses' },
                    { value: 'active', label: 'Active' },
                    { value: 'inactive', label: 'Inactive' },
                  ]}
                  onValueChange={setStatusFilter}
                />
              </label>
            </div>

            <div className="mt-6">
              {blogsQuery.isLoading && !blogsQuery.data ? (
                <LoadingStateBlock
                  eyebrow="Website Stats"
                  title="Loading blog inventory"
                  description="Fetching blog rows from the admin list endpoint."
                />
              ) : blogsQuery.isError && !blogsQuery.data ? (
                <ErrorStateBlock
                  eyebrow="Website Stats"
                  title="Blog inventory unavailable"
                  description={getWebsiteStatsErrorMessage(
                    blogsQuery.error,
                    'GET /admin/all-blogs/ failed or returned an unsupported payload.',
                  )}
                  actionLabel="Retry"
                  onAction={() => {
                    void blogsQuery.refetch().catch(() => null)
                  }}
                />
              ) : (
                <DataTable
                  caption="Website blog inventory"
                  rows={filteredBlogs}
                  getRowKey={(row) => String(row.id)}
                  pageSize={10}
                  zebra
                  onRowClick={(row) => setSelectedBlogId(row.id)}
                  emptyState={
                    <EmptyStateBlock
                      eyebrow="Website Stats"
                      title="No blogs found"
                      description="Current filters did not match any blog rows from the admin list endpoint."
                    />
                  }
                  columns={[
                    {
                      key: 'title',
                      header: 'Title',
                      render: (row) => (
                        <div className="max-w-[340px]">
                          <p className="font-semibold text-(--foreground)">{row.title}</p>
                          <p className="mt-1 text-xs leading-5 text-(--muted)">{getBlogExcerpt(row)}</p>
                        </div>
                      ),
                    },
                    {
                      key: 'language',
                      header: 'Language',
                      render: (row) => (
                        <Badge variant="outline">
                          {row.language || '-'}
                        </Badge>
                      ),
                    },
                    {
                      key: 'status',
                      header: 'Status',
                      render: (row) => (
                        <Badge variant={row.is_active ? 'success' : 'secondary'} dot>
                          {row.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      ),
                    },
                    {
                      key: 'image',
                      header: 'Image',
                      render: (row) => (
                        <span className={cn('text-sm', row.image_url ? 'text-emerald-300' : 'text-(--muted)')}>
                          {row.image_url ? 'Attached' : 'None'}
                        </span>
                      ),
                    },
                    {
                      key: 'updated_at',
                      header: 'Updated',
                      render: (row) => formatTimestamp(row.updated_at ?? row.created_at),
                    },
                    {
                      key: 'actions',
                      header: 'Actions',
                      render: (row) => (
                        <div onClick={(event) => event.stopPropagation()}>
                          <ActionsMenu
                            label={`Open actions for ${row.title}`}
                            items={[
                              {
                                label: 'Inspect',
                                onSelect: () => setSelectedBlogId(row.id),
                              },
                              {
                                label: 'Edit',
                                onSelect: () => {
                                  void handlePrepareEdit(row)
                                },
                              },
                              {
                                label: 'Delete',
                                onSelect: () => {
                                  void handleDeleteBlog(row)
                                },
                                tone: 'danger',
                              },
                            ]}
                          />
                        </div>
                      ),
                    },
                  ]}
                />
              )}
            </div>
          </Card>
        </>
      )}
    </section>
  )
}
