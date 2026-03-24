import { useEffect, useRef, useState } from 'react'
import { Dialog } from '../../../shared/ui/dialog'
import { Button } from '../../../shared/ui/button'
import { Input } from '../../../shared/ui/input'
import { Textarea } from '../../../shared/ui/textarea'
import { SelectField, type SelectFieldOption } from '../../../shared/ui/select-field'
import type {
  CardRecord,
  UserSummary,
} from '../../../shared/api/services/projects.service'
import { buildFormData } from '../lib/formdata'
import { PRIORITY_CONFIG } from '../lib/format'
import { resolveMediaUrl } from '../../../shared/lib/media-url'

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

const PRIORITY_OPTIONS: SelectFieldOption[] = [
  { value: '', label: 'No priority' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
]

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
  const [values, setValues] = useState<CardFormValues>(empty)
  const [titleError, setTitleError] = useState('')
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  const memberOptions: SelectFieldOption[] = [
    { value: '', label: 'Unassigned' },
    ...members.map((m) => ({ value: String(m.id), label: `${m.name} ${m.surname}` })),
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

  // Cleanup blob URLs on unmount / close
  useEffect(() => {
    return () => {
      imagePreviews.forEach((url) => {
        if (url.startsWith('blob:')) URL.revokeObjectURL(url)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function set<K extends keyof CardFormValues>(key: K, val: CardFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: val }))
    if (key === 'title') setTitleError('')
  }

  function handleImagesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    const urls = files.map((f) => URL.createObjectURL(f))
    setValues((prev) => ({ ...prev, images: [...prev.images, ...files] }))
    setImagePreviews((prev) => [...prev, ...urls])
  }

  function removeNewImage(idx: number) {
    const existingCount = Array.isArray(initial?.images) ? initial.images.length : 0
    const newIdx = idx - existingCount
    if (newIdx < 0) {
      // Removing an existing image — flag clear
      setValues((prev) => ({ ...prev, clear_existing_images: true }))
      setImagePreviews((prev) => prev.filter((_, i) => i !== idx))
    } else {
      const url = imagePreviews[idx]
      if (url.startsWith('blob:')) URL.revokeObjectURL(url)
      setValues((prev) => ({ ...prev, images: prev.images.filter((_, i) => i !== newIdx) }))
      setImagePreviews((prev) => prev.filter((_, i) => i !== idx))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!values.title.trim()) {
      setTitleError('Card title is required')
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
    for (const img of values.images) {
      fd.append('images', img)
    }
    await onSubmit(fd)
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      eyebrow="Cards"
      size="lg"
      footer={
        <>
          <Button variant="ghost" size="md" onClick={onClose} disabled={isSubmitting}>
            Cancel
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
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Title */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[var(--muted-strong)] uppercase tracking-wide">
            Title <span className="text-red-400">*</span>
          </label>
          <Input
            value={values.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="What needs to be done?"
            autoFocus
          />
          {titleError && <p className="text-xs text-[var(--danger-text)]">{titleError}</p>}
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[var(--muted-strong)] uppercase tracking-wide">
            Description
          </label>
          <Textarea
            value={values.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Add more details…"
            rows={3}
          />
        </div>

        {/* Priority + Assignee row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[var(--muted-strong)] uppercase tracking-wide">
              Priority
            </label>
            <SelectField
              value={values.priority}
              options={PRIORITY_OPTIONS}
              onValueChange={(v) => set('priority', v)}
              placeholder="No priority"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[var(--muted-strong)] uppercase tracking-wide">
              Assignee
            </label>
            <SelectField
              value={values.assignee_id}
              options={memberOptions}
              onValueChange={(v) => set('assignee_id', v)}
              placeholder="Unassigned"
            />
          </div>
        </div>

        {/* Due date */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[var(--muted-strong)] uppercase tracking-wide">
            Due Date
          </label>
          <Input
            type="date"
            value={values.due_date}
            onChange={(e) => set('due_date', e.target.value)}
            className="text-sm"
          />
        </div>

        {/* Attachments */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-[var(--muted-strong)] uppercase tracking-wide">
            Attachments
          </label>
          {imagePreviews.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {imagePreviews.map((url, i) => (
                <div key={i} className="group relative h-16 w-16 overflow-hidden rounded-xl border border-[var(--border)]">
                  <img src={url} alt="Attachment" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeNewImage(i)}
                    className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <svg viewBox="0 0 16 16" className="h-4 w-4 text-white" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => fileRef.current?.click()}
              leftIcon={
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M8 3v10M3 8h10" strokeLinecap="round" />
                </svg>
              }
            >
              Add images
            </Button>
            {values.images.length > 0 && (
              <span className="text-xs text-[var(--muted)]">{values.images.length} new file{values.images.length !== 1 ? 's' : ''}</span>
            )}
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

        {/* Priority legend */}
        <div className="flex flex-wrap gap-2 border-t border-[var(--border)] pt-3">
          {(Object.entries(PRIORITY_CONFIG) as [string, { label: string; color: string }][]).map(([k, v]) => (
            <span key={k} className="inline-flex items-center gap-1 text-[10px] text-[var(--muted)]">
              <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: v.color }} />
              {v.label}
            </span>
          ))}
        </div>
      </form>
    </Dialog>
  )
}
