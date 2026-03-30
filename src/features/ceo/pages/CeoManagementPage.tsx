import { useEffect, useMemo, useState } from 'react'
import { managementService } from '../../../shared/api/services/management.service'
import type {
  ManagementImageCategory,
  ManagementImageCleanupResponse,
  ManagementImageRecord,
  ManagementPageCreatePayload,
  ManagementPageRecord,
  ManagementPageUpdatePayload,
  ManagementRoleCreatePayload,
  ManagementRoleRecord,
  ManagementRoleUpdatePayload,
  ManagementStatusCreatePayload,
  ManagementStatusRecord,
  ManagementStatusUpdatePayload,
} from '../../../shared/api/types'
import { useConfirm } from '../../../shared/confirm/useConfirm'
import { useAsyncData } from '../../../shared/hooks/useAsyncData'
import { translateCurrentLiteral } from '../../../shared/i18n/translations'
import { getApiErrorMessage } from '../../../shared/lib/api-error'
import { cn } from '../../../shared/lib/cn'
import { formatShortDate } from '../../../shared/lib/format'
import { useToast } from '../../../shared/toast/useToast'
import { ActionsMenu } from '../../../shared/ui/actions-menu'
import { Badge } from '../../../shared/ui/badge'
import { Button } from '../../../shared/ui/button'
import { Card } from '../../../shared/ui/card'
import { DataTable } from '../../../shared/ui/data-table'
import { Dialog } from '../../../shared/ui/dialog'
import { Input } from '../../../shared/ui/input'
import { PageHeader } from '../../../shared/ui/page-header'
import { SectionTitle } from '../../../shared/ui/section-title'
import { SelectField, type SelectFieldOption } from '../../../shared/ui/select-field'
import { ErrorStateBlock, LoadingStateBlock } from '../../../shared/ui/state-block'
import { Textarea } from '../../../shared/ui/textarea'
import { resolveMediaUrl } from '../../../shared/lib/media-url'

type ManagementTab = 'pages' | 'statuses' | 'roles' | 'images'
type ImageReferenceFilter = 'all' | 'referenced' | 'unreferenced'

type PageFormState = {
  name: string
  displayName: string
  description: string
  routePath: string
  order: string
  isActive: boolean
  isSystem: boolean
}

type StatusFormState = {
  name: string
  displayName: string
  description: string
  color: string
  order: string
  isActive: boolean
  isSystem: boolean
}

type RoleFormState = {
  name: string
  displayName: string
  description: string
  isActive: boolean
  isSystem: boolean
}

const tabOptions: Array<{ key: ManagementTab; label: string; description: string }> = [
  { key: 'pages', label: 'Pages', description: 'Permission pages with live CRUD.' },
  { key: 'statuses', label: 'Statuses', description: 'Dynamic CRM statuses with live CRUD.' },
  { key: 'roles', label: 'Roles', description: 'User roles with live CRUD.' },
  { key: 'images', label: 'Images Cleanup', description: 'Image library, detail view and cleanup actions.' },
]

const imageCategoryOptions: SelectFieldOption[] = [
  { value: '', label: 'All categories' },
  { value: 'project_images', label: 'Project images' },
  { value: 'card_images', label: 'Card images' },
  { value: 'profile_images', label: 'Profile images' },
  { value: 'profil_images', label: 'Profil images (legacy)' },
]

const imageReferenceFilterOptions: SelectFieldOption[] = [
  { value: 'all', label: 'All images' },
  { value: 'referenced', label: 'Referenced only' },
  { value: 'unreferenced', label: 'Unreferenced only' },
]

const initialPageForm: PageFormState = {
  name: '',
  displayName: '',
  description: '',
  routePath: '',
  order: '0',
  isActive: true,
  isSystem: false,
}

const statusColorPresets = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#14B8A6']

const initialStatusForm: StatusFormState = {
  name: '',
  displayName: '',
  description: '',
  color: '#2563EB',
  order: '0',
  isActive: true,
  isSystem: false,
}

const initialRoleForm: RoleFormState = {
  name: '',
  displayName: '',
  description: '',
  isActive: true,
  isSystem: false,
}

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string | number
  hint: string
}) {
  const lt = translateCurrentLiteral
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/[0.03] px-5 py-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-blue-300/75">{lt(label)}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-white">{value}</p>
      <p className="mt-2 text-xs text-(--muted)">{lt(hint)}</p>
    </div>
  )
}

function toPageFormState(item?: ManagementPageRecord | null): PageFormState {
  if (!item) {
    return initialPageForm
  }

  return {
    name: item.name,
    displayName: item.display_name,
    description: item.description ?? '',
    routePath: item.route_path,
    order: String(item.order ?? 0),
    isActive: item.is_active,
    isSystem: item.is_system,
  }
}

function toStatusFormState(item?: ManagementStatusRecord | null): StatusFormState {
  if (!item) {
    return initialStatusForm
  }

  return {
    name: item.name,
    displayName: item.display_name,
    description: item.description ?? '',
    color: item.color || '#2563EB',
    order: String(item.order ?? 0),
    isActive: item.is_active,
    isSystem: item.is_system,
  }
}

function toRoleFormState(item?: ManagementRoleRecord | null): RoleFormState {
  if (!item) {
    return initialRoleForm
  }

  return {
    name: item.name,
    displayName: item.display_name,
    description: item.description ?? '',
    isActive: item.is_active,
    isSystem: item.is_system,
  }
}

function BooleanToggle({
  value,
  onChange,
  trueLabel,
  falseLabel,
}: {
  value: boolean
  onChange: (next: boolean) => void
  trueLabel: string
  falseLabel: string
}) {
  const lt = translateCurrentLiteral
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <button
        type="button"
        onClick={() => onChange(true)}
        className={cn(
          'rounded-[16px] border px-4 py-3 text-left text-sm transition',
          value
            ? 'border-emerald-400/35 bg-emerald-500/[0.10] text-white'
            : 'border-white/10 bg-white/[0.03] text-white/72 hover:border-white/16',
        )}
      >
        {lt(trueLabel)}
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={cn(
          'rounded-[16px] border px-4 py-3 text-left text-sm transition',
          !value
            ? 'border-amber-400/35 bg-amber-500/[0.10] text-white'
            : 'border-white/10 bg-white/[0.03] text-white/72 hover:border-white/16',
        )}
      >
        {lt(falseLabel)}
      </button>
    </div>
  )
}

function formatBytes(value?: number | null) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return '-'
  }

  if (value < 1024) {
    return `${value} B`
  }

  const units = ['KB', 'MB', 'GB', 'TB']
  let size = value / 1024
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }

  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unitIndex]}`
}

function getImageCategoryLabel(category?: ManagementImageCategory | null) {
  switch (category) {
    case 'project_images':
      return 'Project images'
    case 'card_images':
      return 'Card images'
    case 'profile_images':
      return 'Profile images'
    case 'profil_images':
      return 'Profil images'
    default:
      return category || 'Unknown'
  }
}

export function CeoManagementPage() {
  const { showToast } = useToast()
  const { confirm } = useConfirm()
  const lt = translateCurrentLiteral
  const [activeTab, setActiveTab] = useState<ManagementTab>('statuses')

  const [pageDialogMode, setPageDialogMode] = useState<'create' | 'edit'>('create')
  const [pageDialogOpen, setPageDialogOpen] = useState(false)
  const [pageForm, setPageForm] = useState<PageFormState>(initialPageForm)
  const [editingPage, setEditingPage] = useState<ManagementPageRecord | null>(null)
  const [isPageSubmitting, setIsPageSubmitting] = useState(false)

  const [statusDialogMode, setStatusDialogMode] = useState<'create' | 'edit'>('create')
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [statusForm, setStatusForm] = useState<StatusFormState>(initialStatusForm)
  const [editingStatus, setEditingStatus] = useState<ManagementStatusRecord | null>(null)
  const [isStatusSubmitting, setIsStatusSubmitting] = useState(false)

  const [roleDialogMode, setRoleDialogMode] = useState<'create' | 'edit'>('create')
  const [roleDialogOpen, setRoleDialogOpen] = useState(false)
  const [roleForm, setRoleForm] = useState<RoleFormState>(initialRoleForm)
  const [editingRole, setEditingRole] = useState<ManagementRoleRecord | null>(null)
  const [isRoleSubmitting, setIsRoleSubmitting] = useState(false)

  const [isSingleDeleteSubmitting, setIsSingleDeleteSubmitting] = useState(false)
  const [isBulkDeleteSubmitting, setIsBulkDeleteSubmitting] = useState(false)
  const [imageCategoryFilter, setImageCategoryFilter] = useState<string>('')
  const [imageReferenceFilter, setImageReferenceFilter] = useState<ImageReferenceFilter>('all')
  const [imageSearch, setImageSearch] = useState('')
  const [selectedImagePaths, setSelectedImagePaths] = useState<string[]>([])
  const [imageDetailPath, setImageDetailPath] = useState<string | null>(null)

  const pagesQuery = useAsyncData(() => managementService.listPages(), [])
  const statusesQuery = useAsyncData(() => managementService.listStatuses(), [])
  const rolesQuery = useAsyncData(() => managementService.listRoles(), [])
  const imagesQuery = useAsyncData(
    () => managementService.listImages({
      category: (imageCategoryFilter || undefined) as ManagementImageCategory | undefined,
      referenced_only: imageReferenceFilter === 'referenced',
      unreferenced_only: imageReferenceFilter === 'unreferenced',
    }),
    [activeTab, imageCategoryFilter, imageReferenceFilter],
    { enabled: activeTab === 'images' },
  )
  const imageDetailQuery = useAsyncData(
    () => managementService.getImageDetail(imageDetailPath ?? ''),
    [imageDetailPath],
    { enabled: Boolean(imageDetailPath) },
  )

  const pageItems = useMemo(
    () => [...(pagesQuery.data ?? [])].sort((left, right) => left.order - right.order || left.display_name.localeCompare(right.display_name)),
    [pagesQuery.data],
  )

  const statuses = useMemo(
    () => [...(statusesQuery.data ?? [])].sort((left, right) => left.order - right.order || left.display_name.localeCompare(right.display_name)),
    [statusesQuery.data],
  )
  const roles = useMemo(
    () => [...(rolesQuery.data ?? [])].sort((left, right) => left.display_name.localeCompare(right.display_name)),
    [rolesQuery.data],
  )
  const imageItems = useMemo(
    () => [...(imagesQuery.data?.images ?? [])].sort((left, right) => (
      new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime() ||
      left.filename.localeCompare(right.filename)
    )),
    [imagesQuery.data?.images],
  )
  const filteredImages = useMemo(() => {
    const normalizedSearch = imageSearch.trim().toLowerCase()

    if (!normalizedSearch) {
      return imageItems
    }

    return imageItems.filter((image) =>
      [image.filename, image.path, image.category]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch)),
    )
  }, [imageItems, imageSearch])
  const selectedImagePathSet = useMemo(
    () => new Set(selectedImagePaths),
    [selectedImagePaths],
  )
  const referencedImagesCount = useMemo(
    () => imageItems.filter((image) => image.is_referenced).length,
    [imageItems],
  )
  const unreferencedImagesCount = useMemo(
    () => imageItems.filter((image) => !image.is_referenced).length,
    [imageItems],
  )
  const allFilteredImagesSelected = filteredImages.length > 0 && filteredImages.every((image) => selectedImagePathSet.has(image.path))
  const activeImageDetail = useMemo(() => {
    if (!imageDetailPath) {
      return null
    }

    if (imageDetailQuery.data?.path === imageDetailPath) {
      return imageDetailQuery.data
    }

    return imageItems.find((image) => image.path === imageDetailPath) ?? null
  }, [imageDetailPath, imageDetailQuery.data, imageItems])

  useEffect(() => {
    setSelectedImagePaths((current) => {
      const next = current.filter((path) => imageItems.some((image) => image.path === path))
      return next.length === current.length && next.every((path, index) => path === current[index]) ? current : next
    })
  }, [imageItems])

  const isInitialLoading =
    !pagesQuery.data &&
    !statusesQuery.data &&
    !rolesQuery.data &&
    (pagesQuery.isLoading || statusesQuery.isLoading || rolesQuery.isLoading)

  function closePageDialog() {
    setPageDialogOpen(false)
    setEditingPage(null)
    setPageForm(initialPageForm)
  }

  function closeStatusDialog() {
    setStatusDialogOpen(false)
    setEditingStatus(null)
    setStatusForm(initialStatusForm)
  }

  function closeRoleDialog() {
    setRoleDialogOpen(false)
    setEditingRole(null)
    setRoleForm(initialRoleForm)
  }

  function reloadManagementPageAfterSave() {
    if (typeof window === 'undefined') {
      return
    }

    window.setTimeout(() => {
      window.location.reload()
    }, 180)
  }

  async function refreshAll() {
    const tasks: Array<Promise<unknown>> = [
      pagesQuery.refetch(),
      statusesQuery.refetch(),
      rolesQuery.refetch(),
    ]

    if (activeTab === 'images' || imagesQuery.data) {
      tasks.push(imagesQuery.refetch())
    }

    const results = await Promise.allSettled(tasks)

    const failed = results.find((result) => result.status === 'rejected')

    if (failed && failed.status === 'rejected') {
      showToast({
        title: lt('Management refresh failed'),
        description: getApiErrorMessage(failed.reason),
        tone: 'error',
      })
      return
    }

    showToast({
      title: lt('Management refreshed'),
      description: activeTab === 'images'
        ? lt('Pages, statuses, roles and images reloaded.')
        : lt('Pages, statuses and roles reloaded.'),
      tone: 'success',
    })
  }

  function toggleImageSelection(imagePath: string, nextValue?: boolean) {
    setSelectedImagePaths((current) => {
      const hasPath = current.includes(imagePath)

      if (nextValue ?? !hasPath) {
        return hasPath ? current : [...current, imagePath]
      }

      return current.filter((path) => path !== imagePath)
    })
  }

  function toggleSelectAllFilteredImages(nextValue: boolean) {
    setSelectedImagePaths((current) => {
      const filteredPaths = filteredImages.map((image) => image.path)

      if (nextValue) {
        return Array.from(new Set([...current, ...filteredPaths]))
      }

      const filteredSet = new Set(filteredPaths)
      return current.filter((path) => !filteredSet.has(path))
    })
  }

  function openImageDetail(image: Pick<ManagementImageRecord, 'path'>) {
    setImageDetailPath(image.path)
  }

  function applyCleanupResult(response: ManagementImageCleanupResponse) {
    if (response.deleted_paths.length === 0) {
      return
    }

    const deletedPathSet = new Set(response.deleted_paths)

    setSelectedImagePaths((current) => current.filter((path) => !deletedPathSet.has(path)))

    if (imageDetailPath && deletedPathSet.has(imageDetailPath)) {
      setImageDetailPath(null)
    }
  }

  async function refreshImagesAfterCleanup() {
    if (activeTab === 'images' || imagesQuery.data) {
      await imagesQuery.refetch()
    }
  }

  async function handleDeleteImageByPath(imagePath: string) {
    const approved = await confirm({
      title: lt('Delete this image?'),
      description: imagePath,
      confirmLabel: lt('Delete image'),
      tone: 'danger',
    })

    if (!approved) {
      return
    }

    setIsSingleDeleteSubmitting(true)

    try {
      const response = await managementService.deleteImage(imagePath)
      applyCleanupResult(response)
      await refreshImagesAfterCleanup()
      showToast({
        title: lt('Image cleanup complete'),
        description: response.message,
        tone: 'success',
      })
    } catch (error) {
      showToast({
        title: lt('Image delete failed'),
        description: getApiErrorMessage(error),
        tone: 'error',
      })
    } finally {
      setIsSingleDeleteSubmitting(false)
    }
  }

  function openCreatePageDialog() {
    setPageDialogMode('create')
    setEditingPage(null)
    setPageForm(initialPageForm)
    setPageDialogOpen(true)
  }

  function openEditPageDialog(item: ManagementPageRecord) {
    setPageDialogMode('edit')
    setEditingPage(item)
    setPageForm(toPageFormState(item))
    setPageDialogOpen(true)
  }

  async function handleSubmitPage() {
    if (!pageForm.name.trim() || !pageForm.displayName.trim() || !pageForm.routePath.trim()) {
      showToast({
        title: lt('Page form incomplete'),
        description: lt('Name, display name, and route path are required.'),
        tone: 'error',
      })
      return
    }

    setIsPageSubmitting(true)

    try {
      const shouldReloadPage = pageDialogMode === 'edit'

      if (pageDialogMode === 'create') {
        const payload: ManagementPageCreatePayload = {
          name: pageForm.name.trim(),
          display_name: pageForm.displayName.trim(),
          description: pageForm.description.trim() || undefined,
          route_path: pageForm.routePath.trim(),
          order: Number(pageForm.order) || 0,
          is_active: pageForm.isActive,
          is_system: pageForm.isSystem,
        }

        await managementService.createPage(payload)
      } else if (editingPage) {
        const payload: ManagementPageUpdatePayload = {
          display_name: pageForm.displayName.trim(),
          description: pageForm.description.trim() || undefined,
          route_path: pageForm.routePath.trim(),
          order: Number(pageForm.order) || 0,
          is_active: pageForm.isActive,
        }

        await managementService.updatePage(editingPage.id, payload)
      }

      await pagesQuery.refetch()
      closePageDialog()
      showToast({
        title: pageDialogMode === 'create' ? lt('Page created') : lt('Page updated'),
        description: lt('Management pages list refreshed.'),
        tone: 'success',
      })

      if (shouldReloadPage) {
        reloadManagementPageAfterSave()
      }
    } catch (error) {
      showToast({
        title: lt('Page save failed'),
        description: getApiErrorMessage(error),
        tone: 'error',
      })
    } finally {
      setIsPageSubmitting(false)
    }
  }

  async function handleDeletePage(item: ManagementPageRecord) {
    const approved = await confirm({
      title: `${lt('Delete page')} ${item.display_name}?`,
      description: item.is_system
        ? 'Backend system page ni oвЂchirishga ruxsat bermasligi mumkin.'
        : 'Permission page butunlay oвЂchiriladi.',
      confirmLabel: lt('Delete page'),
      tone: 'danger',
    })

    if (!approved) {
      return
    }

    try {
      await managementService.deletePage(item.id)
      await pagesQuery.refetch()
      showToast({
        title: lt('Page deleted'),
        description: `${item.display_name} ${lt('removed.')}`,
        tone: 'success',
      })
    } catch (error) {
      showToast({
        title: lt('Delete failed'),
        description: getApiErrorMessage(error),
        tone: 'error',
      })
    }
  }

  function openCreateStatusDialog() {
    setStatusDialogMode('create')
    setEditingStatus(null)
    setStatusForm(initialStatusForm)
    setStatusDialogOpen(true)
  }

  function openEditStatusDialog(item: ManagementStatusRecord) {
    setStatusDialogMode('edit')
    setEditingStatus(item)
    setStatusForm(toStatusFormState(item))
    setStatusDialogOpen(true)
  }

  function openCreateRoleDialog() {
    setRoleDialogMode('create')
    setEditingRole(null)
    setRoleForm(initialRoleForm)
    setRoleDialogOpen(true)
  }

  function openEditRoleDialog(item: ManagementRoleRecord) {
    setRoleDialogMode('edit')
    setEditingRole(item)
    setRoleForm(toRoleFormState(item))
    setRoleDialogOpen(true)
  }

  async function handleSubmitStatus() {
    if (!statusForm.name.trim() || !statusForm.displayName.trim()) {
      showToast({
        title: lt('Status form incomplete'),
        description: lt('Name and display name are required.'),
        tone: 'error',
      })
      return
    }

    setIsStatusSubmitting(true)

    try {
      const shouldReloadPage = statusDialogMode === 'edit'

      if (statusDialogMode === 'create') {
        const payload: ManagementStatusCreatePayload = {
          name: statusForm.name.trim(),
          display_name: statusForm.displayName.trim(),
          description: statusForm.description.trim() || undefined,
          color: statusForm.color,
          order: Number(statusForm.order) || 0,
          is_active: statusForm.isActive,
          is_system: statusForm.isSystem,
        }

        await managementService.createStatus(payload)
      } else if (editingStatus) {
        const payload: ManagementStatusUpdatePayload = {
          display_name: statusForm.displayName.trim(),
          description: statusForm.description.trim() || undefined,
          color: statusForm.color,
          order: Number(statusForm.order) || 0,
          is_active: statusForm.isActive,
        }

        await managementService.updateStatus(editingStatus.id, payload)
      }

      await statusesQuery.refetch()
      closeStatusDialog()
      showToast({
        title: statusDialogMode === 'create' ? lt('Status created') : lt('Status updated'),
        description: lt('Management statuses list refreshed.'),
        tone: 'success',
      })

      if (shouldReloadPage) {
        reloadManagementPageAfterSave()
      }
    } catch (error) {
      showToast({
        title: lt('Status save failed'),
        description: getApiErrorMessage(error),
        tone: 'error',
      })
    } finally {
      setIsStatusSubmitting(false)
    }
  }

  async function handleDeleteStatus(item: ManagementStatusRecord) {
    const approved = await confirm({
      title: `${lt('Delete status')} ${item.display_name}?`,
      description: item.is_system
        ? 'Backend system statusni oвЂchirishga ruxsat bermasligi mumkin.'
        : 'Status butunlay oвЂchiriladi.',
      confirmLabel: lt('Delete status'),
      tone: 'danger',
    })

    if (!approved) {
      return
    }

    try {
      await managementService.deleteStatus(item.id)
      await statusesQuery.refetch()
      showToast({
        title: lt('Status deleted'),
        description: `${item.display_name} ${lt('removed.')}`,
        tone: 'success',
      })
    } catch (error) {
      showToast({
        title: lt('Delete failed'),
        description: getApiErrorMessage(error),
        tone: 'error',
      })
    }
  }

  async function handleSubmitRole() {
    if (!roleForm.name.trim() || !roleForm.displayName.trim()) {
      showToast({
        title: lt('Role form incomplete'),
        description: lt('Name and display name are required.'),
        tone: 'error',
      })
      return
    }

    setIsRoleSubmitting(true)

    try {
      const shouldReloadPage = roleDialogMode === 'edit'

      if (roleDialogMode === 'create') {
        const payload: ManagementRoleCreatePayload = {
          name: roleForm.name.trim(),
          display_name: roleForm.displayName.trim(),
          description: roleForm.description.trim() || undefined,
          is_active: roleForm.isActive,
          is_system: roleForm.isSystem,
        }

        await managementService.createRole(payload)
      } else if (editingRole) {
        const payload: ManagementRoleUpdatePayload = {
          display_name: roleForm.displayName.trim(),
          description: roleForm.description.trim() || undefined,
          is_active: roleForm.isActive,
        }

        await managementService.updateRole(editingRole.id, payload)
      }

      await rolesQuery.refetch()
      closeRoleDialog()
      showToast({
        title: roleDialogMode === 'create' ? lt('Role created') : lt('Role updated'),
        description: lt('Management roles list refreshed.'),
        tone: 'success',
      })

      if (shouldReloadPage) {
        reloadManagementPageAfterSave()
      }
    } catch (error) {
      showToast({
        title: lt('Role save failed'),
        description: getApiErrorMessage(error),
        tone: 'error',
      })
    } finally {
      setIsRoleSubmitting(false)
    }
  }

  async function handleDeleteRole(item: ManagementRoleRecord) {
    const approved = await confirm({
      title: `${lt('Delete role')} ${item.display_name}?`,
      description: item.is_system
        ? 'Backend system rolni oвЂchirishga ruxsat bermasligi mumkin.'
        : 'Role butunlay oвЂchiriladi.',
      confirmLabel: lt('Delete role'),
      tone: 'danger',
    })

    if (!approved) {
      return
    }

    try {
      await managementService.deleteRole(item.id)
      await rolesQuery.refetch()
      showToast({
        title: lt('Role deleted'),
        description: `${item.display_name} ${lt('removed.')}`,
        tone: 'success',
      })
    } catch (error) {
      showToast({
        title: lt('Delete failed'),
        description: getApiErrorMessage(error),
        tone: 'error',
      })
    }
  }

  async function handleDeleteSelectedImages() {
    if (selectedImagePaths.length === 0) {
      showToast({
        title: lt('No images selected'),
        description: lt('Select at least one image to delete.'),
        tone: 'error',
      })
      return
    }

    const approved = await confirm({
      title: `${lt('Delete')} ${selectedImagePaths.length} ${lt(selectedImagePaths.length > 1 ? 'selected images' : 'selected image')}?`,
      description: lt('Bulk delete runs against the selected paths and can also clear database references.'),
      confirmLabel: lt('Delete selected'),
      tone: 'danger',
    })

    if (!approved) {
      return
    }

    setIsBulkDeleteSubmitting(true)

    try {
      const response = await managementService.bulkDeleteImages({
        image_paths: selectedImagePaths,
        delete_all_in_category: false,
        only_unreferenced: false,
      })

      applyCleanupResult(response)
      await refreshImagesAfterCleanup()
      showToast({
        title: lt('Selected images deleted'),
        description: response.message,
        tone: 'success',
      })
    } catch (error) {
      showToast({
        title: lt('Selected delete failed'),
        description: getApiErrorMessage(error),
        tone: 'error',
      })
    } finally {
      setIsBulkDeleteSubmitting(false)
    }
  }

  /* Legacy bulk cleanup panel removed
  async function handleBulkDeleteImages() {
    const imagePaths = bulkDeleteForm.imagePathsText
      .split('\n')
      .map((entry) => entry.trim())
      .filter(Boolean)

    if (!bulkDeleteForm.deleteAllInCategory && imagePaths.length === 0) {
      showToast({
        title: 'Bulk delete input missing',
        description: 'Image path list yoki category cleanup tanlang.',
        tone: 'error',
      })
      return
    }

    if (bulkDeleteForm.deleteAllInCategory && !bulkDeleteForm.category) {
      showToast({
        title: 'Category required',
        description: 'Delete all in category yoqilgan boвЂlsa category tanlang.',
        tone: 'error',
      })
      return
    }

    const approved = await confirm({
      title: 'Run bulk image cleanup?',
      description: bulkDeleteForm.deleteAllInCategory
        ? `Category: ${bulkDeleteForm.category}`
        : `${imagePaths.length} image path`,
      confirmLabel: 'Run cleanup',
      tone: 'danger',
    })

    if (!approved) {
      return
    }

    setIsBulkDeleteSubmitting(true)

    try {
      const response = await managementService.bulkDeleteImages({
        image_paths: imagePaths.length > 0 ? imagePaths : undefined,
        category: (bulkDeleteForm.category || undefined) as ManagementImageCategory | undefined,
        delete_all_in_category: bulkDeleteForm.deleteAllInCategory,
        only_unreferenced: bulkDeleteForm.onlyUnreferenced,
      })

      applyCleanupResult(response)
      await refreshImagesAfterCleanup()
      showToast({
        title: 'Bulk cleanup complete',
        description: response.message,
        tone: 'success',
      })
    } catch (error) {
      showToast({
        title: 'Bulk cleanup failed',
        description: getApiErrorMessage(error),
        tone: 'error',
      })
    } finally {
      setIsBulkDeleteSubmitting(false)
    }
  }
  */

  if (isInitialLoading) {
    return (
      <LoadingStateBlock
        eyebrow={lt('CEO / Management')}
        title={lt('Loading management modules')}
        description={lt('Fetching pages overview, statuses and roles.')}
      />
    )
  }

  if (!pagesQuery.data && !statusesQuery.data && !rolesQuery.data && (pagesQuery.isError || statusesQuery.isError || rolesQuery.isError)) {
    return (
      <ErrorStateBlock
        eyebrow={lt('CEO / Management')}
        title={lt('Management modules unavailable')}
        description={lt('Could not load the management dashboard.')}
        actionLabel={lt('Retry')}
        onAction={() => void refreshAll()}
      />
    )
  }

  return (
    <section className="space-y-6 page-enter">
      <PageHeader
        title={lt('Management API')}
        actions={(
          <>
            <Button variant="secondary" onClick={() => void refreshAll()}>
              {lt('Refresh')}
            </Button>
            {activeTab === 'pages' ? (
              <Button onClick={openCreatePageDialog}>{lt('Create page')}</Button>
            ) : null}
            {activeTab === 'statuses' ? (
              <Button onClick={openCreateStatusDialog}>{lt('Create status')}</Button>
            ) : null}
            {activeTab === 'roles' ? (
              <Button onClick={openCreateRoleDialog}>{lt('Create role')}</Button>
            ) : null}
          </>
        )}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          label="Available pages"
          value={pageItems.length}
          hint="Management pages endpoint orqali aniqlandi."
        />
        <SummaryCard
          label="Active statuses"
          value={statuses.filter((item) => item.is_active).length}
          hint="Inactive statuslar ham list ichida qoladi."
        />
        <SummaryCard
          label="Active roles"
          value={roles.filter((item) => item.is_active).length}
          hint="System rolelar backend tomonidan himoyalanishi mumkin."
        />
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {tabOptions.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'rounded-[20px] border px-4 py-4 text-left transition',
              activeTab === tab.key
                ? 'border-blue-500/25 bg-blue-600/10 text-white'
                : 'border-white/10 bg-white/[0.03] text-white/72 hover:border-white/16 hover:bg-white/[0.05]',
            )}
          >
            <p className="text-sm font-semibold">{lt(tab.label)}</p>
            <p className="mt-2 text-xs leading-5 text-(--muted)">{lt(tab.description)}</p>
          </button>
        ))}
      </div>

      {activeTab === 'pages' ? (
        <Card className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <SectionTitle
              title={lt('Pages Registry')}
              description={lt('Permission page catalog is managed from this table with create, edit, and delete actions.')}
            />
            <Badge variant="blue">{pageItems.length} {lt('pages')}</Badge>
          </div>

          <div className="mt-6">
            <DataTable
              caption={lt('Management pages')}
              rows={pageItems}
              getRowKey={(row) => String(row.id)}
              zebra
              columns={[
                {
                  key: 'page',
                  header: lt('Page'),
                  render: (row) => (
                    <div>
                      <p className="font-semibold text-white">{row.display_name}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.14em] text-(--muted)">{row.name}</p>
                    </div>
                  ),
                },
                {
                  key: 'route',
                  header: lt('Route'),
                  render: (row) => <span className="text-sm text-white/75">{row.route_path}</span>,
                },
                {
                  key: 'description',
                  header: lt('Description'),
                  render: (row) => <span className="text-sm text-white/75">{row.description || lt('No description')}</span>,
                },
                {
                  key: 'order',
                  header: lt('Order'),
                  align: 'right',
                  render: (row) => row.order,
                },
                {
                  key: 'flags',
                  header: lt('Flags'),
                  render: (row) => (
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={row.is_active ? 'success' : 'outline'}>
                        {row.is_active ? lt('Active') : lt('Inactive')}
                      </Badge>
                      <Badge variant={row.is_system ? 'warning' : 'secondary'}>
                        {row.is_system ? lt('System') : lt('Custom')}
                      </Badge>
                    </div>
                  ),
                },
                {
                  key: 'updated',
                  header: lt('Updated'),
                  render: (row) => formatShortDate(row.updated_at),
                },
                {
                  key: 'actions',
                  header: lt('Actions'),
                  render: (row) => (
                    <ActionsMenu
                      label={`${lt('Actions for')} ${row.display_name}`}
                      items={[
                        { label: lt('Edit'), onSelect: () => openEditPageDialog(row) },
                        { label: lt('Delete'), onSelect: () => void handleDeletePage(row), tone: 'danger' },
                      ]}
                    />
                  ),
                },
              ]}
            />
          </div>
        </Card>
      ) : null}

      {activeTab === 'statuses' ? (
        <Card className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <SectionTitle
              title={lt('Statuses')}
              description={lt('Dynamic CRM statuses are managed from this table with create, edit, and delete actions.')}
            />
            <Badge variant="success">{statuses.length} {lt('statuses')}</Badge>
          </div>

          <div className="mt-6">
            <DataTable
              caption={lt('Management statuses')}
              rows={statuses}
              getRowKey={(row) => String(row.id)}
              zebra
              columns={[
                {
                  key: 'status',
                  header: lt('Status'),
                  render: (row) => (
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: row.color }} />
                        <p className="font-semibold text-white">{row.display_name}</p>
                      </div>
                      <p className="mt-1 text-xs uppercase tracking-[0.14em] text-(--muted)">{row.name}</p>
                    </div>
                  ),
                },
                {
                  key: 'description',
                  header: lt('Description'),
                  render: (row) => (
                    <span className="text-sm text-white/75">{row.description || lt('No description')}</span>
                  ),
                },
                {
                  key: 'order',
                  header: lt('Order'),
                  align: 'right',
                  render: (row) => row.order,
                },
                {
                  key: 'flags',
                  header: lt('Flags'),
                  render: (row) => (
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={row.is_active ? 'success' : 'outline'}>
                        {row.is_active ? lt('Active') : lt('Inactive')}
                      </Badge>
                      <Badge variant={row.is_system ? 'warning' : 'secondary'}>
                        {row.is_system ? lt('System') : lt('Custom')}
                      </Badge>
                    </div>
                  ),
                },
                {
                  key: 'updated',
                  header: lt('Updated'),
                  render: (row) => formatShortDate(row.updated_at),
                },
                {
                  key: 'actions',
                  header: lt('Actions'),
                  render: (row) => (
                    <ActionsMenu
                      label={`${lt('Actions for')} ${row.display_name}`}
                      items={[
                        { label: lt('Edit'), onSelect: () => openEditStatusDialog(row) },
                        { label: lt('Delete'), onSelect: () => void handleDeleteStatus(row), tone: 'danger' },
                      ]}
                    />
                  ),
                },
              ]}
            />
          </div>
        </Card>
      ) : null}

      {activeTab === 'roles' ? (
        <Card className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <SectionTitle
              title={lt('Roles')}
              description={lt('User role management follows the same CRUD workflow as the statuses section.')}
            />
            <Badge variant="violet">{roles.length} {lt('roles')}</Badge>
          </div>

          <div className="mt-6">
            <DataTable
              caption={lt('Management roles')}
              rows={roles}
              getRowKey={(row) => String(row.id)}
              zebra
              columns={[
                {
                  key: 'role',
                  header: lt('Role'),
                  render: (row) => (
                    <div>
                      <p className="font-semibold text-white">{row.display_name}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.14em] text-(--muted)">{row.name}</p>
                    </div>
                  ),
                },
                {
                  key: 'description',
                  header: lt('Description'),
                  render: (row) => (
                    <span className="text-sm text-white/75">{row.description || lt('No description')}</span>
                  ),
                },
                {
                  key: 'flags',
                  header: lt('Flags'),
                  render: (row) => (
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={row.is_active ? 'success' : 'outline'}>
                        {row.is_active ? lt('Active') : lt('Inactive')}
                      </Badge>
                      <Badge variant={row.is_system ? 'warning' : 'secondary'}>
                        {row.is_system ? lt('System') : lt('Custom')}
                      </Badge>
                    </div>
                  ),
                },
                {
                  key: 'updated',
                  header: lt('Updated'),
                  render: (row) => formatShortDate(row.updated_at),
                },
                {
                  key: 'actions',
                  header: lt('Actions'),
                  render: (row) => (
                    <ActionsMenu
                      label={`${lt('Actions for')} ${row.display_name}`}
                      items={[
                        { label: lt('Edit'), onSelect: () => openEditRoleDialog(row) },
                        { label: lt('Delete'), onSelect: () => void handleDeleteRole(row), tone: 'danger' },
                      ]}
                    />
                  ),
                },
              ]}
            />
          </div>
        </Card>
      ) : null}

      {activeTab === 'images' ? (
        <Card className="p-6">
          <SectionTitle
            title="Images Cleanup"
            description="Image library, detail preview va selection-based cleanup shu section ichida ishlaydi."
          />

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Images loaded"
              value={imagesQuery.data?.total_count ?? imageItems.length}
              hint="Current category and reference filters bilan yuklangan rasmlar."
            />
            <SummaryCard
              label="Referenced"
              value={referencedImagesCount}
              hint="DB ichida kamida bitta reference bor."
            />
            <SummaryCard
              label="Unreferenced"
              value={unreferencedImagesCount}
              hint="DB da ishlatilmayotgan rasmlar."
            />
            <SummaryCard
              label="Selected"
              value={selectedImagePaths.length}
              hint="Bulk delete uchun tanlangan rasmlar."
            />
          </div>

            <div className="mt-5 rounded-[22px] border border-white/10 bg-white/[0.03] p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-white">{lt('Image library')}</p>
                  <p className="mt-1 text-xs text-(--muted)">
                    {lt('GET /management/images and GET /management/images/detail are connected here.')}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  onClick={() => void imagesQuery.refetch()}
                  disabled={imagesQuery.isLoading && !imagesQuery.data}
                >
                  {lt('Refresh images')}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setSelectedImagePaths([])}
                  disabled={selectedImagePaths.length === 0}
                >
                  {lt('Clear selection')}
                </Button>
                <Button
                  variant="danger"
                  onClick={() => void handleDeleteSelectedImages()}
                  disabled={selectedImagePaths.length === 0}
                  loading={isBulkDeleteSubmitting}
                >
                  {lt('Delete selected')}
                </Button>
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.85fr_0.85fr]">
              <div>
                <label className="mb-2 block text-sm font-semibold text-white">{lt('Search')}</label>
                <Input
                  value={imageSearch}
                  onChange={(event) => setImageSearch(event.target.value)}
                  placeholder={lt('Search by file name or path')}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-white">{lt('Category')}</label>
                <SelectField
                  value={imageCategoryFilter}
                  options={imageCategoryOptions.map((option) => ({ ...option, label: lt(option.label) }))}
                  onValueChange={(value) => setImageCategoryFilter(value)}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-white">{lt('Reference filter')}</label>
                <SelectField
                  value={imageReferenceFilter}
                  options={imageReferenceFilterOptions.map((option) => ({ ...option, label: lt(option.label) }))}
                  onValueChange={(value) => setImageReferenceFilter(value as ImageReferenceFilter)}
                />
              </div>
            </div>

            <div className="mt-5">
              {imagesQuery.isLoading && !imagesQuery.data ? (
                <LoadingStateBlock
                  eyebrow={lt('Management / Images')}
                  title={lt('Loading image library')}
                  description={lt('Fetching management image metadata and reference counts.')}
                />
              ) : imagesQuery.isError && !imagesQuery.data ? (
                <ErrorStateBlock
                  eyebrow={lt('Management / Images')}
                  title={lt('Image library unavailable')}
                  description={lt('Could not load management images.')}
                  actionLabel={lt('Retry')}
                  onAction={() => void imagesQuery.refetch()}
                />
              ) : (
                <DataTable
                  caption={lt('Management images')}
                  rows={filteredImages}
                  getRowKey={(row) => row.path}
                  pageSize={75}
                  zebra
                  emptyState={(
                    <div className="rounded-[18px] border border-dashed border-white/10 bg-black/10 px-4 py-5 text-sm text-(--muted)">
                      {lt('Image list is empty for the current filters.')}
                    </div>
                  )}
                  columns={[
                    {
                      key: 'select',
                      header: (
                        <input
                          type="checkbox"
                          checked={allFilteredImagesSelected}
                          onChange={(event) => toggleSelectAllFilteredImages(event.target.checked)}
                          aria-label={lt('Select all filtered images')}
                          className="h-4 w-4 rounded border border-white/15 bg-black/20 accent-blue-500"
                        />
                      ),
                      width: '52px',
                      align: 'center',
                      render: (row) => (
                        <input
                          type="checkbox"
                          checked={selectedImagePathSet.has(row.path)}
                          onChange={(event) => toggleImageSelection(row.path, event.target.checked)}
                          aria-label={`${lt('Select')} ${row.filename}`}
                          className="h-4 w-4 rounded border border-white/15 bg-black/20 accent-blue-500"
                        />
                      ),
                    },
                    {
                      key: 'image',
                      header: lt('Image'),
                      width: '360px',
                      render: (row) => (
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => openImageDetail(row)}
                            className="overflow-hidden rounded-[14px] border border-white/10 bg-black/10"
                          >
                            <img
                              src={resolveMediaUrl(row.file_url) ?? row.file_url}
                              alt={row.filename}
                              className="h-14 w-14 object-cover"
                            />
                          </button>
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => openImageDetail(row)}
                              className="truncate text-left text-sm font-semibold text-white hover:text-blue-300"
                            >
                              {row.filename}
                            </button>
                            <p className="mt-1 break-all text-xs text-white/45">{row.path}</p>
                          </div>
                        </div>
                      ),
                    },
                    {
                      key: 'category',
                      header: lt('Category'),
                      render: (row) => <Badge variant="secondary">{lt(getImageCategoryLabel(row.category))}</Badge>,
                    },
                    {
                      key: 'references',
                      header: lt('References'),
                      align: 'center',
                      render: (row) => (
                        <div className="flex flex-col items-center gap-1">
                          <Badge variant={row.is_referenced ? 'success' : 'outline'}>
                            {row.is_referenced ? lt('Referenced') : lt('Unused')}
                          </Badge>
                          <span className="text-xs text-white/55">{row.reference_count} {lt('refs')}</span>
                        </div>
                      ),
                    },
                    {
                      key: 'size',
                      header: lt('Size'),
                      align: 'right',
                      render: (row) => formatBytes(row.size_bytes),
                    },
                    {
                      key: 'updated',
                      header: lt('Updated'),
                      render: (row) => formatShortDate(row.updated_at),
                    },
                    {
                      key: 'actions',
                      header: lt('Actions'),
                      render: (row) => (
                        <ActionsMenu
                          label={`${lt('Actions for')} ${row.filename}`}
                          items={[
                            { label: lt('View detail'), onSelect: () => openImageDetail(row) },
                            {
                              label: selectedImagePathSet.has(row.path) ? lt('Unselect') : lt('Select'),
                              onSelect: () => toggleImageSelection(row.path),
                            },
                            {
                              label: lt('Delete'),
                              onSelect: () => void handleDeleteImageByPath(row.path),
                              tone: 'danger',
                            },
                          ]}
                        />
                      ),
                    },
                  ]}
                />
              )}
            </div>
          </div>

          {/* Legacy cleanup panel removed
          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">Single image delete</p>
                  <p className="mt-1 text-xs text-(--muted)">Masalan: `/images/project_images/file.png`</p>
                </div>
                <Badge variant="warning">DELETE</Badge>
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-white">Image path</label>
                  <Input
                    value={singleDeleteForm.imagePath}
                    onChange={(event) => setSingleDeleteForm({ imagePath: event.target.value })}
                    placeholder="/images/project_images/abc.png"
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    variant="danger"
                    onClick={() => void handleDeleteSingleImage()}
                    loading={isSingleDeleteSubmitting}
                  >
                    Delete image
                  </Button>
                </div>
              </div>
            </div>
            <div className="rounded-[22px] border border-amber-500/18 bg-amber-500/[0.08] p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">Bulk cleanup</p>
                  <p className="mt-1 text-xs text-(--muted)">Path list yoki category boвЂyicha tozalash.</p>
                </div>
                <Badge variant="blue">POST</Badge>
              </div>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-white">Image paths</label>
                  <Textarea
                    value={bulkDeleteForm.imagePathsText}
                    onChange={(event) => setBulkDeleteForm((current) => ({ ...current, imagePathsText: event.target.value }))}
                    placeholder={'/images/project_images/a.png\n/images/project_images/b.png'}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-white">Category</label>
                  <SelectField
                    value={bulkDeleteForm.category}
                    options={imageCategoryOptions}
                    onValueChange={(value) => setBulkDeleteForm((current) => ({ ...current, category: value }))}
                  />
                </div>

                <div>
                  <p className="mb-2 block text-sm font-semibold text-white">Delete scope</p>
                  <BooleanToggle
                    value={bulkDeleteForm.deleteAllInCategory}
                    onChange={(deleteAllInCategory) => setBulkDeleteForm((current) => ({ ...current, deleteAllInCategory }))}
                    trueLabel="Delete full category"
                    falseLabel="Delete listed paths"
                  />
                </div>

                <div>
                  <p className="mb-2 block text-sm font-semibold text-white">Reference filter</p>
                  <BooleanToggle
                    value={bulkDeleteForm.onlyUnreferenced}
                    onChange={(onlyUnreferenced) => setBulkDeleteForm((current) => ({ ...current, onlyUnreferenced }))}
                    trueLabel="Only unreferenced"
                    falseLabel="Delete all matched"
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    variant="danger"
                    onClick={() => void handleBulkDeleteImages()}
                    loading={isBulkDeleteSubmitting}
                  >
                    Run bulk cleanup
                  </Button>
                </div>
              </div>
            </div>

            <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-5 xl:col-span-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">Last cleanup result</p>
                  <p className="mt-1 text-xs text-(--muted)">Single va bulk delete response shu yerda ko‘rinadi.</p>
                </div>
                {imageCleanupResult ? <Badge variant="success">Updated</Badge> : <Badge variant="outline">No runs yet</Badge>}
              </div>

              {imageCleanupResult ? (
                <div className="mt-5 space-y-5">
                  <div className="grid gap-4 md:grid-cols-4">
                    <SummaryCard label="Requested" value={imageCleanupResult.requested_count} hint="Backend ko‘rib chiqqan itemlar" />
                    <SummaryCard label="Deleted" value={imageCleanupResult.deleted_count} hint="Muvaffaqiyatli o‘chirilganlar" />
                    <SummaryCard label="Missing" value={imageCleanupResult.missing_count} hint="Topilmagan pathlar" />
                    <SummaryCard label="Skipped" value={imageCleanupResult.skipped_count} hint="O‘tkazib yuborilganlar" />
                  </div>

                  <div className="grid gap-4 xl:grid-cols-3">
                    <div className="rounded-[18px] border border-white/10 bg-black/10 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300/75">Deleted paths</p>
                      <div className="mt-3 space-y-2 text-sm text-white/78">
                        {imageCleanupResult.deleted_paths.length > 0 ? imageCleanupResult.deleted_paths.map((path) => (
                          <p key={path} className="break-all">{path}</p>
                        )) : <p className="text-(--muted)">No deleted paths</p>}
                      </div>
                    </div>

                    <div className="rounded-[18px] border border-white/10 bg-black/10 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-300/75">Missing paths</p>
                      <div className="mt-3 space-y-2 text-sm text-white/78">
                        {imageCleanupResult.missing_paths.length > 0 ? imageCleanupResult.missing_paths.map((path) => (
                          <p key={path} className="break-all">{path}</p>
                        )) : <p className="text-(--muted)">No missing paths</p>}
                      </div>
                    </div>

                    <div className="rounded-[18px] border border-white/10 bg-black/10 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-300/75">Skipped items</p>
                      <div className="mt-3 space-y-2 text-sm text-white/78">
                        {imageCleanupResult.skipped_items.length > 0 ? imageCleanupResult.skipped_items.map((item) => (
                          <p key={item} className="break-all">{item}</p>
                        )) : <p className="text-(--muted)">No skipped items</p>}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[18px] border border-white/10 bg-black/10 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-300/75">Cleared references</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      {Object.entries(imageCleanupResult.cleared_references).length > 0 ? Object.entries(imageCleanupResult.cleared_references).map(([key, value]) => (
                        <div key={key} className="rounded-[14px] border border-white/10 bg-white/[0.02] px-3 py-3">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-(--muted)">{key}</p>
                          <p className="mt-2 text-lg font-semibold text-white">{value}</p>
                        </div>
                      )) : <p className="text-sm text-(--muted)">No cleared references reported.</p>}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-5 rounded-[18px] border border-dashed border-white/10 bg-black/10 px-4 py-5 text-sm text-(--muted)">
                  Cleanup hali ishga tushirilmagan.
                </div>
              )}
            </div>
          </div>
          */}
        </Card>
      ) : null}

      <Dialog
        open={Boolean(imageDetailPath)}
        onClose={() => setImageDetailPath(null)}
        title={activeImageDetail?.filename ?? lt('Image detail')}
        description={activeImageDetail?.path ?? lt('Management image metadata')}
        size="lg"
        footer={(
          <>
            {activeImageDetail ? (
              <Button
                variant="secondary"
                onClick={() => toggleImageSelection(activeImageDetail.path)}
              >
                {selectedImagePathSet.has(activeImageDetail.path) ? lt('Unselect') : lt('Select')}
              </Button>
            ) : null}
            {activeImageDetail ? (
              <Button
                variant="danger"
                onClick={() => void handleDeleteImageByPath(activeImageDetail.path)}
                loading={isSingleDeleteSubmitting}
              >
                {lt('Delete image')}
              </Button>
            ) : null}
            <Button variant="secondary" onClick={() => setImageDetailPath(null)}>
              {lt('Close')}
            </Button>
          </>
        )}
      >
        {activeImageDetail ? (
          <div className="space-y-5">
            <div className="overflow-hidden rounded-[22px] border border-white/10 bg-black/10">
              <img
                src={resolveMediaUrl(activeImageDetail.file_url) ?? activeImageDetail.file_url}
                alt={activeImageDetail.filename}
                className="max-h-[420px] w-full object-contain"
              />
            </div>

            {imageDetailQuery.isLoading && imageDetailQuery.data?.path !== imageDetailPath ? (
              <p className="text-sm text-(--muted)">{lt('Refreshing image detail...')}</p>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[18px] border border-white/10 bg-black/10 px-4 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-300/70">{lt('Category')}</p>
                <p className="mt-2 text-sm font-semibold text-white">{lt(getImageCategoryLabel(activeImageDetail.category))}</p>
              </div>
              <div className="rounded-[18px] border border-white/10 bg-black/10 px-4 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-300/70">{lt('Size')}</p>
                <p className="mt-2 text-sm font-semibold text-white">{formatBytes(activeImageDetail.size_bytes)}</p>
              </div>
              <div className="rounded-[18px] border border-white/10 bg-black/10 px-4 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-300/70">{lt('References')}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge variant={activeImageDetail.is_referenced ? 'success' : 'outline'}>
                    {activeImageDetail.is_referenced ? lt('Referenced') : lt('Unused')}
                  </Badge>
                  <span className="text-sm font-semibold text-white">{activeImageDetail.reference_count}</span>
                </div>
              </div>
              <div className="rounded-[18px] border border-white/10 bg-black/10 px-4 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-300/70">{lt('Updated')}</p>
                <p className="mt-2 text-sm font-semibold text-white">{formatShortDate(activeImageDetail.updated_at)}</p>
              </div>
            </div>

            <div className="rounded-[18px] border border-white/10 bg-black/10 px-4 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-300/70">{lt('Path')}</p>
              <p className="mt-2 break-all text-sm font-semibold text-white">{activeImageDetail.path}</p>
              <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-300/70">{lt('File URL')}</p>
              <p className="mt-2 break-all text-sm text-white/72">{activeImageDetail.file_url}</p>
            </div>
          </div>
        ) : (
          <div className="rounded-[18px] border border-dashed border-white/10 bg-black/10 px-4 py-5 text-sm text-(--muted)">
            {lt('Image detail not found.')}
          </div>
        )}
      </Dialog>

      <Dialog
        open={pageDialogOpen}
        onClose={closePageDialog}
        title={pageDialogMode === 'create' ? lt('Create page') : lt('Edit page')}
        description={lt('Management page CRUD form')}
        size="xl"
        footer={(
          <>
            <Button variant="secondary" onClick={closePageDialog} disabled={isPageSubmitting}>
              {lt('Cancel')}
            </Button>
            <Button onClick={() => void handleSubmitPage()} loading={isPageSubmitting}>
              {pageDialogMode === 'create' ? lt('Create page') : lt('Save changes')}
            </Button>
          </>
        )}
      >
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-white">{lt('Name')}</label>
              <Input
                value={pageForm.name}
                onChange={(event) => setPageForm((current) => ({ ...current, name: event.target.value }))}
                disabled={pageDialogMode === 'edit'}
                placeholder="team_updates"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-white">{lt('Display name')}</label>
              <Input
                value={pageForm.displayName}
                onChange={(event) => setPageForm((current) => ({ ...current, displayName: event.target.value }))}
                placeholder={lt('Team Updates')}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-white">{lt('Description')}</label>
              <Textarea
                value={pageForm.description}
                onChange={(event) => setPageForm((current) => ({ ...current, description: event.target.value }))}
                placeholder={lt('Page usage description')}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-white">{lt('Route path')}</label>
              <Input
                value={pageForm.routePath}
                onChange={(event) => setPageForm((current) => ({ ...current, routePath: event.target.value }))}
                placeholder="/ceo/team-updates"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-white">{lt('Order')}</label>
              <Input
                type="number"
                value={pageForm.order}
                onChange={(event) => setPageForm((current) => ({ ...current, order: event.target.value }))}
              />
            </div>

            <div>
              <p className="mb-2 block text-sm font-semibold text-white">{lt('Active state')}</p>
              <BooleanToggle
                value={pageForm.isActive}
                onChange={(isActive) => setPageForm((current) => ({ ...current, isActive }))}
                trueLabel={lt('Active')}
                falseLabel={lt('Inactive')}
              />
            </div>

            {pageDialogMode === 'create' ? (
              <div>
                <p className="mb-2 block text-sm font-semibold text-white">{lt('System page')}</p>
                <BooleanToggle
                  value={pageForm.isSystem}
                  onChange={(isSystem) => setPageForm((current) => ({ ...current, isSystem }))}
                  trueLabel={lt('System')}
                  falseLabel={lt('Custom')}
                />
              </div>
            ) : null}
          </div>
        </div>
      </Dialog>

      <Dialog
        open={statusDialogOpen}
        onClose={closeStatusDialog}
        title={statusDialogMode === 'create' ? lt('Create status') : lt('Edit status')}
        description={lt('Status CRUD form')}
        size="xl"
        footer={(
          <>
            <Button variant="secondary" onClick={closeStatusDialog} disabled={isStatusSubmitting}>
              {lt('Cancel')}
            </Button>
            <Button onClick={() => void handleSubmitStatus()} loading={isStatusSubmitting}>
              {statusDialogMode === 'create' ? lt('Create status') : lt('Save changes')}
            </Button>
          </>
        )}
      >
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-white">{lt('Name')}</label>
              <Input
                value={statusForm.name}
                onChange={(event) => setStatusForm((current) => ({ ...current, name: event.target.value }))}
                disabled={statusDialogMode === 'edit'}
                placeholder="contacted"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-white">{lt('Display name')}</label>
              <Input
                value={statusForm.displayName}
                onChange={(event) => setStatusForm((current) => ({ ...current, displayName: event.target.value }))}
                placeholder={lt('Contacted')}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-white">{lt('Description')}</label>
              <Textarea
                value={statusForm.description}
                onChange={(event) => setStatusForm((current) => ({ ...current, description: event.target.value }))}
                placeholder={lt('Status usage description')}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-white">{lt('Color')}</label>
              <div className="flex flex-wrap items-center gap-3">
                <Input
                  type="color"
                  value={statusForm.color}
                  onChange={(event) => setStatusForm((current) => ({ ...current, color: event.target.value }))}
                  className="h-12 w-18 rounded-xl border-white/10 bg-white/[0.03] p-2"
                />
                <div className="flex flex-wrap gap-2">
                  {statusColorPresets.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setStatusForm((current) => ({ ...current, color }))}
                      className={cn(
                        'h-8 w-8 rounded-full border-2 transition',
                        statusForm.color === color ? 'border-white' : 'border-transparent',
                      )}
                      style={{ backgroundColor: color }}
                      aria-label={`Select ${color}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-white">{lt('Order')}</label>
              <Input
                type="number"
                value={statusForm.order}
                onChange={(event) => setStatusForm((current) => ({ ...current, order: event.target.value }))}
              />
            </div>

            <div>
              <p className="mb-2 block text-sm font-semibold text-white">{lt('Active state')}</p>
              <BooleanToggle
                value={statusForm.isActive}
                onChange={(isActive) => setStatusForm((current) => ({ ...current, isActive }))}
                trueLabel={lt('Active')}
                falseLabel={lt('Inactive')}
              />
            </div>

            {statusDialogMode === 'create' ? (
              <div>
                <p className="mb-2 block text-sm font-semibold text-white">{lt('System status')}</p>
                <BooleanToggle
                  value={statusForm.isSystem}
                  onChange={(isSystem) => setStatusForm((current) => ({ ...current, isSystem }))}
                  trueLabel={lt('System')}
                  falseLabel={lt('Custom')}
                />
              </div>
            ) : null}
          </div>
        </div>
      </Dialog>

      <Dialog
        open={roleDialogOpen}
        onClose={closeRoleDialog}
        title={roleDialogMode === 'create' ? lt('Create role') : lt('Edit role')}
        description={lt('Role CRUD form')}
        size="lg"
        footer={(
          <>
            <Button variant="secondary" onClick={closeRoleDialog} disabled={isRoleSubmitting}>
              {lt('Cancel')}
            </Button>
            <Button onClick={() => void handleSubmitRole()} loading={isRoleSubmitting}>
              {roleDialogMode === 'create' ? lt('Create role') : lt('Save changes')}
            </Button>
          </>
        )}
      >
        <div className="grid gap-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-white">{lt('Name')}</label>
            <Input
              value={roleForm.name}
              onChange={(event) => setRoleForm((current) => ({ ...current, name: event.target.value }))}
              disabled={roleDialogMode === 'edit'}
              placeholder="SalesManager"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-white">{lt('Display name')}</label>
            <Input
              value={roleForm.displayName}
              onChange={(event) => setRoleForm((current) => ({ ...current, displayName: event.target.value }))}
                placeholder={lt('Sales Manager')}
              />
            </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-white">{lt('Description')}</label>
            <Textarea
              value={roleForm.description}
              onChange={(event) => setRoleForm((current) => ({ ...current, description: event.target.value }))}
              placeholder={lt('Role usage description')}
            />
          </div>

          <div>
            <p className="mb-2 block text-sm font-semibold text-white">{lt('Active state')}</p>
            <BooleanToggle
              value={roleForm.isActive}
              onChange={(isActive) => setRoleForm((current) => ({ ...current, isActive }))}
              trueLabel={lt('Active')}
              falseLabel={lt('Inactive')}
            />
          </div>

          {roleDialogMode === 'create' ? (
            <div>
              <p className="mb-2 block text-sm font-semibold text-white">{lt('System role')}</p>
              <BooleanToggle
                value={roleForm.isSystem}
                onChange={(isSystem) => setRoleForm((current) => ({ ...current, isSystem }))}
                trueLabel={lt('System')}
                falseLabel={lt('Custom')}
              />
            </div>
          ) : null}
        </div>
      </Dialog>
    </section>
  )
}

