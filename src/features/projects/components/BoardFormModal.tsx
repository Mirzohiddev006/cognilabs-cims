import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useLocale } from '../../../app/hooks/useLocale'
import { Dialog } from '../../../shared/ui/dialog'
import { Button } from '../../../shared/ui/button'
import { Input } from '../../../shared/ui/input'
import { Textarea } from '../../../shared/ui/textarea'
import type { BoardRecord } from '../../../shared/api/services/projects.service'

const boardSchema = z.object({
  name: z.string().min(1, 'Board name is required'),
  description: z.string().default(''),
})

type BoardFormSchema = z.infer<typeof boardSchema>

type BoardFormValues = {
  name: string
  description: string
}

type BoardFormModalProps = {
  open: boolean
  onClose: () => void
  onSubmit: (values: BoardFormValues) => Promise<void>
  initial?: BoardRecord | null
  title: string
  submitLabel: string
  isSubmitting: boolean
}

export function BoardFormModal({
  open,
  onClose,
  onSubmit,
  initial,
  title,
  submitLabel,
  isSubmitting,
}: BoardFormModalProps) {
  const { t } = useLocale()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BoardFormSchema>({
    resolver: zodResolver(boardSchema),
    defaultValues: { name: '', description: '' },
  })

  useEffect(() => {
    if (open) {
      reset(
        initial
          ? { name: initial.name, description: initial.description ?? '' }
          : { name: '', description: '' },
      )
    }
  }, [open, initial, reset])

  async function onValid(data: BoardFormSchema) {
    await onSubmit({
      name: data.name.trim(),
      description: data.description.trim() || (undefined as unknown as string),
    })
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      eyebrow={t('projects.form_eyebrow_boards', 'Boards')}
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
      <form onSubmit={handleSubmit(onValid)} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-strong)]">
            {t('projects.board_name', 'Board Name')} <span className="text-red-400">*</span>
          </label>
          <Input
            {...register('name')}
            aria-invalid={errors.name ? true : undefined}
            placeholder={t('projects.board_name_placeholder', 'Sprint backlog, Design review...')}
            autoFocus
          />
          {errors.name ? (
            <p className="text-xs text-[var(--danger-text)]">{errors.name.message}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-strong)]">
            {t('projects.description', 'Description')}
          </label>
          <Textarea
            {...register('description')}
            placeholder={t('projects.board_description_placeholder', 'What is this board for?')}
            rows={3}
          />
        </div>
      </form>
    </Dialog>
  )
}
