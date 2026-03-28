import { Button } from '../../../shared/ui/button'
import { Input } from '../../../shared/ui/input'
import { Modal } from '../../../shared/ui/modal'

export type CompanyPaymentFormValues = {
  title: string
  amount: number
  paymentDay: number
  paymentTime: string
  note: string
  isActive: boolean
}

type CompanyPaymentFormModalProps = {
  open: boolean
  mode: 'create' | 'edit'
  values: CompanyPaymentFormValues
  onClose: () => void
  onChange: (field: keyof CompanyPaymentFormValues, value: string | number | boolean) => void
  onSubmit: () => void
  isSubmitting: boolean
}

export function CompanyPaymentFormModal({
  open,
  mode,
  values,
  onClose,
  onChange,
  onSubmit,
  isSubmitting,
}: CompanyPaymentFormModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === 'create' ? 'Recurring payment yaratish' : 'Recurring paymentni tahrirlash'}
      description="Company recurring payment reminder CRUD form."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Saqlanmoqda...' : mode === 'create' ? 'Create reminder' : 'Save reminder'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <label className="grid gap-2">
          <span className="text-xs font-medium text-[var(--foreground)]">Title</span>
          <Input value={values.title} onChange={(event) => onChange('title', event.target.value)} />
        </label>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="grid gap-2">
            <span className="text-xs font-medium text-[var(--foreground)]">Amount</span>
            <Input
              type="number"
              min="0"
              value={values.amount}
              onChange={(event) => onChange('amount', Number(event.target.value))}
            />
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-medium text-[var(--foreground)]">Payment day</span>
            <Input
              type="number"
              min="1"
              max="31"
              value={values.paymentDay}
              onChange={(event) => onChange('paymentDay', Number(event.target.value))}
            />
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-medium text-[var(--foreground)]">Payment time</span>
            <Input
              type="time"
              value={values.paymentTime}
              onChange={(event) => onChange('paymentTime', event.target.value)}
            />
          </label>
        </div>

        <label className="grid gap-2">
          <span className="text-xs font-medium text-[var(--foreground)]">Note</span>
          <textarea
            value={values.note}
            onChange={(event) => onChange('note', event.target.value)}
            rows={4}
            className="min-h-24 rounded-[20px] border border-[var(--border)] bg-[var(--input-surface)] px-4 py-3 text-sm text-[var(--foreground)] shadow-[inset_0_1px_2px_rgba(0,0,0,0.12)] outline-none transition focus:border-[var(--border-hover)] focus:bg-[var(--input-surface-hover)]"
          />
        </label>

        <label className="flex items-center gap-3 rounded-[20px] border border-[var(--border)] bg-[var(--input-surface)] px-4 py-3 shadow-[inset_0_1px_2px_rgba(0,0,0,0.12)] transition hover:border-[var(--border-hover)] hover:bg-[var(--input-surface-hover)]">
          <input
            type="checkbox"
            checked={values.isActive}
            onChange={(event) => onChange('isActive', event.target.checked)}
            className="h-4 w-4 rounded border border-[var(--border)] accent-blue-500 dark:border-white/10"
          />
          <span className="text-xs text-[var(--muted-strong)]">Reminder active</span>
        </label>
      </div>
    </Modal>
  )
}
