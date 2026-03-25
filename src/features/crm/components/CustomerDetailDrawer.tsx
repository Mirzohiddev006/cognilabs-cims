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

export function CustomerDetailContent({
  customer,
  audioSource,
}: {
  customer: CustomerSummary
  audioSource: string | null
}) {
  const customerName = getCustomerDisplayName(customer)

  return (
    <section className="space-y-5">
      <Card variant="glass" noPadding className="overflow-hidden rounded-[28px] border-white/10">
        <div className="relative overflow-hidden px-6 py-6 sm:px-7">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_34%),radial-gradient(circle_at_right,rgba(168,85,247,0.12),transparent_28%)]" />

          <div className="relative z-10 flex flex-col gap-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-blue-300/72">CRM / Customer</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-[2rem]">
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
                  <Button asChild>
                    <a href={audioSource} target="_blank" rel="noreferrer">
                      Open audio
                    </a>
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[20px] border border-blue-500/16 bg-blue-500/[0.08] px-4 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-blue-200/72">Platform</p>
                <p className="mt-2 text-lg font-semibold text-white">{getCustomerDisplayPlatform(customer) || '-'}</p>
              </div>
              <div className="rounded-[20px] border border-violet-500/16 bg-violet-500/[0.08] px-4 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-violet-200/72">Username</p>
                <p className="mt-2 text-lg font-semibold text-white">{formatUsernameHandle(customer.username) || '-'}</p>
              </div>
              <div className="rounded-[20px] border border-emerald-500/16 bg-emerald-500/[0.08] px-4 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-200/72">Recall</p>
                <p className="mt-2 text-lg font-semibold text-white">{customer.recall_time ? formatShortDate(customer.recall_time) : '-'}</p>
              </div>
              <div className="rounded-[20px] border border-amber-500/16 bg-amber-500/[0.08] px-4 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-200/72">Created</p>
                <p className="mt-2 text-lg font-semibold text-white">{formatShortDate(customer.created_at)}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="overflow-hidden rounded-[24px] border-white/10">
          <div className="border-b border-(--border) px-6 py-5">
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
              <div key={label} className="flex items-center justify-between gap-4 rounded-[18px] border border-white/8 bg-black/12 px-4 py-3">
                <span className="text-sm text-[var(--muted-strong)]">{label}</span>
                <span className="text-right text-sm font-semibold text-white">{value}</span>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid gap-5">
          <Card className="overflow-hidden rounded-[24px] border-white/10">
            <div className="border-b border-(--border) px-6 py-5">
              <SectionTitle title="Notes" description="Operator notes attached to the customer record." />
            </div>
            <div className="px-6 py-5">
              {customer.notes ? (
                <p className="whitespace-pre-wrap text-sm leading-6 text-[var(--muted-strong)]">{customer.notes}</p>
              ) : (
                <EmptyStateBlock eyebrow="Notes" title="No notes" description="There are no notes for this customer." />
              )}
            </div>
          </Card>

          <Card className="overflow-hidden rounded-[24px] border-white/10">
            <div className="border-b border-(--border) px-6 py-5">
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
    [customerId, open, initialCustomer?.created_at ?? ''],
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

  const customer = detailQuery.data ?? initialCustomer ?? null
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
        <div className="sheet-enter flex h-full flex-col border-l border-white/10 bg-[linear-gradient(180deg,rgba(10,12,18,0.98),rgba(8,9,14,1))] shadow-[0_20px_80px_rgba(0,0,0,0.46)]">
          <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-6">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-blue-300/72">CRM drawer</p>
              <h2 className="mt-1 truncate text-lg font-semibold tracking-tight text-white">
                {customer ? getCustomerDisplayName(customer) : 'Customer detail'}
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-white/72 transition hover:border-white/16 hover:bg-white/[0.06] hover:text-white"
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
