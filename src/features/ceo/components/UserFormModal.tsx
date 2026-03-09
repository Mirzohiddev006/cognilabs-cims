import { Input } from '../../../shared/ui/input'
import { Modal } from '../../../shared/ui/modal'
import { Button } from '../../../shared/ui/button'
import type { UserPayload } from '../../../shared/api/services/ceo.service'

export type UserFormValues = UserPayload & {
  password: string
}

type UserFormModalProps = {
  open: boolean
  mode: 'create' | 'edit'
  values: UserFormValues
  onClose: () => void
  onChange: (field: keyof UserFormValues, value: string | boolean | number) => void
  onSubmit: () => void
  isSubmitting: boolean
}

const roleOptions = ['Customer', 'SalesManager', 'Finance', 'CEO']

export function UserFormModal({
  open,
  mode,
  values,
  onClose,
  onChange,
  onSubmit,
  isSubmitting,
}: UserFormModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === 'create' ? 'Yangi user yaratish' : 'User ma`lumotlarini tahrirlash'}
      description="CEO user CRUD formi registerga o'xshash maydonlar bilan qurildi."
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Saqlanmoqda...' : mode === 'create' ? 'Create user' : 'Save changes'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-medium text-[var(--foreground)]">Email</span>
          <Input value={values.email} onChange={(event) => onChange('email', event.target.value)} />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-medium text-[var(--foreground)]">Company code</span>
          <Input
            value={values.company_code}
            onChange={(event) => onChange('company_code', event.target.value)}
          />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-medium text-[var(--foreground)]">Name</span>
          <Input value={values.name} onChange={(event) => onChange('name', event.target.value)} />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-medium text-[var(--foreground)]">Surname</span>
          <Input value={values.surname} onChange={(event) => onChange('surname', event.target.value)} />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-medium text-[var(--foreground)]">
            Password {mode === 'edit' ? '(ixtiyoriy)' : ''}
          </span>
          <Input
            type="password"
            value={values.password}
            onChange={(event) => onChange('password', event.target.value)}
          />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-medium text-[var(--foreground)]">Telegram ID</span>
          <Input
            value={values.telegram_id ?? ''}
            onChange={(event) => onChange('telegram_id', event.target.value)}
          />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-medium text-[var(--foreground)]">Default salary</span>
          <Input
            type="number"
            min="0"
            value={values.default_salary ?? 0}
            onChange={(event) => onChange('default_salary', Number(event.target.value))}
          />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-medium text-[var(--foreground)]">Role</span>
          <select
            value={values.role}
            onChange={(event) => onChange('role', event.target.value)}
            className="min-h-12 rounded-2xl border border-[var(--border)] bg-white/80 px-4 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
          >
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="mt-4 flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3">
        <input
          type="checkbox"
          checked={values.is_active}
          onChange={(event) => onChange('is_active', event.target.checked)}
        />
        <span className="text-sm text-[var(--muted-strong)]">Active user</span>
      </label>
    </Modal>
  )
}
