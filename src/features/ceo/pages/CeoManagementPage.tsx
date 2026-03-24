import { useMemo, useState } from 'react'
import { managementService } from '../../../shared/api/services/management.service'
import type {
  ManagementImageCleanupResponse,
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

type ManagementTab = 'pages' | 'statuses' | 'roles' | 'images'

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

type ImageSingleDeleteFormState = {
  imagePath: string
}

type ImageBulkDeleteFormState = {
  imagePathsText: string
  category: string
  deleteAllInCategory: boolean
  onlyUnreferenced: boolean
}

const tabOptions: Array<{ key: ManagementTab; label: string; description: string }> = [
  { key: 'pages', label: 'Pages', description: 'Permission pages with live CRUD.' },
  { key: 'statuses', label: 'Statuses', description: 'Dynamic CRM statuses with live CRUD.' },
  { key: 'roles', label: 'Roles', description: 'User roles with live CRUD.' },
  { key: 'images', label: 'Images Cleanup', description: 'Single image delete and bulk cleanup tools.' },
]

const imageCategoryOptions: SelectFieldOption[] = [
  { value: '', label: 'Select category' },
  { value: 'project_images', label: 'Project images' },
  { value: 'card_images', label: 'Card images' },
  { value: 'profile_images', label: 'Profile images' },
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

const initialSingleDeleteForm: ImageSingleDeleteFormState = {
  imagePath: '',
}

const initialBulkDeleteForm: ImageBulkDeleteFormState = {
  imagePathsText: '',
  category: '',
  deleteAllInCategory: false,
  onlyUnreferenced: false,
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
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/[0.03] px-5 py-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-blue-300/75">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-white">{value}</p>
      <p className="mt-2 text-xs text-(--muted)">{hint}</p>
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
        {trueLabel}
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
        {falseLabel}
      </button>
    </div>
  )
}

export function CeoManagementPage() {
  const { showToast } = useToast()
  const { confirm } = useConfirm()
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

  const [singleDeleteForm, setSingleDeleteForm] = useState<ImageSingleDeleteFormState>(initialSingleDeleteForm)
  const [bulkDeleteForm, setBulkDeleteForm] = useState<ImageBulkDeleteFormState>(initialBulkDeleteForm)
  const [isSingleDeleteSubmitting, setIsSingleDeleteSubmitting] = useState(false)
  const [isBulkDeleteSubmitting, setIsBulkDeleteSubmitting] = useState(false)
  const [imageCleanupResult, setImageCleanupResult] = useState<ManagementImageCleanupResponse | null>(null)

  const pagesQuery = useAsyncData(() => managementService.listPages(), [])
  const statusesQuery = useAsyncData(() => managementService.listStatuses(), [])
  const rolesQuery = useAsyncData(() => managementService.listRoles(), [])

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

  const isInitialLoading =
    !pagesQuery.data &&
    !statusesQuery.data &&
    !rolesQuery.data &&
    (pagesQuery.isLoading || statusesQuery.isLoading || rolesQuery.isLoading)

  async function refreshAll() {
    const results = await Promise.allSettled([
      pagesQuery.refetch(),
      statusesQuery.refetch(),
      rolesQuery.refetch(),
    ])

    const failed = results.find((result) => result.status === 'rejected')

    if (failed && failed.status === 'rejected') {
      showToast({
        title: 'Management refresh failed',
        description: getApiErrorMessage(failed.reason),
        tone: 'error',
      })
      return
    }

    showToast({
      title: 'Management refreshed',
      description: 'Pages, statuses and roles reloaded.',
      tone: 'success',
    })
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
        title: 'Page form incomplete',
        description: 'Name, display name va route path majburiy.',
        tone: 'error',
      })
      return
    }

    setIsPageSubmitting(true)

    try {
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
      setPageDialogOpen(false)
      showToast({
        title: pageDialogMode === 'create' ? 'Page created' : 'Page updated',
        description: 'Management pages list refreshed.',
        tone: 'success',
      })
    } catch (error) {
      showToast({
        title: 'Page save failed',
        description: getApiErrorMessage(error),
        tone: 'error',
      })
    } finally {
      setIsPageSubmitting(false)
    }
  }

  async function handleDeletePage(item: ManagementPageRecord) {
    const approved = await confirm({
      title: `Delete page ${item.display_name}?`,
      description: item.is_system
        ? 'Backend system page ni oвЂchirishga ruxsat bermasligi mumkin.'
        : 'Permission page butunlay oвЂchiriladi.',
      confirmLabel: 'Delete page',
      tone: 'danger',
    })

    if (!approved) {
      return
    }

    try {
      await managementService.deletePage(item.id)
      await pagesQuery.refetch()
      showToast({
        title: 'Page deleted',
        description: `${item.display_name} removed.`,
        tone: 'success',
      })
    } catch (error) {
      showToast({
        title: 'Delete failed',
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
        title: 'Status form incomplete',
        description: 'Name va display name majburiy.',
        tone: 'error',
      })
      return
    }

    setIsStatusSubmitting(true)

    try {
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
      setStatusDialogOpen(false)
      showToast({
        title: statusDialogMode === 'create' ? 'Status created' : 'Status updated',
        description: 'Management statuses list refreshed.',
        tone: 'success',
      })
    } catch (error) {
      showToast({
        title: 'Status save failed',
        description: getApiErrorMessage(error),
        tone: 'error',
      })
    } finally {
      setIsStatusSubmitting(false)
    }
  }

  async function handleDeleteStatus(item: ManagementStatusRecord) {
    const approved = await confirm({
      title: `Delete status ${item.display_name}?`,
      description: item.is_system
        ? 'Backend system statusni oвЂchirishga ruxsat bermasligi mumkin.'
        : 'Status butunlay oвЂchiriladi.',
      confirmLabel: 'Delete status',
      tone: 'danger',
    })

    if (!approved) {
      return
    }

    try {
      await managementService.deleteStatus(item.id)
      await statusesQuery.refetch()
      showToast({
        title: 'Status deleted',
        description: `${item.display_name} removed.`,
        tone: 'success',
      })
    } catch (error) {
      showToast({
        title: 'Delete failed',
        description: getApiErrorMessage(error),
        tone: 'error',
      })
    }
  }

  async function handleSubmitRole() {
    if (!roleForm.name.trim() || !roleForm.displayName.trim()) {
      showToast({
        title: 'Role form incomplete',
        description: 'Name va display name majburiy.',
        tone: 'error',
      })
      return
    }

    setIsRoleSubmitting(true)

    try {
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
      setRoleDialogOpen(false)
      showToast({
        title: roleDialogMode === 'create' ? 'Role created' : 'Role updated',
        description: 'Management roles list refreshed.',
        tone: 'success',
      })
    } catch (error) {
      showToast({
        title: 'Role save failed',
        description: getApiErrorMessage(error),
        tone: 'error',
      })
    } finally {
      setIsRoleSubmitting(false)
    }
  }

  async function handleDeleteRole(item: ManagementRoleRecord) {
    const approved = await confirm({
      title: `Delete role ${item.display_name}?`,
      description: item.is_system
        ? 'Backend system rolni oвЂchirishga ruxsat bermasligi mumkin.'
        : 'Role butunlay oвЂchiriladi.',
      confirmLabel: 'Delete role',
      tone: 'danger',
    })

    if (!approved) {
      return
    }

    try {
      await managementService.deleteRole(item.id)
      await rolesQuery.refetch()
      showToast({
        title: 'Role deleted',
        description: `${item.display_name} removed.`,
        tone: 'success',
      })
    } catch (error) {
      showToast({
        title: 'Delete failed',
        description: getApiErrorMessage(error),
        tone: 'error',
      })
    }
  }

  async function handleDeleteSingleImage() {
    const imagePath = singleDeleteForm.imagePath.trim()

    if (!imagePath) {
      showToast({
        title: 'Image path missing',
        description: 'Delete qilish uchun image path kiriting.',
        tone: 'error',
      })
      return
    }

    const approved = await confirm({
      title: 'Delete this image?',
      description: imagePath,
      confirmLabel: 'Delete image',
      tone: 'danger',
    })

    if (!approved) {
      return
    }

    setIsSingleDeleteSubmitting(true)

    try {
      const response = await managementService.deleteImage(imagePath)
      setImageCleanupResult(response)
      showToast({
        title: 'Image cleanup complete',
        description: response.message,
        tone: 'success',
      })
    } catch (error) {
      showToast({
        title: 'Image delete failed',
        description: getApiErrorMessage(error),
        tone: 'error',
      })
    } finally {
      setIsSingleDeleteSubmitting(false)
    }
  }

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
        category: bulkDeleteForm.category || undefined,
        delete_all_in_category: bulkDeleteForm.deleteAllInCategory,
        only_unreferenced: bulkDeleteForm.onlyUnreferenced,
      })

      setImageCleanupResult(response)
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

  if (isInitialLoading) {
    return (
      <LoadingStateBlock
        eyebrow="CEO / Management"
        title="Loading management modules"
        description="Fetching pages overview, statuses and roles."
      />
    )
  }

  if (!pagesQuery.data && !statusesQuery.data && !rolesQuery.data && (pagesQuery.isError || statusesQuery.isError || rolesQuery.isError)) {
    return (
      <ErrorStateBlock
        eyebrow="CEO / Management"
        title="Management modules unavailable"
        description="Could not load the management dashboard."
        actionLabel="Retry"
        onAction={() => void refreshAll()}
      />
    )
  }

  return (
    <section className="space-y-6 page-enter">
      <PageHeader
        title="Management API"
        meta={[
          { label: 'Pages', value: String(pageItems.length), tone: 'blue' },
          { label: 'Statuses', value: String(statuses.length), tone: 'success' },
          { label: 'Roles', value: String(roles.length), tone: 'violet' },
        ]}
        actions={(
          <>
            <Button variant="secondary" onClick={() => void refreshAll()}>
              Refresh
            </Button>
            {activeTab === 'pages' ? (
              <Button onClick={openCreatePageDialog}>Create page</Button>
            ) : null}
            {activeTab === 'statuses' ? (
              <Button onClick={openCreateStatusDialog}>Create status</Button>
            ) : null}
            {activeTab === 'roles' ? (
              <Button onClick={openCreateRoleDialog}>Create role</Button>
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
            <p className="text-sm font-semibold">{tab.label}</p>
            <p className="mt-2 text-xs leading-5 text-(--muted)">{tab.description}</p>
          </button>
        ))}
      </div>

      {activeTab === 'pages' ? (
        <Card className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <SectionTitle
              title="Pages Registry"
              description="Permission page catalog create, edit va delete oqimi bilan shu table ichida boshqariladi."
            />
            <Badge variant="blue">{pageItems.length} pages</Badge>
          </div>

          <div className="mt-6">
            <DataTable
              caption="Management pages"
              rows={pageItems}
              getRowKey={(row) => String(row.id)}
              zebra
              columns={[
                {
                  key: 'page',
                  header: 'Page',
                  render: (row) => (
                    <div>
                      <p className="font-semibold text-white">{row.display_name}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.14em] text-(--muted)">{row.name}</p>
                    </div>
                  ),
                },
                {
                  key: 'route',
                  header: 'Route',
                  render: (row) => <span className="text-sm text-white/75">{row.route_path}</span>,
                },
                {
                  key: 'description',
                  header: 'Description',
                  render: (row) => <span className="text-sm text-white/75">{row.description || 'No description'}</span>,
                },
                {
                  key: 'order',
                  header: 'Order',
                  align: 'right',
                  render: (row) => row.order,
                },
                {
                  key: 'flags',
                  header: 'Flags',
                  render: (row) => (
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={row.is_active ? 'success' : 'outline'}>
                        {row.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <Badge variant={row.is_system ? 'warning' : 'secondary'}>
                        {row.is_system ? 'System' : 'Custom'}
                      </Badge>
                    </div>
                  ),
                },
                {
                  key: 'updated',
                  header: 'Updated',
                  render: (row) => formatShortDate(row.updated_at),
                },
                {
                  key: 'actions',
                  header: 'Actions',
                  render: (row) => (
                    <ActionsMenu
                      label={`Actions for ${row.display_name}`}
                      items={[
                        { label: 'Edit', onSelect: () => openEditPageDialog(row) },
                        { label: 'Delete', onSelect: () => void handleDeletePage(row), tone: 'danger' },
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
              title="Statuses"
              description="CRM dynamic statuslar uchun create, edit va delete shu table ichida."
            />
            <Badge variant="success">{statuses.length} statuses</Badge>
          </div>

          <div className="mt-6">
            <DataTable
              caption="Management statuses"
              rows={statuses}
              getRowKey={(row) => String(row.id)}
              zebra
              columns={[
                {
                  key: 'status',
                  header: 'Status',
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
                  header: 'Description',
                  render: (row) => (
                    <span className="text-sm text-white/75">{row.description || 'No description'}</span>
                  ),
                },
                {
                  key: 'order',
                  header: 'Order',
                  align: 'right',
                  render: (row) => row.order,
                },
                {
                  key: 'flags',
                  header: 'Flags',
                  render: (row) => (
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={row.is_active ? 'success' : 'outline'}>
                        {row.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <Badge variant={row.is_system ? 'warning' : 'secondary'}>
                        {row.is_system ? 'System' : 'Custom'}
                      </Badge>
                    </div>
                  ),
                },
                {
                  key: 'updated',
                  header: 'Updated',
                  render: (row) => formatShortDate(row.updated_at),
                },
                {
                  key: 'actions',
                  header: 'Actions',
                  render: (row) => (
                    <ActionsMenu
                      label={`Actions for ${row.display_name}`}
                      items={[
                        { label: 'Edit', onSelect: () => openEditStatusDialog(row) },
                        { label: 'Delete', onSelect: () => void handleDeleteStatus(row), tone: 'danger' },
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
              title="Roles"
              description="User role management `statuses` section bilan bir xil oqimda ishlaydi."
            />
            <Badge variant="violet">{roles.length} roles</Badge>
          </div>

          <div className="mt-6">
            <DataTable
              caption="Management roles"
              rows={roles}
              getRowKey={(row) => String(row.id)}
              zebra
              columns={[
                {
                  key: 'role',
                  header: 'Role',
                  render: (row) => (
                    <div>
                      <p className="font-semibold text-white">{row.display_name}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.14em] text-(--muted)">{row.name}</p>
                    </div>
                  ),
                },
                {
                  key: 'description',
                  header: 'Description',
                  render: (row) => (
                    <span className="text-sm text-white/75">{row.description || 'No description'}</span>
                  ),
                },
                {
                  key: 'flags',
                  header: 'Flags',
                  render: (row) => (
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={row.is_active ? 'success' : 'outline'}>
                        {row.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <Badge variant={row.is_system ? 'warning' : 'secondary'}>
                        {row.is_system ? 'System' : 'Custom'}
                      </Badge>
                    </div>
                  ),
                },
                {
                  key: 'updated',
                  header: 'Updated',
                  render: (row) => formatShortDate(row.updated_at),
                },
                {
                  key: 'actions',
                  header: 'Actions',
                  render: (row) => (
                    <ActionsMenu
                      label={`Actions for ${row.display_name}`}
                      items={[
                        { label: 'Edit', onSelect: () => openEditRoleDialog(row) },
                        { label: 'Delete', onSelect: () => void handleDeleteRole(row), tone: 'danger' },
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
            description="Single image delete va bulk cleanup actionlar shu section ichida ishlaydi."
          />

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
        </Card>
      ) : null}

      <Dialog
        open={pageDialogOpen}
        onClose={() => setPageDialogOpen(false)}
        title={pageDialogMode === 'create' ? 'Create page' : 'Edit page'}
        description="Management page CRUD form"
        size="xl"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setPageDialogOpen(false)} disabled={isPageSubmitting}>
              Cancel
            </Button>
            <Button onClick={() => void handleSubmitPage()} loading={isPageSubmitting}>
              {pageDialogMode === 'create' ? 'Create page' : 'Save changes'}
            </Button>
          </>
        )}
      >
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-white">Name</label>
              <Input
                value={pageForm.name}
                onChange={(event) => setPageForm((current) => ({ ...current, name: event.target.value }))}
                disabled={pageDialogMode === 'edit'}
                placeholder="team_updates"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-white">Display name</label>
              <Input
                value={pageForm.displayName}
                onChange={(event) => setPageForm((current) => ({ ...current, displayName: event.target.value }))}
                placeholder="Team Updates"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-white">Description</label>
              <Textarea
                value={pageForm.description}
                onChange={(event) => setPageForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Page usage description"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-white">Route path</label>
              <Input
                value={pageForm.routePath}
                onChange={(event) => setPageForm((current) => ({ ...current, routePath: event.target.value }))}
                placeholder="/ceo/team-updates"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-white">Order</label>
              <Input
                type="number"
                value={pageForm.order}
                onChange={(event) => setPageForm((current) => ({ ...current, order: event.target.value }))}
              />
            </div>

            <div>
              <p className="mb-2 block text-sm font-semibold text-white">Active state</p>
              <BooleanToggle
                value={pageForm.isActive}
                onChange={(isActive) => setPageForm((current) => ({ ...current, isActive }))}
                trueLabel="Active"
                falseLabel="Inactive"
              />
            </div>

            {pageDialogMode === 'create' ? (
              <div>
                <p className="mb-2 block text-sm font-semibold text-white">System page</p>
                <BooleanToggle
                  value={pageForm.isSystem}
                  onChange={(isSystem) => setPageForm((current) => ({ ...current, isSystem }))}
                  trueLabel="System"
                  falseLabel="Custom"
                />
              </div>
            ) : null}
          </div>
        </div>
      </Dialog>

      <Dialog
        open={statusDialogOpen}
        onClose={() => setStatusDialogOpen(false)}
        title={statusDialogMode === 'create' ? 'Create status' : 'Edit status'}
        description="Status CRUD form"
        size="xl"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setStatusDialogOpen(false)} disabled={isStatusSubmitting}>
              Cancel
            </Button>
            <Button onClick={() => void handleSubmitStatus()} loading={isStatusSubmitting}>
              {statusDialogMode === 'create' ? 'Create status' : 'Save changes'}
            </Button>
          </>
        )}
      >
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-white">Name</label>
              <Input
                value={statusForm.name}
                onChange={(event) => setStatusForm((current) => ({ ...current, name: event.target.value }))}
                disabled={statusDialogMode === 'edit'}
                placeholder="contacted"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-white">Display name</label>
              <Input
                value={statusForm.displayName}
                onChange={(event) => setStatusForm((current) => ({ ...current, displayName: event.target.value }))}
                placeholder="Contacted"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-white">Description</label>
              <Textarea
                value={statusForm.description}
                onChange={(event) => setStatusForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Status usage description"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-white">Color</label>
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
              <label className="mb-2 block text-sm font-semibold text-white">Order</label>
              <Input
                type="number"
                value={statusForm.order}
                onChange={(event) => setStatusForm((current) => ({ ...current, order: event.target.value }))}
              />
            </div>

            <div>
              <p className="mb-2 block text-sm font-semibold text-white">Active state</p>
              <BooleanToggle
                value={statusForm.isActive}
                onChange={(isActive) => setStatusForm((current) => ({ ...current, isActive }))}
                trueLabel="Active"
                falseLabel="Inactive"
              />
            </div>

            {statusDialogMode === 'create' ? (
              <div>
                <p className="mb-2 block text-sm font-semibold text-white">System status</p>
                <BooleanToggle
                  value={statusForm.isSystem}
                  onChange={(isSystem) => setStatusForm((current) => ({ ...current, isSystem }))}
                  trueLabel="System"
                  falseLabel="Custom"
                />
              </div>
            ) : null}
          </div>
        </div>
      </Dialog>

      <Dialog
        open={roleDialogOpen}
        onClose={() => setRoleDialogOpen(false)}
        title={roleDialogMode === 'create' ? 'Create role' : 'Edit role'}
        description="Role CRUD form"
        size="lg"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setRoleDialogOpen(false)} disabled={isRoleSubmitting}>
              Cancel
            </Button>
            <Button onClick={() => void handleSubmitRole()} loading={isRoleSubmitting}>
              {roleDialogMode === 'create' ? 'Create role' : 'Save changes'}
            </Button>
          </>
        )}
      >
        <div className="grid gap-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-white">Name</label>
            <Input
              value={roleForm.name}
              onChange={(event) => setRoleForm((current) => ({ ...current, name: event.target.value }))}
              disabled={roleDialogMode === 'edit'}
              placeholder="SalesManager"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-white">Display name</label>
            <Input
              value={roleForm.displayName}
              onChange={(event) => setRoleForm((current) => ({ ...current, displayName: event.target.value }))}
              placeholder="Sales Manager"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-white">Description</label>
            <Textarea
              value={roleForm.description}
              onChange={(event) => setRoleForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="Role usage description"
            />
          </div>

          <div>
            <p className="mb-2 block text-sm font-semibold text-white">Active state</p>
            <BooleanToggle
              value={roleForm.isActive}
              onChange={(isActive) => setRoleForm((current) => ({ ...current, isActive }))}
              trueLabel="Active"
              falseLabel="Inactive"
            />
          </div>

          {roleDialogMode === 'create' ? (
            <div>
              <p className="mb-2 block text-sm font-semibold text-white">System role</p>
              <BooleanToggle
                value={roleForm.isSystem}
                onChange={(isSystem) => setRoleForm((current) => ({ ...current, isSystem }))}
                trueLabel="System"
                falseLabel="Custom"
              />
            </div>
          ) : null}
        </div>
      </Dialog>
    </section>
  )
}

