import { useEffect, useRef, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useLocale } from '../../../app/hooks/useLocale'
import { Dialog } from '../../../shared/ui/dialog'
import { Button } from '../../../shared/ui/button'
import { Input } from '../../../shared/ui/input'
import { Textarea } from '../../../shared/ui/textarea'
import { useQuery } from '@tanstack/react-query'
import { projectsService, type ProjectRecord } from '../../../shared/api/services/projects.service'
import { projectKeys } from '../lib/queryKeys'
import { resolveMediaUrl } from '../../../shared/lib/media-url'
import { buildFormData } from '../lib/formdata'
import { MemberSelector } from './MemberSelector'

const projectSchema = z.object({
  project_name: z.string().min(1, 'Project name is required'),
  project_description: z.string().default(''),
  project_url: z
    .string()
    .refine((val) => val === '' || z.string().url().safeParse(val).success, {
      message: 'Invalid URL format',
    })
    .default(''),
  member_ids: z.array(z.number()).default([]),
})

type ProjectFormSchema = z.infer<typeof projectSchema>

type ProjectFormModalProps = {
  open: boolean
  onClose: () => void
  onSubmit: (fd: FormData) => Promise<void>
  initial?: ProjectRecord | null
  title: string
  submitLabel: string
  isSubmitting: boolean
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
  const { t } = useLocale()
  const [image, setImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const usersQuery = useQuery({
    queryKey: projectKeys.users(),
    queryFn: () => projectsService.getAllUsers(),
    enabled: open,
  })

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<ProjectFormSchema>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      project_name: '',
      project_description: '',
      project_url: '',
      member_ids: [],
    },
  })

  useEffect(() => {
    if (open) {
      if (initial) {
        reset({
          project_name: initial.project_name,
          project_description: initial.project_description ?? '',
          project_url: initial.project_url ?? '',
          member_ids: initial.members.map((member) => member.id),
        })
        setPreviewUrl(resolveMediaUrl(initial.image) ?? initial.image ?? null)
      } else {
        reset({ project_name: '', project_description: '', project_url: '', member_ids: [] })
        setPreviewUrl(null)
      }

      setImage(null)
    }
  }, [open, initial, reset])

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null

    if (!file) {
      return
    }

    setImage(file)
    setPreviewUrl((oldValue) => {
      if (oldValue?.startsWith('blob:')) {
        URL.revokeObjectURL(oldValue)
      }
      return URL.createObjectURL(file)
    })
  }

  async function onValid(data: ProjectFormSchema) {
    const fd = buildFormData({
      project_name: data.project_name.trim(),
      project_description: data.project_description.trim() || undefined,
      project_url: data.project_url.trim() || undefined,
      member_ids: data.member_ids,
      image: image ?? undefined,
    })

    await onSubmit(fd)
  }

  const allUsers = usersQuery.data ?? []

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      eyebrow={t('projects.form_eyebrow_projects', 'Projects')}
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
            onClick={() => void handleSubmit(onValid)()}
          >
            {submitLabel}
          </Button>
        </>
      )}
    >
      <form onSubmit={handleSubmit(onValid)} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-strong)]">
            {t('projects.project_image', 'Project Image')}
          </label>
          <div className="flex items-center gap-4">
            <div
              className="relative flex h-20 w-20 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--input-surface)] transition hover:border-[var(--border-hover)]"
              onClick={() => fileRef.current?.click()}
            >
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt={t('projects.preview_image', 'Preview')}
                  className="h-full w-full object-cover"
                />
              ) : (
                <svg viewBox="0 0 24 24" className="h-6 w-6 text-[var(--muted)]" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M3 9a2 2 0 0 1 2-2h.93a2 2 0 0 0 1.664-.89l.812-1.22A2 2 0 0 1 10.07 4h3.86a2 2 0 0 1 1.664.89l.812 1.22A2 2 0 0 0 18.07 7H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="12" cy="13" r="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Button type="button" variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
                {previewUrl
                  ? t('projects.change_image', 'Change image')
                  : t('projects.upload_image', 'Upload image')}
              </Button>

              {previewUrl ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setImage(null)
                    setPreviewUrl(null)

                    if (fileRef.current) {
                      fileRef.current.value = ''
                    }
                  }}
                >
                  {t('projects.remove', 'Remove')}
                </Button>
              ) : null}

              <p className="text-[10px] text-[var(--muted)]">
                {t('projects.image_hint', 'PNG, JPG up to 5 MB')}
              </p>
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

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-strong)]">
            {t('projects.project_name', 'Project Name')} <span className="text-red-400">*</span>
          </label>
          <Input
            {...register('project_name')}
            aria-invalid={errors.project_name ? true : undefined}
            placeholder={t('projects.project_name_placeholder', 'My awesome project')}
          />
          {errors.project_name ? (
            <p className="text-xs text-[var(--danger-text)]">{errors.project_name.message}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-strong)]">
            {t('projects.description', 'Description')}
          </label>
          <Textarea
            {...register('project_description')}
            placeholder={t('projects.description_placeholder', 'Describe the project goals and scope...')}
            rows={3}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-strong)]">
            {t('projects.project_url', 'Project URL')}
          </label>
          <Input
            type="url"
            {...register('project_url')}
            aria-invalid={errors.project_url ? true : undefined}
            placeholder="https://example.com"
          />
          {errors.project_url ? (
            <p className="text-xs text-[var(--danger-text)]">{errors.project_url.message}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <Controller
            control={control}
            name="member_ids"
            render={({ field }) => (
              <>
                <label className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-strong)]">
                  {t('projects.members_selected', 'Members ({count} selected)', { count: field.value.length })}
                </label>
                {usersQuery.isLoading ? (
                  <p className="py-2 text-xs text-[var(--muted)]">
                    {t('projects.loading_members', 'Loading members...')}
                  </p>
                ) : (
                  <MemberSelector
                    allUsers={allUsers}
                    selectedIds={field.value}
                    onChange={field.onChange}
                  />
                )}
              </>
            )}
          />
        </div>
      </form>
    </Dialog>
  )
}
