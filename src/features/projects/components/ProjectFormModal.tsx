import { useEffect, useRef, useState } from 'react'
import { Dialog } from '../../../shared/ui/dialog'
import { Button } from '../../../shared/ui/button'
import { Input } from '../../../shared/ui/input'
import { Textarea } from '../../../shared/ui/textarea'
import { useAsyncData } from '../../../shared/hooks/useAsyncData'
import { projectsService, type ProjectRecord } from '../../../shared/api/services/projects.service'
import { buildFormData } from '../lib/formdata'
import { MemberSelector } from './MemberSelector'

type ProjectFormValues = {
  project_name: string
  project_description: string
  project_url: string
  member_ids: number[]
  image: File | null
}

type ProjectFormModalProps = {
  open: boolean
  onClose: () => void
  onSubmit: (fd: FormData) => Promise<void>
  initial?: ProjectRecord | null
  title: string
  submitLabel: string
  isSubmitting: boolean
}

const empty: ProjectFormValues = {
  project_name: '',
  project_description: '',
  project_url: '',
  member_ids: [],
  image: null,
}

export function ProjectFormModal({
  open,
  onClose,
  onSubmit,
  initial,
  title,
  submitLabel,
  isSubmitting,
}: ProjectFormModalProps) {
  const [values, setValues] = useState<ProjectFormValues>(empty)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [errors, setErrors] = useState<Partial<Record<keyof ProjectFormValues, string>>>({})
  const fileRef = useRef<HTMLInputElement>(null)

  const usersQuery = useAsyncData(
    () => projectsService.getAllUsers(),
    [open],
    { enabled: open },
  )

  // Initialise form with existing values
  useEffect(() => {
    if (open) {
      if (initial) {
        setValues({
          project_name: initial.project_name,
          project_description: initial.project_description ?? '',
          project_url: initial.project_url ?? '',
          member_ids: initial.members.map((m) => m.id),
          image: null,
        })
        setPreviewUrl(initial.image ?? null)
      } else {
        setValues(empty)
        setPreviewUrl(null)
      }
      setErrors({})
    }
  }, [open, initial])

  // Object-URL cleanup
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  function set<K extends keyof ProjectFormValues>(key: K, val: ProjectFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: val }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    if (!file) return
    set('image', file)
    const url = URL.createObjectURL(file)
    setPreviewUrl((old) => {
      if (old?.startsWith('blob:')) URL.revokeObjectURL(old)
      return url
    })
  }

  function validate(): boolean {
    const next: typeof errors = {}
    if (!values.project_name.trim()) next.project_name = 'Project name is required'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    const fd = buildFormData({
      project_name: values.project_name.trim(),
      project_description: values.project_description.trim() || undefined,
      project_url: values.project_url.trim() || undefined,
      'member_ids[]': values.member_ids as unknown as number[],
      image: values.image ?? undefined,
    })
    // member_ids need special handling
    if (values.member_ids.length > 0) {
      // remove 'member_ids[]' and re-add as 'member_ids'
      fd.delete('member_ids[]')
      for (const id of values.member_ids) {
        fd.append('member_ids[]', String(id))
      }
    }
    await onSubmit(fd)
  }

  const allUsers = usersQuery.data ?? []

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      eyebrow="Projects"
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
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Image upload */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-[var(--muted-strong)] uppercase tracking-wide">
            Project Image
          </label>
          <div className="flex items-center gap-4">
            <div
              className="relative flex h-20 w-20 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--input-surface)] transition hover:border-[var(--border-hover)]"
              onClick={() => fileRef.current?.click()}
            >
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="h-full w-full object-cover" />
              ) : (
                <svg viewBox="0 0 24 24" className="h-6 w-6 text-[var(--muted)]" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M3 9a2 2 0 0 1 2-2h.93a2 2 0 0 0 1.664-.89l.812-1.22A2 2 0 0 1 10.07 4h3.86a2 2 0 0 1 1.664.89l.812 1.22A2 2 0 0 0 18.07 7H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="12" cy="13" r="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Button type="button" variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
                {previewUrl ? 'Change image' : 'Upload image'}
              </Button>
              {previewUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    set('image', null)
                    setPreviewUrl(null)
                    if (fileRef.current) fileRef.current.value = ''
                  }}
                >
                  Remove
                </Button>
              )}
              <p className="text-[10px] text-[var(--muted)]">PNG, JPG up to 5 MB</p>
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageChange}
          />
        </div>

        {/* Project name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[var(--muted-strong)] uppercase tracking-wide">
            Project Name <span className="text-red-400">*</span>
          </label>
          <Input
            value={values.project_name}
            onChange={(e) => set('project_name', e.target.value)}
            placeholder="My awesome project"
          />
          {errors.project_name && (
            <p className="text-xs text-[var(--danger-text)]">{errors.project_name}</p>
          )}
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[var(--muted-strong)] uppercase tracking-wide">
            Description
          </label>
          <Textarea
            value={values.project_description}
            onChange={(e) => set('project_description', e.target.value)}
            placeholder="Describe the project goals and scope..."
            rows={3}
          />
        </div>

        {/* URL */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[var(--muted-strong)] uppercase tracking-wide">
            Project URL
          </label>
          <Input
            type="url"
            value={values.project_url}
            onChange={(e) => set('project_url', e.target.value)}
            placeholder="https://example.com"
          />
        </div>

        {/* Members */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[var(--muted-strong)] uppercase tracking-wide">
            Members ({values.member_ids.length} selected)
          </label>
          {usersQuery.isLoading ? (
            <p className="text-xs text-[var(--muted)] py-2">Loading members…</p>
          ) : (
            <MemberSelector
              allUsers={allUsers}
              selectedIds={values.member_ids}
              onChange={(ids) => set('member_ids', ids)}
            />
          )}
        </div>
      </form>
    </Dialog>
  )
}
