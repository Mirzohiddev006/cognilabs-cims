import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { cn } from '../../../shared/lib/cn'
import {
  ceoService,
  type CeoUserRecord,
  type UserPayload,
} from '../../../shared/api/services/ceo.service'
import type { PermissionMap } from '../../../shared/api/types'
import { useAsyncData } from '../../../shared/hooks/useAsyncData'
import { formatCompactNumber } from '../../../shared/lib/format'
import { useConfirm } from '../../../shared/confirm/useConfirm'
import { useToast } from '../../../shared/toast/useToast'
import { Badge } from '../../../shared/ui/badge'
import { Button } from '../../../shared/ui/button'
import { Card } from '../../../shared/ui/card'
import { ActionsMenu } from '../../../shared/ui/actions-menu'
import { DataTable } from '../../../shared/ui/data-table'
import { Input } from '../../../shared/ui/input'
import { SectionTitle } from '../../../shared/ui/section-title'
import { EmptyStateBlock, ErrorStateBlock, LoadingStateBlock } from '../../../shared/ui/state-block'
import { PermissionEditorModal } from '../components/PermissionEditorModal'
import {
  MessageComposerModal,
  type MessageComposerValues,
} from '../components/MessageComposerModal'
import { MetricCard } from '../components/MetricCard'
import { UserFormModal, type UserFormValues } from '../components/UserFormModal'
import { permissionCatalog } from '../lib/permissionCatalog'

const initialUserForm: UserFormValues = {
  email: '',
  name: '',
  surname: '',
  password: '',
  company_code: 'oddiy',
  telegram_id: '',
  default_salary: 0,
  role: 'Customer',
  is_active: true,
}

const initialMessageForm: MessageComposerValues = {
  receiver_id: undefined,
  receiver_label: '',
  subject: '',
  body: '',
}

const emptyUsers: CeoUserRecord[] = []

function toUserFormValues(user?: CeoUserRecord | null): UserFormValues {
  if (!user) {
    return initialUserForm
  }

  return {
    email: user.email ?? '',
    name: user.name ?? '',
    surname: user.surname ?? '',
    password: '',
    company_code: user.company_code ?? 'oddiy',
    telegram_id: user.telegram_id ?? '',
    default_salary: typeof user.default_salary === 'number' ? user.default_salary : 0,
    role: user.role ?? 'Customer',
    is_active: Boolean(user.is_active),
  }
}

function toUserPayload(values: UserFormValues, mode: 'create' | 'edit'): UserPayload {
  const payload: UserPayload = {
    email: values.email.trim(),
    name: values.name.trim(),
    surname: values.surname.trim(),
    company_code: values.company_code.trim(),
    telegram_id: values.telegram_id?.trim() || undefined,
    default_salary: Number(values.default_salary ?? 0),
    role: values.role,
    is_active: values.is_active,
  }

  if (mode === 'create' || values.password.trim()) {
    payload.password = values.password
  }

  return payload
}

export function CeoUsersPage() {
  const { showToast } = useToast()
  const { confirm } = useConfirm()

  const dashboardQuery = useAsyncData(() => ceoService.getDashboard(), [])
  const permissionsOverviewQuery = useAsyncData(() => ceoService.permissionsOverview(), [])

  const [userModalMode, setUserModalMode] = useState<'create' | 'edit'>('create')
  const [selectedUser, setSelectedUser] = useState<CeoUserRecord | null>(null)
  const [userFormValues, setUserFormValues] = useState<UserFormValues>(initialUserForm)
  const [isUserModalOpen, setIsUserModalOpen] = useState(false)
  const [isUserSubmitting, setIsUserSubmitting] = useState(false)

  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)

  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false)
  const [permissionTargetUser, setPermissionTargetUser] = useState<CeoUserRecord | null>(null)
  const [permissionState, setPermissionState] = useState<PermissionMap>({})
  const [activePermissionsCount, setActivePermissionsCount] = useState(0)
  const [totalAvailablePages, setTotalAvailablePages] = useState<number>(permissionCatalog.length)
  const [availablePermissions, setAvailablePermissions] = useState<string[]>(permissionCatalog.map((item) => item.key))
  const [isPermissionLoading, setIsPermissionLoading] = useState(false)
  const [isPermissionSubmitting, setIsPermissionSubmitting] = useState(false)

  const [messageValues, setMessageValues] = useState<MessageComposerValues>(initialMessageForm)
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false)
  const [isMessageSubmitting, setIsMessageSubmitting] = useState(false)

  const users = dashboardQuery.data?.users ?? emptyUsers
  const statistics = dashboardQuery.data?.statistics

  const filteredUsers = useMemo(() => {
    const normalizedSearch = deferredSearch.trim().toLowerCase()

    if (!normalizedSearch) {
      return users
    }

    return users.filter((user) =>
      [user.name, user.surname, user.email, user.role, user.company_code]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch)),
    )
  }, [deferredSearch, users])

  const permissionOverviewUsers = useMemo(() => {
    const allUsers = permissionsOverviewQuery.data?.users ?? []
    const normalizedSearch = deferredSearch.trim().toLowerCase()

    if (!normalizedSearch) {
      return allUsers
    }

    return allUsers.filter((user) =>
      [user.name, user.email, user.role, ...user.permissions]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedSearch)),
    )
  }, [deferredSearch, permissionsOverviewQuery.data?.users])

  useEffect(() => {
    if (!isPermissionModalOpen || !permissionTargetUser) {
      return
    }

    const targetUser = permissionTargetUser
    let isActive = true

    async function loadUserPermissions() {
      setIsPermissionLoading(true)

      try {
        const response = await ceoService.getUserPermissions(targetUser.id)

        if (!isActive) {
          return
        }

        setPermissionState(response.permissions)
        setActivePermissionsCount(response.active_permissions_count)
        setTotalAvailablePages(response.total_available_pages)

        const overviewPermissions = permissionsOverviewQuery.data?.available_pages ?? []
        const mergedPermissions = Array.from(
          new Set([
            ...overviewPermissions,
            ...Object.keys(response.permissions),
            ...permissionCatalog.map((item) => item.key),
          ]),
        )
        setAvailablePermissions(mergedPermissions)
      } catch (error) {
        if (!isActive) {
          return
        }

        showToast({
          title: 'Permissions failed to load',
          description: error instanceof Error ? error.message : 'Error fetching user permission details.',
          tone: 'error',
        })
      } finally {
        if (isActive) {
          setIsPermissionLoading(false)
        }
      }
    }

    void loadUserPermissions()

    return () => {
      isActive = false
    }
  }, [isPermissionModalOpen, permissionTargetUser, permissionsOverviewQuery.data?.available_pages, showToast])

  function refreshAll() {
    return Promise.all([dashboardQuery.refetch(), permissionsOverviewQuery.refetch()])
  }

  function openCreateUserModal() {
    setSelectedUser(null)
    setUserModalMode('create')
    setUserFormValues(initialUserForm)
    setIsUserModalOpen(true)
  }

  function openEditUserModal(user: CeoUserRecord) {
    setSelectedUser(user)
    setUserModalMode('edit')
    setUserFormValues(toUserFormValues(user))
    setIsUserModalOpen(true)
  }

  async function handleSubmitUser() {
    if (!userFormValues.email.trim() || !userFormValues.name.trim() || !userFormValues.surname.trim()) {
      showToast({
        title: 'Required fields missing',
        description: 'Email, name, and surname are required.',
        tone: 'error',
      })
      return
    }

    if (userModalMode === 'create' && !userFormValues.password.trim()) {
      showToast({
        title: 'Password required',
        description: 'Password cannot be empty when creating a new user.',
        tone: 'error',
      })
      return
    }

    setIsUserSubmitting(true)

    try {
      const payload = toUserPayload(userFormValues, userModalMode)

      if (userModalMode === 'create') {
        await ceoService.createUser(payload)
      } else if (selectedUser) {
        await ceoService.updateUser(selectedUser.id, payload)
      }

      await refreshAll()
      setIsUserModalOpen(false)
      showToast({
        title: userModalMode === 'create' ? 'User created' : 'User updated',
        description: 'CEO user list has been successfully updated.',
        tone: 'success',
      })
    } catch (error) {
      showToast({
        title: 'User not saved',
        description: error instanceof Error ? error.message : 'Error in user CRUD request.',
        tone: 'error',
      })
    } finally {
      setIsUserSubmitting(false)
    }
  }

  async function handleDeleteUser(user: CeoUserRecord) {
    const approved = await confirm({
      title: `Delete ${user.name} ${user.surname}?`,
      description: 'This user will be permanently removed from the system.',
      confirmLabel: 'Delete user',
      cancelLabel: 'Cancel',
      tone: 'danger',
    })

    if (!approved) {
      return
    }

    try {
      await ceoService.deleteUser(user.id)
      await refreshAll()
      showToast({
        title: 'User deleted',
        description: `${user.email} has been removed from the system.`,
        tone: 'success',
      })
    } catch (error) {
      showToast({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'User delete flow failed.',
        tone: 'error',
      })
    }
  }

  async function handleToggleUser(user: CeoUserRecord) {
    const nextStatusLabel = user.is_active ? 'inactive' : 'active'

    try {
      await ceoService.toggleUserActive(user.id)
      await dashboardQuery.refetch()
      showToast({
        title: `User set to ${nextStatusLabel}`,
        description: `${user.email} is now marked as ${nextStatusLabel}.`,
        tone: 'success',
      })
    } catch (error) {
      showToast({
        title: 'Status update failed',
        description: error instanceof Error ? error.message : 'Error changing active status.',
        tone: 'error',
      })
    }
  }

  function openPermissionModal(user: CeoUserRecord) {
    setPermissionTargetUser(user)
    setIsPermissionModalOpen(true)
  }

  function togglePermission(permissionKey: string, nextValue: boolean) {
    setPermissionState((current) => ({
      ...current,
      [permissionKey]: nextValue,
    }))
  }

  async function handleReplacePermissions() {
    if (!permissionTargetUser) {
      return
    }

    setIsPermissionSubmitting(true)

    try {
      await ceoService.updateUserPermissions(permissionTargetUser.id, permissionState)
      await permissionsOverviewQuery.refetch()
      const nextActiveCount = Object.values(permissionState).filter(Boolean).length
      setActivePermissionsCount(nextActiveCount)
      showToast({
        title: 'Permissions updated',
        description: `Checkbox values saved for ${permissionTargetUser.email}.`,
        tone: 'success',
      })
    } catch (error) {
      showToast({
        title: 'Permissions not saved',
        description: error instanceof Error ? error.message : 'Permission replace flow failed.',
        tone: 'error',
      })
    } finally {
      setIsPermissionSubmitting(false)
    }
  }

  async function handleAddSelectedPermissions() {
    if (!permissionTargetUser) {
      return
    }

    setIsPermissionSubmitting(true)

    try {
      await ceoService.addUserPermissions(permissionTargetUser.id, permissionState)
      const refreshed = await ceoService.getUserPermissions(permissionTargetUser.id)
      setPermissionState(refreshed.permissions)
      setActivePermissionsCount(refreshed.active_permissions_count)
      await permissionsOverviewQuery.refetch()
      showToast({
        title: 'Permissions added',
        description: 'Selected permissions have been added to the user.',
        tone: 'success',
      })
    } catch (error) {
      showToast({
        title: 'Permissions not added',
        description: error instanceof Error ? error.message : 'Add permission flow failed.',
        tone: 'error',
      })
    } finally {
      setIsPermissionSubmitting(false)
    }
  }

  async function handleRemovePermission(permissionKey: string) {
    if (!permissionTargetUser) {
      return
    }

    try {
      await ceoService.removeUserPermission(permissionTargetUser.id, permissionKey)
      setPermissionState((current) => ({
        ...current,
        [permissionKey]: false,
      }))
      setActivePermissionsCount((current) => Math.max(0, current - 1))
      await permissionsOverviewQuery.refetch()
      showToast({
        title: 'Permission removed',
        description: `${permissionKey} has been removed from the user.`,
        tone: 'success',
      })
    } catch (error) {
      showToast({
        title: 'Permission not removed',
        description: error instanceof Error ? error.message : 'Single remove flow failed.',
        tone: 'error',
      })
    }
  }

  function openMessageModal(user: CeoUserRecord) {
    setMessageValues({
      receiver_id: user.id,
      receiver_label: `${user.name} ${user.surname} (${user.email})`,
      subject: '',
      body: '',
    })
    setIsMessageModalOpen(true)
  }

  async function handleSendSingleMessage() {
    if (!messageValues.receiver_id || !messageValues.subject.trim() || !messageValues.body.trim()) {
      showToast({
        title: 'Message incomplete',
        description: 'Receiver, subject, and body are required.',
        tone: 'error',
      })
      return
    }

    setIsMessageSubmitting(true)

    try {
      await ceoService.sendMessageToUser({
        receiver_id: messageValues.receiver_id,
        subject: messageValues.subject.trim(),
        body: messageValues.body.trim(),
      })
      setIsMessageModalOpen(false)
      showToast({
        title: 'Message sent',
        description: messageValues.receiver_label,
        tone: 'success',
      })
    } catch (error) {
      showToast({
        title: 'Message not sent',
        description: error instanceof Error ? error.message : 'Single user message flow failed.',
        tone: 'error',
      })
    } finally {
      setIsMessageSubmitting(false)
    }
  }

  if (dashboardQuery.isLoading && !dashboardQuery.data) {
    return (
      <LoadingStateBlock
        eyebrow="CEO / Users"
        title="Users module loading"
        description="Fetching CEO users list and permissions overview."
      />
    )
  }

  if (dashboardQuery.isError && !dashboardQuery.data) {
    return (
      <ErrorStateBlock
        eyebrow="CEO / Users"
        title="Users module failed to load"
        description="Could not fetch user data. Please retry."
        actionLabel="Retry"
        onAction={() => {
          void refreshAll()
        }}
      />
    )
  }

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.26em] text-[var(--accent)]">CEO / Day 5</p>
          <h1 className="mt-3 text-3xl font-semibold text-white tracking-tight">Users & Permissions</h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-[var(--muted)]">
            Manage user creation, edits, deletion, active status, permission details, and system overview.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => void refreshAll()}>
            Refresh
          </Button>
          <Button onClick={openCreateUserModal}>Create user</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Users" value={formatCompactNumber(statistics?.user_count ?? users.length)} />
        <MetricCard label="Messages" value={formatCompactNumber(statistics?.messages_count ?? 0)} />
        <MetricCard label="Active" value={formatCompactNumber(statistics?.active_user_count ?? 0)} />
        <MetricCard label="Inactive" value={formatCompactNumber(statistics?.inactive_user_count ?? 0)} />
      </div>

      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <SectionTitle
            eyebrow="Users list"
            title="CEO users table"
            description="Search, edit, toggle status, manage permissions, and send messages directly from the table."
          />
          <Input
            className="w-full md:w-80"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by email, name, or role"
          />
        </div>

        <div className="mt-6">
          <DataTable
            caption="CEO users table"
            rows={filteredUsers}
            getRowKey={(row) => String(row.id)}
            emptyState={
              <EmptyStateBlock
                eyebrow="Users"
            title="No users found"
            description="There are no users matching your search or the database is empty."
              />
            }
            columns={[
              {
                key: 'identity',
                header: 'User',
                render: (row) => (
                  <div>
                    <p className="font-bold text-white tracking-tight">{row.name} {row.surname}</p>
                    <p className="text-xs font-medium text-zinc-500">{row.email}</p>
                  </div>
                ),
              },
              {
                key: 'role',
                header: 'Role',
                render: (row) => <Badge className="bg-white/5 text-white border-white/10">{String(row.role)}</Badge>,
              },
              {
                key: 'company',
                header: 'Company',
                render: (row) => row.company_code ?? '-',
              },
              {
                key: 'status',
                header: 'Status',
                render: (row) => (
                  <span className={cn('text-xs font-bold uppercase tracking-wider', row.is_active ? 'text-emerald-400' : 'text-rose-500')}>
                    {row.is_active ? 'Active' : 'Inactive'}
                  </span>
                ),
              },
              {
                key: 'actions',
                header: 'Actions',
                render: (row) => (
                  <ActionsMenu
                    label={`Open actions for ${row.email}`}
                    items={[
                      {
                        label: 'Edit',
                        onSelect: () => openEditUserModal(row),
                      },
                      {
                        label: row.is_active ? 'Deactivate' : 'Activate',
                        onSelect: () => void handleToggleUser(row),
                      },
                      {
                        label: 'Permissions',
                        onSelect: () => openPermissionModal(row),
                      },
                      {
                        label: 'Message',
                        onSelect: () => openMessageModal(row),
                      },
                      {
                        label: 'Delete',
                        onSelect: () => void handleDeleteUser(row),
                        tone: 'danger',
                      },
                    ]}
                  />
                ),
              },
            ]}
          />
        </div>
      </Card>

      <Card className="p-6">
        <SectionTitle
          eyebrow="Permissions overview"
          title="User permissions summary"
          description="Detailed overview of permissions across all users with filtered results."
        />

        <div className="mt-5 flex flex-wrap gap-2">
          {Object.entries(permissionsOverviewQuery.data?.summary ?? {}).map(([key, value]) => (
            <Badge key={key} className="bg-blue-600/10 text-blue-400 border-blue-500/20">{`${key}: ${value}`}</Badge>
          ))}
        </div>

        <div className="mt-6">
          <DataTable
            caption="Permission overview"
            rows={permissionOverviewUsers}
            getRowKey={(row) => String(row.user_id)}
            emptyState={
              <EmptyStateBlock
                eyebrow="Permissions"
                title="Permission overview empty"
                description="No overview data returned from backend or filter yielded no results."
              />
            }
            columns={[
              {
                key: 'user',
                header: 'User',
                render: (row) => (
                  <div>
                    <p className="font-bold text-white tracking-tight">{row.name}</p>
                    <p className="text-xs font-medium text-zinc-500">{row.email}</p>
                  </div>
                ),
              },
              {
                key: 'role',
                header: 'Role',
                render: (row) => row.role,
              },
              {
                key: 'count',
                header: 'Count',
                align: 'right',
                render: (row) => formatCompactNumber(row.permissions_count),
              },
              {
                key: 'permissions',
                header: 'Permissions',
                render: (row) => (
                  <div className="flex flex-wrap gap-2">
                    {row.permissions_display.slice(0, 4).map((permission) => (
                      <Badge key={permission} className="bg-white/5 text-white border-white/10">
                        {permission}
                      </Badge>
                    ))}
                    {row.permissions_display.length > 4 ? (
                      <Badge className="bg-white/5 text-white border-white/10">
                        +{row.permissions_display.length - 4}
                      </Badge>
                    ) : null}
                  </div>
                ),
              },
            ]}
          />
        </div>
      </Card>

      <UserFormModal
        open={isUserModalOpen}
        mode={userModalMode}
        values={userFormValues}
        onClose={() => setIsUserModalOpen(false)}
        onChange={(field, value) =>
          setUserFormValues((current) => ({
            ...current,
            [field]: value,
          }))
        }
        onSubmit={() => void handleSubmitUser()}
        isSubmitting={isUserSubmitting}
      />

      <PermissionEditorModal
        open={isPermissionModalOpen}
        onClose={() => setIsPermissionModalOpen(false)}
        userName={
          permissionTargetUser ? `${permissionTargetUser.name} ${permissionTargetUser.surname}` : 'Selected user'
        }
        permissions={permissionState}
        availablePermissions={availablePermissions}
        activePermissionsCount={activePermissionsCount}
        totalAvailablePages={totalAvailablePages}
        onToggle={togglePermission}
        onReplaceAll={() => void handleReplacePermissions()}
        onAddSelected={() => void handleAddSelectedPermissions()}
        onRemovePermission={(permissionKey) => void handleRemovePermission(permissionKey)}
        isSubmitting={isPermissionSubmitting || isPermissionLoading}
      />

      <MessageComposerModal
        open={isMessageModalOpen}
        onClose={() => setIsMessageModalOpen(false)}
        values={messageValues}
        isSubmitting={isMessageSubmitting}
        onChange={(field, value) =>
          setMessageValues((current) => ({
            ...current,
            [field]: value,
          }))
        }
        onSubmit={() => void handleSendSingleMessage()}
      />
    </section>
  )
}
