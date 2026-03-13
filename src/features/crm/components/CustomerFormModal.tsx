import { Button } from '../../../shared/ui/button'
import { Input } from '../../../shared/ui/input'
import { Modal } from '../../../shared/ui/modal'
import { SelectField } from '../../../shared/ui/select-field'
import { Textarea } from '../../../shared/ui/textarea'

export type CustomerFormValues = {
  full_name: string
  platform: string
  phone_number: string
  status: string
  username: string
  assistant_name: string
  notes: string
  recall_time: string
  clear_recall_time: boolean
  customer_type: string
  conversation_language: string
}

type StatusOption = {
  value: string
  label: string
}

type CustomerFormModalProps = {
  open: boolean
  mode: 'create' | 'edit'
  values: CustomerFormValues
  statusOptions: StatusOption[]
  audioFileName?: string | null
  onClose: () => void
  onChange: (field: keyof CustomerFormValues, value: string | boolean) => void
  onFileChange: (file: File | null) => void
  onSubmit: () => void
  isSubmitting: boolean
}

const conversationLanguages = [
  { value: 'uz', label: 'Uzbek' },
  { value: 'ru', label: 'Russian' },
  { value: 'en', label: 'English' },
]

const customerTypes = [
  { value: '', label: 'Not set' },
  { value: 'local', label: 'Local' },
  { value: 'international', label: 'International' },
]

export function CustomerFormModal({
  open,
  mode,
  values,
  statusOptions,
  audioFileName,
  onClose,
  onChange,
  onFileChange,
  onSubmit,
  isSubmitting,
}: CustomerFormModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === 'create' ? 'Yangi customer yaratish' : 'Customer ma`lumotlarini tahrirlash'}
      description="CRM customer create/edit formi multipart format bilan backendga ulanadi."
      size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Saqlanmoqda...' : mode === 'create' ? 'Create customer' : 'Save changes'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-xs font-medium text-[var(--foreground)]">Full name</span>
          <Input value={values.full_name} onChange={(event) => onChange('full_name', event.target.value)} />
        </label>
        <label className="grid gap-2">
          <span className="text-xs font-medium text-[var(--foreground)]">Platform</span>
          <Input value={values.platform} onChange={(event) => onChange('platform', event.target.value)} />
        </label>
        <label className="grid gap-2">
          <span className="text-xs font-medium text-[var(--foreground)]">Phone number</span>
          <Input value={values.phone_number} onChange={(event) => onChange('phone_number', event.target.value)} />
        </label>
        <label className="grid gap-2">
          <span className="text-xs font-medium text-[var(--foreground)]">Status</span>
          <SelectField
            value={values.status}
            onValueChange={(value) => onChange('status', value)}
            options={[{ value: '', label: 'Status tanlang' }, ...statusOptions]}
          />
        </label>
        <label className="grid gap-2">
          <span className="text-xs font-medium text-[var(--foreground)]">Username</span>
          <Input value={values.username} onChange={(event) => onChange('username', event.target.value)} />
        </label>
        <label className="grid gap-2">
          <span className="text-xs font-medium text-[var(--foreground)]">Assistant</span>
          <Input value={values.assistant_name} onChange={(event) => onChange('assistant_name', event.target.value)} />
        </label>
        <label className="grid gap-2">
          <span className="text-xs font-medium text-[var(--foreground)]">Recall time</span>
          <Input
            type="datetime-local"
            value={values.recall_time}
            onChange={(event) => onChange('recall_time', event.target.value)}
          />
        </label>
        <label className="grid gap-2">
          <span className="text-xs font-medium text-[var(--foreground)]">Customer type</span>
          <SelectField
            value={values.customer_type}
            onValueChange={(value) => onChange('customer_type', value)}
            options={customerTypes}
          />
        </label>
        <label className="grid gap-2">
          <span className="text-xs font-medium text-[var(--foreground)]">Conversation language</span>
          <SelectField
            value={values.conversation_language}
            onValueChange={(value) => onChange('conversation_language', value)}
            options={conversationLanguages}
          />
        </label>
        <label className="grid gap-2">
          <span className="text-xs font-medium text-[var(--foreground)]">Audio file</span>
          <input
            type="file"
            accept="audio/*"
            className="block min-h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--input-surface)] px-3 py-2 text-xs text-[var(--muted-strong)] shadow-[inset_0_1px_2px_rgba(0,0,0,0.12)] file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white hover:border-[var(--border-hover)] hover:bg-[var(--input-surface-hover)]"
            onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
          />
          {audioFileName ? <span className="text-xs text-[var(--muted)]">Current: {audioFileName}</span> : null}
        </label>
      </div>

      <label className="mt-4 grid gap-2">
        <span className="text-xs font-medium text-[var(--foreground)]">Notes</span>
        <Textarea value={values.notes} onChange={(event) => onChange('notes', event.target.value)} />
      </label>

      <label className="mt-4 flex items-center gap-3 rounded-[20px] border border-[var(--border)] bg-[var(--input-surface)] px-4 py-3 shadow-[inset_0_1px_2px_rgba(0,0,0,0.12)] transition hover:border-[var(--border-hover)] hover:bg-[var(--input-surface-hover)]">
        <input
          type="checkbox"
          checked={values.clear_recall_time}
          onChange={(event) => onChange('clear_recall_time', event.target.checked)}
          className="h-4 w-4 rounded border border-white/10 accent-blue-500"
        />
        <span className="text-xs text-[var(--muted-strong)]">Recall time ni tozalash</span>
      </label>
    </Modal>
  )
}
