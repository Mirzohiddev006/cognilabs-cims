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
      title={`Permissions for ${userName}`}
      description="Manage access rights using checkbox selection, replace, or single removal flows."
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
            {isSubmitting ? 'Saving...' : 'Replace all'}
          </Button>
        </>
      }
    >
      <div className="flex flex-wrap gap-3">
        <Badge className="bg-blue-600/10 text-blue-400 border-blue-500/20">{`Active ${activePermissionsCount}`}</Badge>
        <Badge className="bg-white/5 text-white border-white/10">{`Available ${totalAvailablePages}`}</Badge>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="grid gap-3">
          {availablePermissions.map((permissionKey) => {
            const meta = getPermissionMeta(permissionKey)

            return (
              <label
                key={permissionKey}
                className="flex items-start gap-4 rounded-2xl border border-[var(--border)] bg-white/5 px-4 py-4 transition-colors hover:bg-white/10 cursor-pointer"
              >
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={Boolean(permissions[permissionKey])}
                  onChange={(event) => onToggle(permissionKey, event.target.checked)}
                />
                <div>
                  <p className="text-sm font-bold text-white tracking-tight">{meta.label}</p>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">{meta.description}</p>
                  <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-blue-500 opacity-70">{permissionKey}</p>
                </div>
              </label>
            )
          })}
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-white/5 p-6 h-fit sticky top-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-500">Active now</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {activePermissionKeys.length > 0 ? (
              activePermissionKeys.map((permissionKey) => (
                <button
                  key={permissionKey}
                  type="button"
                  onClick={() => onRemovePermission(permissionKey)}
                  className="rounded-full border border-blue-500/30 bg-blue-600/10 px-3 py-1.5 text-[11px] font-bold text-blue-400 transition-all hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30"
                >
                  {getPermissionMeta(permissionKey).label} <span className="ml-1 opacity-50">×</span>
                </button>
              ))
            ) : (
              <p className="text-sm font-medium text-[var(--muted)]">No active permissions assigned.</p>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}
