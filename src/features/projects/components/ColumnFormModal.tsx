import { useEffect, useState } from 'react'
import { Dialog } from '../../../shared/ui/dialog'
import { Button } from '../../../shared/ui/button'
import { Input } from '../../../shared/ui/input'
import { cn } from '../../../shared/lib/cn'
import type { ColumnRecord } from '../../../shared/api/services/projects.service'
import { COLUMN_COLORS } from '../lib/format'

type ColumnFormValues = {
  name: string
  color: string
}

type ColumnFormModalProps = {
  open: boolean
  onClose: () => void
  onSubmit: (values: ColumnFormValues) => Promise<void>
  initial?: ColumnRecord | null
  title: string
  submitLabel: string
  isSubmitting: boolean
}

const empty: ColumnFormValues = { name: '', color: COLUMN_COLORS[0].value }

export function ColumnFormModal({
  open,
  onClose,
  onSubmit,
  initial,
  title,
  submitLabel,
  isSubmitting,
}: ColumnFormModalProps) {
  const [values, setValues] = useState<ColumnFormValues>(empty)
  const [nameError, setNameError] = useState('')

  useEffect(() => {
    if (open) {
      setValues(
        initial
          ? { name: initial.name, color: initial.color ?? COLUMN_COLORS[0].value }
          : empty,
      )
      setNameError('')
    }
  }, [open, initial])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!values.name.trim()) {
      setNameError('Column name is required')
      return
    }
    await onSubmit({ name: values.name.trim(), color: values.color })
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      eyebrow="Columns"
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
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[var(--muted-strong)] uppercase tracking-wide">
            Column Name <span className="text-red-400">*</span>
          </label>
          <Input
            value={values.name}
            onChange={(e) => {
              setValues((p) => ({ ...p, name: e.target.value }))
              setNameError('')
            }}
            placeholder="To Do, In Progress, Done…"
            autoFocus
          />
          {nameError && <p className="text-xs text-[var(--danger-text)]">{nameError}</p>}
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-[var(--muted-strong)] uppercase tracking-wide">
            Accent Color
          </label>
          <div className="flex flex-wrap gap-2">
            {COLUMN_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                title={c.label}
                onClick={() => setValues((p) => ({ ...p, color: c.value }))}
                className={cn(
                  'h-8 w-8 rounded-full border-2 transition-transform hover:scale-110',
                  values.color === c.value
                    ? 'border-white scale-110'
                    : 'border-transparent',
                )}
                style={{ background: c.value }}
              />
            ))}
          </div>
          {/* Preview strip */}
          <div
            className="h-1 w-full rounded-full opacity-70"
            style={{ background: values.color }}
          />
        </div>
      </form>
    </Dialog>
  )
}
