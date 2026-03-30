import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
  const conversationLanguages = [
    { value: 'uz', label: t('common.language.uz', 'Uzbek') },
    { value: 'ru', label: t('common.language.ru', 'Russian') },
    { value: 'en', label: t('common.language.en', 'English') },
  ]
  const customerTypes = [
    { value: '', label: t('common.not_set', 'Not set') },
    { value: 'local', label: t('common.scope.local', 'Local') },
    { value: 'international', label: t('common.scope.international', 'International') },
  ]

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === 'create'
        ? t('customers.form.title_create', 'Create customer')
        : t('customers.form.title_edit', 'Edit customer details')}
      description={t('customers.form.description', 'Create or update CRM records and sync them with the backend.')}
      size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting
              ? t('customers.form.submitting', 'Saving...')
              : mode === 'create'
                ? t('customers.form.submit_create', 'Create customer')
                : t('customers.form.submit_edit', 'Save changes')}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-xs font-medium text-[var(--foreground)]">{t('common.full_name', 'Full name')}</span>
          <Input value={values.full_name} onChange={(event) => onChange('full_name', event.target.value)} />
        </label>
        <label className="grid gap-2">
          <span className="text-xs font-medium text-[var(--foreground)]">{t('common.platform', 'Platform')}</span>
          <Input value={values.platform} onChange={(event) => onChange('platform', event.target.value)} />
        </label>
        <label className="grid gap-2">
          <span className="text-xs font-medium text-[var(--foreground)]">{t('common.phone', 'Phone')}</span>
          <Input value={values.phone_number} onChange={(event) => onChange('phone_number', event.target.value)} />
        </label>
        <label className="grid gap-2">
          <span className="text-xs font-medium text-[var(--foreground)]">{t('common.status', 'Status')}</span>
          <SelectField
            key={`customer-status-${values.status || 'empty'}`}
            value={values.status}
            onValueChange={(value) => onChange('status', value)}
            options={[{ value: '', label: t('customers.form.status_placeholder', 'Select status') }, ...statusOptions]}
          />
        </label>
        <label className="grid gap-2">
          <span className="text-xs font-medium text-[var(--foreground)]">{t('common.username', 'Username')}</span>
          <Input value={values.username} onChange={(event) => onChange('username', event.target.value)} />
        </label>
        <label className="grid gap-2">
          <span className="text-xs font-medium text-[var(--foreground)]">{t('common.assistant', 'Assistant')}</span>
          <Input value={values.assistant_name} onChange={(event) => onChange('assistant_name', event.target.value)} />
        </label>
        <label className="grid gap-2">
          <span className="text-xs font-medium text-[var(--foreground)]">{t('common.recall_time', 'Recall time')}</span>
          <Input
            type="datetime-local"
            value={values.recall_time}
            onChange={(event) => onChange('recall_time', event.target.value)}
          />
        </label>
        <label className="grid gap-2">
          <span className="text-xs font-medium text-[var(--foreground)]">{t('common.customer_type', 'Customer type')}</span>
          <SelectField
            value={values.customer_type}
            onValueChange={(value) => onChange('customer_type', value)}
            options={customerTypes}
          />
        </label>
        <label className="grid gap-2">
          <span className="text-xs font-medium text-[var(--foreground)]">
            {t('common.conversation_language', 'Conversation language')}
          </span>
          <SelectField
            value={values.conversation_language}
            onValueChange={(value) => onChange('conversation_language', value)}
            options={conversationLanguages}
          />
        </label>
        <label className="grid gap-2">
          <span className="text-xs font-medium text-[var(--foreground)]">{t('common.audio', 'Audio')}</span>
          <input
            type="file"
            accept="audio/*"
            className="block min-h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--input-surface)] px-3 py-2 text-xs text-[var(--muted-strong)] shadow-[inset_0_1px_2px_rgba(0,0,0,0.12)] file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white hover:border-[var(--border-hover)] hover:bg-[var(--input-surface-hover)]"
            onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
          />
          {audioFileName ? (
            <span className="text-xs text-[var(--muted)]">
              {t('customers.form.audio_current', 'Current file: {{name}}', { name: audioFileName })}
            </span>
          ) : null}
        </label>
      </div>

      <label className="mt-4 grid gap-2">
        <span className="text-xs font-medium text-[var(--foreground)]">{t('common.notes', 'Notes')}</span>
        <Textarea value={values.notes} onChange={(event) => onChange('notes', event.target.value)} />
      </label>

      <label className="mt-4 flex items-center gap-3 rounded-[20px] border border-[var(--border)] bg-[var(--input-surface)] px-4 py-3 shadow-[inset_0_1px_2px_rgba(0,0,0,0.12)] transition hover:border-[var(--border-hover)] hover:bg-[var(--input-surface-hover)]">
        <input
          type="checkbox"
          checked={values.clear_recall_time}
          onChange={(event) => onChange('clear_recall_time', event.target.checked)}
          className="h-4 w-4 rounded border border-[var(--border)] accent-blue-500 dark:border-white/10"
        />
        <span className="text-xs text-[var(--muted-strong)]">{t('customers.form.clear_recall', 'Clear recall time')}</span>
      </label>
    </Modal>
  )
}
