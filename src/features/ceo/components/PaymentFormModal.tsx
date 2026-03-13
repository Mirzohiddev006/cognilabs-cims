import { Button } from '../../../shared/ui/button'
import { Input } from '../../../shared/ui/input'
import { Modal } from '../../../shared/ui/modal'

export type PaymentFormValues = {
  project: string
  date: string
  summ: number
  payment: boolean
}

type PaymentFormModalProps = {
  open: boolean
  mode: 'create' | 'edit'
  values: PaymentFormValues
  onClose: () => void
  onChange: (field: keyof PaymentFormValues, value: string | number | boolean) => void
  onSubmit: () => void
  isSubmitting: boolean
}

export function PaymentFormModal({
  open,
  mode,
  values,
  onClose,
  onChange,
  onSubmit,
  isSubmitting,
}: PaymentFormModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === 'create' ? "Yangi to'lov yaratish" : "To'lovni tahrirlash"}
      description="CEO payments moduli create/edit flow uchun umumiy modal."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Saqlanmoqda...' : mode === 'create' ? 'Create payment' : 'Save payment'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <label className="grid gap-2">
          <span className="text-xs font-medium text-[var(--foreground)]">Project</span>
          <Input value={values.project} onChange={(event) => onChange('project', event.target.value)} />
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-xs font-medium text-[var(--foreground)]">Date</span>
            <Input type="date" value={values.date} onChange={(event) => onChange('date', event.target.value)} />
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-medium text-[var(--foreground)]">Amount</span>
            <Input
              type="number"
              min="0"
              value={values.summ}
              onChange={(event) => onChange('summ', Number(event.target.value))}
            />
          </label>
        </div>
        <label className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-white/5 px-4 py-2.5">
          <input
            type="checkbox"
            checked={values.payment}
            onChange={(event) => onChange('payment', event.target.checked)}
          />
          <span className="text-xs text-[var(--muted-strong)]">Already paid</span>
        </label>
      </div>
    </Modal>
  )
}
