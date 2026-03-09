import type { PermissionMap } from '../../../shared/api/types'
import { Badge } from '../../../shared/ui/badge'
import { Button } from '../../../shared/ui/button'
import { Modal } from '../../../shared/ui/modal'
import { getPermissionMeta } from '../lib/permissionCatalog'

type PermissionEditorModalProps = {
  open: boolean
  onClose: () => void
  userName: string
  permissions: PermissionMap
  availablePermissions: string[]
  activePermissionsCount: number
  totalAvailablePages: number
  onToggle: (permissionKey: string, nextValue: boolean) => void
  onReplaceAll: () => void
  onAddSelected: () => void
  onRemovePermission: (permissionKey: string) => void
  isSubmitting: boolean
}

export function PermissionEditorModal({
  open,
  onClose,
  userName,
  permissions,
  availablePermissions,
  activePermissionsCount,
  totalAvailablePages,
  onToggle,
  onReplaceAll,
  onAddSelected,
  onRemovePermission,
  isSubmitting,
}: PermissionEditorModalProps) {
  const activePermissionKeys = Object.entries(permissions)
    .filter(([, enabled]) => enabled)
    .map(([key]) => key)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${userName} uchun permissions`}
      description="Checkbox, replace, add va single remove flowlari shu modal ichida boshqariladi."
      size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button variant="ghost" onClick={onAddSelected} disabled={isSubmitting}>
            Add selected
          </Button>
          <Button onClick={onReplaceAll} disabled={isSubmitting}>
            {isSubmitting ? 'Saqlanmoqda...' : 'Replace all'}
          </Button>
        </>
      }
    >
      <div className="flex flex-wrap gap-3">
        <Badge>{`Active ${activePermissionsCount}`}</Badge>
        <Badge className="bg-white/70 text-[var(--muted-strong)]">{`Available ${totalAvailablePages}`}</Badge>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="grid gap-3">
          {availablePermissions.map((permissionKey) => {
            const meta = getPermissionMeta(permissionKey)

            return (
              <label
                key={permissionKey}
                className="flex items-start gap-3 rounded-[24px] border border-[var(--border)] bg-white/70 px-4 py-4"
              >
                <input
                  type="checkbox"
                  checked={Boolean(permissions[permissionKey])}
                  onChange={(event) => onToggle(permissionKey, event.target.checked)}
                />
                <div>
                  <p className="text-sm font-semibold text-[var(--foreground)]">{meta.label}</p>
                  <p className="mt-1 text-sm leading-6 text-[var(--muted-strong)]">{meta.description}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{permissionKey}</p>
                </div>
              </label>
            )
          })}
        </div>

        <div className="rounded-[28px] border border-[var(--border)] bg-white/65 p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">Active now</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {activePermissionKeys.length > 0 ? (
              activePermissionKeys.map((permissionKey) => (
                <button
                  key={permissionKey}
                  type="button"
                  onClick={() => onRemovePermission(permissionKey)}
                  className="rounded-full border border-[var(--border)] bg-[var(--accent-soft)] px-3 py-2 text-xs font-medium text-[var(--accent-strong)]"
                >
                  {getPermissionMeta(permissionKey).label} x
                </button>
              ))
            ) : (
              <p className="text-sm text-[var(--muted-strong)]">Hozircha active permission yo`q.</p>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}
