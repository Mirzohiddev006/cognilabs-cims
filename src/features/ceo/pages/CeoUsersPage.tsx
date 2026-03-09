import { useDeferredValue, useEffect, useMemo, useState } from 'react'
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
          title: 'Permissionlar yuklanmadi',
          description: error instanceof Error ? error.message : 'User permission detail olib kelishda xato.',
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
        title: "Majburiy maydonlar to'ldirilmagan",
        description: 'Email, name va surname kiritilishi kerak.',
        tone: 'error',
      })
      return
    }

    if (userModalMode === 'create' && !userFormValues.password.trim()) {
      showToast({
        title: 'Password kerak',
        description: "Yangi user yaratishda password bo'sh bo'lmasligi kerak.",
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
        title: userModalMode === 'create' ? 'User yaratildi' : 'User yangilandi',
        description: 'CEO user list muvaffaqiyatli yangilandi.',
        tone: 'success',
      })
    } catch (error) {
      showToast({
        title: 'User saqlanmadi',
        description: error instanceof Error ? error.message : 'User CRUD so`rovida xato.',
        tone: 'error',
      })
    } finally {
      setIsUserSubmitting(false)
    }
  }

  async function handleDeleteUser(user: CeoUserRecord) {
    const approved = await confirm({
      title: `${user.name} ${user.surname} o'chirilsinmi?`,
      description: "Bu user butunlay tizimdan o'chiriladi.",
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
        title: "User o'chirildi",
        description: `${user.email} tizimdan olib tashlandi.`,
        tone: 'success',
      })
    } catch (error) {
      showToast({
        title: 'Delete bajarilmadi',
        description: error instanceof Error ? error.message : 'User delete flow xatolikka uchradi.',
        tone: 'error',
      })
    }
  }

  async function handleToggleUser(user: CeoUserRecord) {
    try {
      await ceoService.toggleUserActive(user.id)
      await dashboardQuery.refetch()
      showToast({
        title: 'Active status yangilandi',
        description: `${user.email} uchun active/inactive holat o'zgartirildi.`,
        tone: 'success',
      })
    } catch (error) {
      showToast({
        title: 'Toggle bajarilmadi',
        description: error instanceof Error ? error.message : 'Active status o`zgartirishda xato.',
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
        title: 'Permissionlar yangilandi',
        description: `${permissionTargetUser.email} uchun checkbox qiymatlari saqlandi.`,
        tone: 'success',
      })
    } catch (error) {
      showToast({
        title: 'Permissionlar saqlanmadi',
        description: error instanceof Error ? error.message : 'Permission replace flow xato berdi.',
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
        title: "Permission qo'shildi",
        description: "True bo'lgan permissionlar userga qo'shildi.",
        tone: 'success',
      })
    } catch (error) {
      showToast({
        title: 'Permission qo`shilmadi',
        description: error instanceof Error ? error.message : 'Add permission flow xato berdi.',
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
        title: 'Permission olib tashlandi',
        description: `${permissionKey} userdan olib tashlandi.`,
        tone: 'success',
      })
    } catch (error) {
      showToast({
        title: 'Permission o`chirilmadi',
        description: error instanceof Error ? error.message : 'Single remove flow ishlamadi.',
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
        title: "Message to'liq emas",
        description: 'Receiver, subject va body kerak.',
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
        title: 'Message yuborildi',
        description: messageValues.receiver_label,
        tone: 'success',
      })
    } catch (error) {
      showToast({
        title: 'Message yuborilmadi',
        description: error instanceof Error ? error.message : 'Single user message xato berdi.',
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
        title="User moduli yuklanmoqda"
        description="CEO users list va permissions overview olib kelinmoqda."
      />
    )
  }

  if (dashboardQuery.isError && !dashboardQuery.data) {
    return (
      <ErrorStateBlock
        eyebrow="CEO / Users"
        title="Users moduli ochilmadi"
        description="Dashboard user ma`lumotlari olinmadi. Qayta urinib ko`ring."
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
          <p className="text-sm font-medium uppercase tracking-[0.26em] text-[var(--accent)]">CEO / Day 5</p>
          <h1 className="mt-3 text-4xl font-semibold text-[var(--foreground)]">Users va permissions</h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-[var(--muted-strong)]">
            User create, edit, delete, active toggle, permission detail, add/remove va overview jadvali shu sahifada
            boshqariladi.
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
            description="Qidiruv, edit, toggle, permission va single-message actionlari table ichida tayyor."
          />
          <Input
            className="w-full md:w-80"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Email, name yoki role bo`yicha qidirish"
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
                title="User topilmadi"
                description="Qidiruvga mos user yo`q yoki backend hali bo`sh."
              />
            }
            columns={[
              {
                key: 'identity',
                header: 'User',
                render: (row) => (
                  <div>
                    <p className="font-semibold text-[var(--foreground)]">{row.name} {row.surname}</p>
                    <p className="text-xs text-[var(--muted)]">{row.email}</p>
                  </div>
                ),
              },
              {
                key: 'role',
                header: 'Role',
                render: (row) => <Badge className="bg-white/70 text-[var(--muted-strong)]">{String(row.role)}</Badge>,
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
                  <span className={row.is_active ? 'text-emerald-700' : 'text-red-600'}>
                    {row.is_active ? 'Active' : 'Inactive'}
                  </span>
                ),
              },
              {
                key: 'actions',
                header: 'Actions',
                render: (row) => (
                  <div className="flex flex-wrap gap-2">
                    <Button className="min-h-9 px-3 text-xs" variant="secondary" onClick={() => openEditUserModal(row)}>
                      Edit
                    </Button>
                    <Button className="min-h-9 px-3 text-xs" variant="ghost" onClick={() => void handleToggleUser(row)}>
                      Toggle
                    </Button>
                    <Button className="min-h-9 px-3 text-xs" variant="ghost" onClick={() => openPermissionModal(row)}>
                      Permissions
                    </Button>
                    <Button className="min-h-9 px-3 text-xs" variant="ghost" onClick={() => openMessageModal(row)}>
                      Message
                    </Button>
                    <Button className="min-h-9 px-3 text-xs" variant="ghost" onClick={() => void handleDeleteUser(row)}>
                      Delete
                    </Button>
                  </div>
                ),
              },
            ]}
          />
        </div>
      </Card>

      <Card className="p-6">
        <SectionTitle
          eyebrow="Permissions overview"
          title="Barcha userlar permission summary"
          description="Filterlangan jadval va summary chiplar bilan permission overview ko`rsatiladi."
        />

        <div className="mt-5 flex flex-wrap gap-2">
          {Object.entries(permissionsOverviewQuery.data?.summary ?? {}).map(([key, value]) => (
            <Badge key={key}>{`${key}: ${value}`}</Badge>
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
                title="Permission overview bo`sh"
                description="Backenddan overview response qaytmadi yoki filter natija topmadi."
              />
            }
            columns={[
              {
                key: 'user',
                header: 'User',
                render: (row) => (
                  <div>
                    <p className="font-semibold text-[var(--foreground)]">{row.name}</p>
                    <p className="text-xs text-[var(--muted)]">{row.email}</p>
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
                      <Badge key={permission} className="bg-white/70 text-[var(--muted-strong)]">
                        {permission}
                      </Badge>
                    ))}
                    {row.permissions_display.length > 4 ? (
                      <Badge className="bg-white/70 text-[var(--muted-strong)]">
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
