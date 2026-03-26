import { useEffect, useRef, useState } from 'react'
import { useLocale } from '../../../app/hooks/useLocale'
import { Dialog } from '../../../shared/ui/dialog'
import { Button } from '../../../shared/ui/button'
import { Input } from '../../../shared/ui/input'
import { Textarea } from '../../../shared/ui/textarea'
import { SelectField, type SelectFieldOption } from '../../../shared/ui/select-field'
import type {
  CardRecord,
  UserSummary,
} from '../../../shared/api/services/projects.service'
import { resolveMediaUrl } from '../../../shared/lib/media-url'
import { buildFormData } from '../lib/formdata'
import { getPriorityConfig } from '../lib/format'

type CardFormValues = {
  title: string
  description: string
  priority: string
  assignee_id: string
  due_date: string
  images: File[]
  clear_existing_images: boolean
}

type CardFormModalProps = {
  open: boolean
  onClose: () => void
  onSubmit: (fd: FormData) => Promise<void>
  initial?: CardRecord | null
  members: UserSummary[]
  title: string
  submitLabel: string
  isSubmitting: boolean
}

const empty: CardFormValues = {
  title: '',
  description: '',
  priority: '',
  assignee_id: '',
  due_date: '',
  images: [],
  clear_existing_images: false,
}

function getCardImageUrl(image: { url?: string | null; url_path?: string | null }) {
  const value = image.url ?? image.url_path ?? ''
  return resolveMediaUrl(value) ?? value
}

export function CardFormModal({
  open,
  onClose,
  onSubmit,
  initial,
  members,
  title,
  submitLabel,
  isSubmitting,
}: CardFormModalProps) {
  const { t } = useLocale()
  const priorityConfig = getPriorityConfig()
  const [values, setValues] = useState<CardFormValues>(empty)
  const [titleError, setTitleError] = useState('')
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  const priorityOptions: SelectFieldOption[] = [
    { value: '', label: t('projects.no_priority', 'No priority') },
    { value: 'low', label: priorityConfig.low.label },
    { value: 'medium', label: priorityConfig.medium.label },
    { value: 'high', label: priorityConfig.high.label },
    { value: 'urgent', label: priorityConfig.urgent.label },
  ]

  const memberOptions: SelectFieldOption[] = [
    { value: '', label: t('projects.unassigned', 'Unassigned') },
    ...members.map((member) => ({
      value: String(member.id),
      label: `${member.name} ${member.surname}`,
    })),
  ]

  useEffect(() => {
    if (open) {
      if (initial) {
        const initialImages = Array.isArray(initial.images)
          ? initial.images
          : Array.isArray(initial.files)
            ? initial.files
            : []

        setValues({
          title: initial.title,
          description: initial.description ?? '',
          priority: initial.priority ?? '',
          assignee_id: initial.assignee_id ? String(initial.assignee_id) : '',
          due_date: initial.due_date ? initial.due_date.slice(0, 10) : '',
          images: [],
          clear_existing_images: false,
        })
        setImagePreviews(initialImages.map(getCardImageUrl))
      } else {
        setValues(empty)
        setImagePreviews([])
      }

      setTitleError('')
    }
  }, [open, initial])

  useEffect(() => {
    return () => {
      imagePreviews.forEach((url) => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url)
        }
      })
    }
  }, [imagePreviews])

  function set<K extends keyof CardFormValues>(key: K, value: CardFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }))

    if (key === 'title') {
      setTitleError('')
    }
  }

  function handleImagesChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])

    if (!files.length) {
      return
    }

    const urls = files.map((file) => URL.createObjectURL(file))
    setValues((prev) => ({ ...prev, images: [...prev.images, ...files] }))
    setImagePreviews((prev) => [...prev, ...urls])
  }

  function removeImage(index: number) {
    const existingCount = Array.isArray(initial?.images)
      ? initial.images.length
      : Array.isArray(initial?.files)
        ? initial.files.length
        : 0

    const newIndex = index - existingCount

    if (newIndex < 0) {
      setValues((prev) => ({ ...prev, clear_existing_images: true }))
      setImagePreviews((prev) => prev.filter((_, itemIndex) => itemIndex !== index))
      return
    }

    const url = imagePreviews[index]
    if (url.startsWith('blob:')) {
      URL.revokeObjectURL(url)
    }

    setValues((prev) => ({ ...prev, images: prev.images.filter((_, itemIndex) => itemIndex !== newIndex) }))
    setImagePreviews((prev) => prev.filter((_, itemIndex) => itemIndex !== index))
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    if (!values.title.trim()) {
      setTitleError(t('projects.card_title_required', 'Card title is required'))
      return
    }

    const fd = buildFormData({
      title: values.title.trim(),
      description: values.description.trim() || undefined,
      priority: values.priority || undefined,
      assignee_id: values.assignee_id ? Number(values.assignee_id) : undefined,
      due_date: values.due_date || undefined,
    })

    if (initial && values.clear_existing_images) {
      fd.append('clear_existing_images', 'true')
    }

    for (const image of values.images) {
      fd.append('images', image)
    }

    await onSubmit(fd)
  }

  const newFilesLabel = values.images.length === 1
    ? t('projects.new_files_count', '{count} new file', { count: values.images.length })
    : t('projects.new_files_count_plural', '{count} new files', { count: values.images.length })

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      eyebrow={t('projects.form_eyebrow_cards', 'Cards')}
      size="lg"
      footer={(
        <>
          <Button variant="ghost" size="md" onClick={onClose} disabled={isSubmitting}>
            {t('projects.cancel', 'Cancel')}
          </Button>
          <Button
            variant="primary"
            size="md"
            loading={isSubmitting}
            onClick={handleSubmit as unknown as React.MouseEventHandler}
          >
            {submitLabel}
          </Button>
        </>
      )}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-strong)]">
            {t('projects.card_title', 'Title')} <span className="text-red-400">*</span>
          </label>
          <Input
            value={values.title}
            onChange={(event) => set('title', event.target.value)}
            placeholder={t('projects.card_title_placeholder', 'What needs to be done?')}
            autoFocus
          />
          {titleError ? <p className="text-xs text-[var(--danger-text)]">{titleError}</p> : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-strong)]">
            {t('projects.description', 'Description')}
          </label>
          <Textarea
            value={values.description}
            onChange={(event) => set('description', event.target.value)}
            placeholder={t('projects.card_description_placeholder', 'Add more details...')}
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-strong)]">
              {t('projects.priority', 'Priority')}
            </label>
            <SelectField
              value={values.priority}
              options={priorityOptions}
              onValueChange={(value) => set('priority', value)}
              placeholder={t('projects.no_priority', 'No priority')}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-strong)]">
              {t('projects.assignee', 'Assignee')}
            </label>
            <SelectField
              value={values.assignee_id}
              options={memberOptions}
              onValueChange={(value) => set('assignee_id', value)}
              placeholder={t('projects.unassigned', 'Unassigned')}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-strong)]">
            {t('projects.due_date', 'Due Date')}
          </label>
          <Input
            type="date"
            value={values.due_date}
            onChange={(event) => set('due_date', event.target.value)}
            className="text-sm"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-strong)]">
            {t('projects.attachments', 'Attachments')}
          </label>

          {imagePreviews.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {imagePreviews.map((url, index) => (
                <div key={`${url}-${index}`} className="group relative h-16 w-16 overflow-hidden rounded-xl border border-[var(--border)]">
                  <img
                    src={url}
                    alt={t('projects.attachment', 'Attachment')}
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label={t('projects.remove', 'Remove')}
                  >
                    <svg viewBox="0 0 16 16" className="h-4 w-4 text-white" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => fileRef.current?.click()}
              leftIcon={(
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M8 3v10M3 8h10" strokeLinecap="round" />
                </svg>
              )}
            >
              {t('projects.add_images', 'Add images')}
            </Button>

            {values.images.length > 0 ? (
              <span className="text-xs text-[var(--muted)]">{newFilesLabel}</span>
            ) : null}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleImagesChange}
          />
        </div>

        <div className="flex flex-wrap gap-2 border-t border-[var(--border)] pt-3">
          {(Object.entries(priorityConfig) as [string, { label: string; color: string }][]).map(([key, value]) => (
            <span key={key} className="inline-flex items-center gap-1 text-[10px] text-[var(--muted)]">
              <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: value.color }} />
              {value.label}
            </span>
          ))}
        </div>
      </form>
    </Dialog>
  )
}
