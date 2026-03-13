import { Input } from '../../../shared/ui/input'
import { Modal } from '../../../shared/ui/modal'
import { Button } from '../../../shared/ui/button'
import { SelectField } from '../../../shared/ui/select-field'
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
      title={mode === 'create' ? 'Create new user' : 'Edit user details'}
      description="CEO user CRUD form built with fields consistent with registration."
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create user' : 'Save changes'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-xs font-bold text-white tracking-tight">Email</span>
          <Input value={values.email} placeholder="user@example.com" onChange={(event) => onChange('email', event.target.value)} />
        </label>
        <label className="grid gap-2">
          <span className="text-xs font-bold text-white tracking-tight">Company code</span>
          <Input
            value={values.company_code}
            placeholder="e.g. oddiy"
            onChange={(event) => onChange('company_code', event.target.value)}
          />
        </label>
        <label className="grid gap-2">
          <span className="text-xs font-bold text-white tracking-tight">Name</span>
          <Input value={values.name} placeholder="First name" onChange={(event) => onChange('name', event.target.value)} />
        </label>
        <label className="grid gap-2">
          <span className="text-xs font-bold text-white tracking-tight">Surname</span>
          <Input value={values.surname} placeholder="Last name" onChange={(event) => onChange('surname', event.target.value)} />
        </label>
        <label className="grid gap-2">
          <span className="text-xs font-bold text-white tracking-tight">
            Password {mode === 'edit' ? '(optional)' : ''}
          </span>
          <Input
            type="password"
            placeholder="Minimum 6 characters"
            value={values.password}
            onChange={(event) => onChange('password', event.target.value)}
          />
        </label>
        <label className="grid gap-2">
          <span className="text-xs font-bold text-white tracking-tight">Telegram ID</span>
          <Input
            value={values.telegram_id ?? ''}
            placeholder="@username or ID"
            onChange={(event) => onChange('telegram_id', event.target.value)}
          />
        </label>
        <label className="grid gap-2">
          <span className="text-xs font-bold text-white tracking-tight">Default salary</span>
          <Input
            type="number"
            min="0"
            value={values.default_salary ?? 0}
            onChange={(event) => onChange('default_salary', Number(event.target.value))}
          />
        </label>
        <label className="grid gap-2">
          <span className="text-xs font-bold text-white tracking-tight">Role</span>
          <SelectField
            value={values.role}
            onValueChange={(value) => onChange('role', value)}
            options={roleOptions.map((role) => ({ value: role, label: role }))}
            className="min-h-12 rounded-xl px-4"
          />
        </label>
      </div>

      <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-[20px] border border-[var(--border)] bg-[var(--input-surface)] px-4 py-3 shadow-[inset_0_1px_2px_rgba(0,0,0,0.12)] transition hover:border-[var(--border-hover)] hover:bg-[var(--input-surface-hover)]">
        <input
          type="checkbox"
          checked={values.is_active}
          onChange={(event) => onChange('is_active', event.target.checked)}
          className="h-4 w-4 rounded border border-white/10 accent-blue-500"
        />
        <span className="text-xs font-bold text-white">Active user</span>
      </label>
    </Modal>
  )
}
