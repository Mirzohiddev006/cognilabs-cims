import { Button } from '../../../shared/ui/button'
import { Input } from '../../../shared/ui/input'
import { Modal } from '../../../shared/ui/modal'

export type MessageComposerValues = {
  receiver_id?: number
  receiver_label?: string
  subject: string
  body: string
}

type MessageComposerModalProps = {
  open: boolean
  onClose: () => void
  values: MessageComposerValues
  isBroadcast?: boolean
  isSubmitting: boolean
  onChange: (field: keyof MessageComposerValues, value: string | number | undefined) => void
  onSubmit: () => void
}

export function MessageComposerModal({
  open,
  onClose,
  values,
  isBroadcast = false,
  isSubmitting,
  onChange,
  onSubmit,
}: MessageComposerModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isBroadcast ? 'Barcha userlarga xabar yuborish' : 'Tanlangan userga xabar yuborish'}
      description={
        isBroadcast
          ? 'CEO broadcast formi send-message-all endpoint bilan bog`lanadi.'
          : 'Single user message formi send-message endpoint bilan bog`lanadi.'
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Yuborilmoqda...' : 'Send message'}
          </Button>
        </>
      }
    >
      {!isBroadcast ? (
        <div className="rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 text-sm text-[var(--muted-strong)]">
          Receiver: <span className="font-medium text-[var(--foreground)]">{values.receiver_label}</span>
        </div>
      ) : null}
      <div className="mt-4 grid gap-4">
        <label className="grid gap-2">
          <span className="text-sm font-medium text-[var(--foreground)]">Subject</span>
          <Input value={values.subject} onChange={(event) => onChange('subject', event.target.value)} />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-medium text-[var(--foreground)]">Body</span>
          <textarea
            rows={7}
            value={values.body}
            onChange={(event) => onChange('body', event.target.value)}
            className="w-full rounded-[24px] border border-[var(--border)] bg-white/80 px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
          />
        </label>
      </div>
    </Modal>
  )
}
