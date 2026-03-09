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
      title={isBroadcast ? 'Broadcast message to all users' : 'Send message to selected user'}
      description={
        isBroadcast
          ? 'The CEO broadcast form is connected to the send-message-all endpoint.'
          : 'The single user message form is connected to the send-message endpoint.'
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Sending...' : 'Send message'}
          </Button>
        </>
      }
    >
      {!isBroadcast ? (
        <div className="rounded-xl border border-[var(--border)] bg-white/5 px-4 py-3 text-sm text-[var(--muted)]">
          Receiver: <span className="font-bold text-white ml-2">{values.receiver_label}</span>
        </div>
      ) : null}
      <div className="mt-4 grid gap-4">
        <label className="grid gap-2">
          <span className="text-sm font-bold text-white tracking-tight">Subject</span>
          <Input value={values.subject} placeholder="Enter message subject" onChange={(event) => onChange('subject', event.target.value)} />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-bold text-white tracking-tight">Body</span>
          <textarea
            rows={7}
            value={values.body}
            placeholder="Enter message body"
            onChange={(event) => onChange('body', event.target.value)}
            className="w-full rounded-2xl border border-[var(--border)] bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500/50"
          />
        </label>
      </div>
    </Modal>
  )
}
