import { useEffect, useMemo } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useLocale } from '../../../app/hooks/useLocale'
import { Dialog } from '../../../shared/ui/dialog'
import { Button } from '../../../shared/ui/button'
import { Input } from '../../../shared/ui/input'
import { cn } from '../../../shared/lib/cn'
import type { ColumnRecord } from '../../../shared/api/services/projects.service'
import { getColumnColors } from '../lib/format'

const columnSchema = z.object({
  name: z.string().min(1, 'Column name is required'),
  color: z.string().min(1),
})

type ColumnFormSchema = z.infer<typeof columnSchema>

type ColumnFormModalProps = {
  open: boolean
  onClose: () => void
  onSubmit: (values: ColumnFormSchema) => Promise<void>
  initial?: ColumnRecord | null
  title: string
  submitLabel: string
  isSubmitting: boolean
}

export function ColumnFormModal({
  open,
  onClose,
  onSubmit,
  initial,
  title,
  submitLabel,
  isSubmitting,
}: ColumnFormModalProps) {
  const { t } = useLocale()
  const columnColors = useMemo(() => getColumnColors(), [])
  const defaultColor = columnColors[0]?.value ?? '#3b82f6'

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors },
  } = useForm<ColumnFormSchema>({
    resolver: zodResolver(columnSchema),
    defaultValues: { name: '', color: defaultColor },
  })

  const currentColor = watch('color')

  useEffect(() => {
    if (open) {
      reset(
        initial
          ? { name: initial.name, color: initial.color ?? defaultColor }
          : { name: '', color: defaultColor },
      )
    }
  }, [open, initial, reset, defaultColor])

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      eyebrow={t('projects.form_eyebrow_columns', 'Columns')}
      footer={(
        <>
          <Button variant="ghost" size="md" onClick={onClose} disabled={isSubmitting}>
            {t('projects.cancel', 'Cancel')}
          </Button>
          <Button
            variant="primary"
            size="md"
            loading={isSubmitting}
            onClick={() => void handleSubmit(onSubmit)()}
          >
            {submitLabel}
          </Button>
        </>
      )}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-strong)]">
            {t('projects.column_name', 'Column Name')} <span className="text-red-400">*</span>
          </label>
          <Input
            {...register('name')}
            aria-invalid={errors.name ? true : undefined}
            placeholder={t('projects.column_name_placeholder', 'To Do, In Progress, Done...')}
            autoFocus
          />
          {errors.name ? (
            <p className="text-xs text-[var(--danger-text)]">{errors.name.message}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-strong)]">
            {t('projects.accent_color', 'Accent Color')}
          </label>
          <Controller
            control={control}
            name="color"
            render={({ field }) => (
              <div className="flex flex-wrap gap-2">
                {columnColors.map((colorOption) => (
                  <button
                    key={colorOption.value}
                    type="button"
                    title={colorOption.label}
                    onClick={() => field.onChange(colorOption.value)}
                    className={cn(
                      'h-8 w-8 rounded-full border-2 transition-transform hover:scale-110',
                      field.value === colorOption.value
                        ? 'scale-110 border-white'
                        : 'border-transparent',
                    )}
                    style={{ background: colorOption.value }}
                  />
                ))}
              </div>
            )}
          />

          <div
            className="h-1 w-full rounded-full opacity-70"
            style={{ background: currentColor }}
          />
        </div>
      </form>
    </Dialog>
  )
}
