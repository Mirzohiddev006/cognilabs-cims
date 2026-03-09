import { Button } from '../../../shared/ui/button'
import { Input } from '../../../shared/ui/input'
import { Modal } from '../../../shared/ui/modal'
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

const selectClassName =
  'min-h-10 w-full rounded-md border border-[var(--border)] bg-white px-3 text-sm text-[var(--foreground)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgba(15,23,42,0.08)]'

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
          <span className="text-sm font-medium text-[var(--foreground)]">Full name</span>
          <Input value={values.full_name} onChange={(event) => onChange('full_name', event.target.value)} />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-medium text-[var(--foreground)]">Platform</span>
          <Input value={values.platform} onChange={(event) => onChange('platform', event.target.value)} />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-medium text-[var(--foreground)]">Phone number</span>
          <Input value={values.phone_number} onChange={(event) => onChange('phone_number', event.target.value)} />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-medium text-[var(--foreground)]">Status</span>
          <select
            value={values.status}
            onChange={(event) => onChange('status', event.target.value)}
            className={selectClassName}
          >
            <option value="">Status tanlang</option>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-medium text-[var(--foreground)]">Username</span>
          <Input value={values.username} onChange={(event) => onChange('username', event.target.value)} />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-medium text-[var(--foreground)]">Assistant</span>
          <Input value={values.assistant_name} onChange={(event) => onChange('assistant_name', event.target.value)} />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-medium text-[var(--foreground)]">Recall time</span>
          <Input
            type="datetime-local"
            value={values.recall_time}
            onChange={(event) => onChange('recall_time', event.target.value)}
          />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-medium text-[var(--foreground)]">Customer type</span>
          <select
            value={values.customer_type}
            onChange={(event) => onChange('customer_type', event.target.value)}
            className={selectClassName}
          >
            {customerTypes.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-medium text-[var(--foreground)]">Conversation language</span>
          <select
            value={values.conversation_language}
            onChange={(event) => onChange('conversation_language', event.target.value)}
            className={selectClassName}
          >
            {conversationLanguages.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-medium text-[var(--foreground)]">Audio file</span>
          <input
            type="file"
            accept="audio/*"
            className="block min-h-10 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--muted-strong)] shadow-sm"
            onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
          />
          {audioFileName ? <span className="text-xs text-[var(--muted)]">Current: {audioFileName}</span> : null}
        </label>
      </div>

      <label className="mt-4 grid gap-2">
        <span className="text-sm font-medium text-[var(--foreground)]">Notes</span>
        <Textarea value={values.notes} onChange={(event) => onChange('notes', event.target.value)} />
      </label>

      <label className="mt-4 flex items-center gap-3 rounded-md border border-[var(--border)] bg-[var(--accent-soft)]/55 px-4 py-3">
        <input
          type="checkbox"
          checked={values.clear_recall_time}
          onChange={(event) => onChange('clear_recall_time', event.target.checked)}
        />
        <span className="text-sm text-[var(--muted-strong)]">Recall time ni tozalash</span>
      </label>
    </Modal>
  )
}
