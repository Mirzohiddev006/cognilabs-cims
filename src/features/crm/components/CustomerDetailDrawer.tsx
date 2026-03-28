import { createPortal } from 'react-dom'
import { useEffect, useMemo } from 'react'
import { crmService } from '../../../shared/api/services/crm.service'
import { env } from '../../../shared/config/env'
import type { CustomerSummary } from '../../../shared/api/types'
import { useAsyncData } from '../../../shared/hooks/useAsyncData'
import {
  formatUsernameHandle,
  getCustomerDisplayMeta,
  getCustomerDisplayName,
  getCustomerDisplayPlatform,
} from '../../../shared/lib/customer-display'
import { formatShortDate } from '../../../shared/lib/format'
import { Badge, StatusBadge } from '../../../shared/ui/badge'
import { Button } from '../../../shared/ui/button'
import { Card } from '../../../shared/ui/card'
import { SectionTitle } from '../../../shared/ui/section-title'
import { EmptyStateBlock, ErrorStateBlock, LoadingStateBlock } from '../../../shared/ui/state-block'

export function resolveCustomerAudioUrl(audioFileId?: string | null, audioUrl?: string | null) {
  if (audioUrl) {
    return audioUrl
  }

  if (!audioFileId) {
    return null
  }

  return new URL(`/crm/customers/audio/${audioFileId}`, env.apiBaseUrl).toString()
}

function formatCustomerNotes(notes?: string | null) {
  if (!notes) {
    return []
  }

  const normalizedNotes = notes
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ')

  const segmentedNotes = normalizedNotes
    .replace(/\s+(?=\([^)]+\)\s+\d{1,2}[./]\d{1,2}[./]\d{2,4}\b)/g, '\n\n')
    .replace(
      /\s+(?=\d{1,2}[./]\d{1,2}[./]\d{2,4}\s+\d{1,2}(?::|\.)\d{2}(?:\s?[APMapm]{2})?\s+\([^)]+\)\s+)/g,
      '\n\n',
    )
    .replace(
      /\s+(?=\d{1,2}[./]\d{1,2}[./]\d{2,4}\s+\d{1,2}(?::|\.)\d{2}(?:\s?[APMapm]{2})?\s+[A-ZА-ЯЁ][\p{L}.'-]*(?:\s+[A-ZА-ЯЁ][\p{L}.'-]*){0,2}\s+)/gu,
      '\n\n',
    )
    .replace(
      /\s+(?=\d{1,2}(?::|\.)\d{2}(?:\s?[APMapm]{2})?\s+\d{1,2}[./]\d{1,2}[./]\d{2,4}\s+[A-ZА-ЯЁ][\p{L}.'-]*(?:\s+[A-ZА-ЯЁ][\p{L}.'-]*){0,2}\b)/gu,
      '\n\n',
    )
    .replace(
      /\s+(?=(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{1,2}:\d{2}(?:\s+\([^)]+\))?)/g,
      '\n\n',
    )
    .replace(
      /([.!?])\s+(?=\d{1,2}[./]\d{1,2}[./]\d{2,4}\s+(?:Today|Tomorrow|Yesterday|Call|Called|Need|Meeting|Spoke|Contacted|Lead)\b)/g,
      '$1\n\n',
    )
    .replace(/\n{3,}/g, '\n\n')

  return segmentedNotes
    .split(/\n{2,}/)
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function CustomerAudioPanel({ audioSource }: { audioSource: string }) {
  return (
    <Card className="overflow-hidden rounded-[24px] border-[var(--border)]">
      <div className="border-b border-[var(--border)] px-6 py-5">
        <SectionTitle title="Audio" description="Listen to the customer audio attached to this CRM record." />
      </div>
      <div className="px-6 py-5">
        <div className="rounded-[18px] border border-[var(--border)] bg-[var(--input-surface)] px-4 py-4">
          <audio controls preload="none" src={audioSource} className="w-full">
            Your browser does not support the audio element.
          </audio>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" asChild>
            <a href={audioSource} target="_blank" rel="noreferrer">
              Open audio
            </a>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <a href={audioSource} download>
              Download
            </a>
          </Button>
        </div>
      </div>
    </Card>
  )
}

export function CustomerDetailContent({
  customer,
  audioSource,
}: {
  customer: CustomerSummary
  audioSource: string | null
}) {
  const customerName = getCustomerDisplayName(customer)
  const formattedNotes = formatCustomerNotes(customer.notes)

  return (
    <section className="space-y-5">
      <Card variant="glass" noPadding className="overflow-hidden rounded-[28px] border-[var(--border)]">
        <div className="relative overflow-hidden px-6 py-6 sm:px-7">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_34%),radial-gradient(circle_at_right,rgba(168,85,247,0.12),transparent_28%)]" />

          <div className="relative z-10 flex flex-col gap-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--blue-text)]">CRM / Customer</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-[2rem]">
                  {customerName}
                </h2>
                <p className="mt-2 text-sm text-[var(--muted-strong)]">
                  {getCustomerDisplayMeta(customer)}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <StatusBadge status={customer.status} />
                  {customer.assistant_name ? <Badge variant="violet">{customer.assistant_name}</Badge> : null}
                  {customer.conversation_language ? <Badge variant="outline">{customer.conversation_language}</Badge> : null}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {audioSource ? (
                  <Button variant="secondary" size="sm" asChild>
                    <a href={audioSource} target="_blank" rel="noreferrer">
                      Open audio
                    </a>
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[20px] border border-blue-500/16 bg-blue-500/[0.08] px-4 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">Platform</p>
                <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">{getCustomerDisplayPlatform(customer) || '-'}</p>
              </div>
              <div className="rounded-[20px] border border-violet-500/16 bg-violet-500/[0.08] px-4 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">Username</p>
                <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">{formatUsernameHandle(customer.username) || '-'}</p>
              </div>
              <div className="rounded-[20px] border border-emerald-500/16 bg-emerald-500/[0.08] px-4 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">Recall</p>
                <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">{customer.recall_time ? formatShortDate(customer.recall_time) : '-'}</p>
              </div>
              <div className="rounded-[20px] border border-amber-500/16 bg-amber-500/[0.08] px-4 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">Created</p>
                <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">{formatShortDate(customer.created_at)}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="overflow-hidden rounded-[24px] border-[var(--border)]">
          <div className="border-b border-[var(--border)] px-6 py-5">
            <SectionTitle title="Profile" description="Core contact and routing metadata returned by the CRM detail endpoint." />
          </div>
          <div className="grid gap-3 px-6 py-5">
            {[
              ['Phone', customer.phone_number ?? customer.phone ?? '-'],
              ['Platform', getCustomerDisplayPlatform(customer) || '-'],
              ['Audio file ID', customer.audio_file_id || '-'],
              ['Assistant', customer.assistant_name || '-'],
              ['Conversation language', customer.conversation_language || '-'],
              ['Recall time', customer.recall_time || '-'],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-4 rounded-[18px] border border-[var(--border)] bg-[var(--input-surface)] px-4 py-3">
                <span className="text-sm text-[var(--muted-strong)]">{label}</span>
                <span className="text-right text-sm font-semibold text-[var(--foreground)]">{value}</span>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid gap-5">
          {audioSource ? <CustomerAudioPanel audioSource={audioSource} /> : null}

          <Card className="overflow-hidden rounded-[24px] border-[var(--border)]">
            <div className="border-b border-[var(--border)] px-6 py-5">
              <SectionTitle title="Notes" description="Operator notes attached to the customer record." />
            </div>
            <div className="px-6 py-5">
              {formattedNotes.length > 0 ? (
                <div className="space-y-4">
                  {formattedNotes.map((note, index) => (
                    <p key={`${customer.id}-note-${index}`} className="whitespace-pre-wrap text-sm leading-6 text-[var(--muted-strong)]">
                      {note}
                    </p>
                  ))}
                </div>
              ) : (
                <EmptyStateBlock eyebrow="Notes" title="No notes" description="There are no notes for this customer." />
              )}
            </div>
          </Card>

          <Card className="overflow-hidden rounded-[24px] border-[var(--border)]">
            <div className="border-b border-[var(--border)] px-6 py-5">
              <SectionTitle title="AI Summary" description="CRM-generated summary snapshot for faster context recovery." />
            </div>
            <div className="px-6 py-5">
              {customer.aisummary ? (
                <p className="whitespace-pre-wrap text-sm leading-6 text-[var(--muted-strong)]">{customer.aisummary}</p>
              ) : (
                <EmptyStateBlock eyebrow="AI" title="No AI summary" description="AI summary is not available for this record." />
              )}
            </div>
          </Card>
        </div>
      </div>
    </section>
  )
}

export function CustomerDetailDrawer({
  open,
  customerId,
  initialCustomer,
  onClose,
}: {
  open: boolean
  customerId?: number | null
  initialCustomer?: CustomerSummary | null
  onClose: () => void
}) {
  const detailQuery = useAsyncData(
    () => crmService.detail(customerId ?? 0),
    [customerId, open],
    { enabled: open && Boolean(customerId && customerId > 0) },
  )

  useEffect(() => {
    if (!open) {
      return
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose, open])

  const customer = detailQuery.data?.id === customerId ? detailQuery.data : initialCustomer ?? null
  const audioSource = useMemo(
    () => resolveCustomerAudioUrl(customer?.audio_file_id, customer?.audio_url),
    [customer?.audio_file_id, customer?.audio_url],
  )

  if (!open) {
    return null
  }

  return createPortal(
    <div className="fixed inset-0 z-[90]">
      <button
        type="button"
        aria-label="Close customer detail drawer"
        className="absolute inset-0 bg-[radial-gradient(circle_at_left,rgba(59,130,246,0.10),transparent_24%),rgba(0,0,0,0.62)] backdrop-blur-md"
        onClick={onClose}
      />

      <div className="absolute inset-y-0 right-0 w-full md:w-[min(50vw,760px)]">
        <div className="sheet-enter flex h-full flex-col border-l border-[var(--border)] bg-[var(--surface-elevated)] shadow-[0_20px_80px_rgba(0,0,0,0.46)]">
          <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] px-5 py-4 sm:px-6">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--blue-text)]">CRM drawer</p>
              <h2 className="mt-1 truncate text-lg font-semibold tracking-tight text-[var(--foreground)]">
                {customer ? getCustomerDisplayName(customer) : 'Customer detail'}
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--input-surface)] text-[var(--muted-strong)] transition hover:border-[var(--border-hover)] hover:bg-[var(--input-surface-hover)] hover:text-[var(--foreground)]"
              aria-label="Close detail drawer"
            >
              <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M4 4l8 8M12 4 4 12" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
            {detailQuery.isLoading && !customer ? (
              <LoadingStateBlock
                eyebrow="CRM / Detail"
                title="Customer detail loading"
                description="Preparing the right-side CRM detail drawer."
              />
            ) : detailQuery.isError && !customer ? (
              <ErrorStateBlock
                eyebrow="CRM / Detail"
                title="Customer detail unavailable"
                description="The CRM detail endpoint could not return this customer."
                actionLabel="Retry"
                onAction={() => {
                  void detailQuery.refetch()
                }}
              />
            ) : customer ? (
              <CustomerDetailContent customer={customer} audioSource={audioSource} />
            ) : (
              <EmptyStateBlock
                eyebrow="CRM / Detail"
                title="No customer selected"
                description="Pick a CRM row to inspect the customer on the right side."
              />
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
