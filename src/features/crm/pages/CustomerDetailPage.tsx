import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { crmService } from '../../../shared/api/services/crm.service'
import { env } from '../../../shared/config/env'
import { useAsyncData } from '../../../shared/hooks/useAsyncData'
import { formatUsernameHandle, getCustomerDisplayName, getCustomerDisplayPlatform } from '../../../shared/lib/customer-display'
import { formatShortDate } from '../../../shared/lib/format'
import { Badge } from '../../../shared/ui/badge'
import { Button } from '../../../shared/ui/button'
import { Card } from '../../../shared/ui/card'
import { PageHeader } from '../../../shared/ui/page-header'
import { SectionTitle } from '../../../shared/ui/section-title'
import { EmptyStateBlock, ErrorStateBlock, LoadingStateBlock } from '../../../shared/ui/state-block'

function resolveAudioUrl(audioFileId?: string | null, audioUrl?: string | null) {
  if (audioUrl) {
    return audioUrl
  }

  if (!audioFileId) {
    return null
  }

  return new URL(`/crm/customers/audio/${audioFileId}`, env.apiBaseUrl).toString()
}

export function CustomerDetailPage() {
  const navigate = useNavigate()
  const params = useParams()
  const customerId = Number(params.customerId)

  const detailQuery = useAsyncData(
    () => crmService.detail(customerId),
    [customerId],
    { enabled: Number.isFinite(customerId) && customerId > 0 },
  )

  const audioSource = useMemo(() => {
    return resolveAudioUrl(detailQuery.data?.audio_file_id, detailQuery.data?.audio_url)
  }, [detailQuery.data?.audio_file_id, detailQuery.data?.audio_url])

  if (!Number.isFinite(customerId) || customerId <= 0) {
    return (
      <ErrorStateBlock
        eyebrow="CRM / Detail"
        title="Invalid Customer ID"
        description="The customer identifier in the route is invalid."
        actionLabel="Back to CRM"
        onAction={() => navigate('/crm')}
      />
    )
  }

  if (detailQuery.isLoading && !detailQuery.data) {
    return (
      <LoadingStateBlock
        eyebrow="CRM / Detail"
        title="Customer profile loading"
        description="Retrieving comprehensive customer details."
      />
    )
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <ErrorStateBlock
        eyebrow="CRM / Detail"
        title="Customer not found"
        description="Could not retrieve details for this customer."
        actionLabel="Back to CRM"
        onAction={() => navigate('/crm')}
      />
    )
  }

  const customer = detailQuery.data
  const customerName = getCustomerDisplayName(customer)

  return (
    <section className="space-y-6">
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/crm')}
          className="min-h-8 rounded-xl border border-white/8 bg-white/[0.03] px-3 text-[11px] text-white/78 hover:border-white/12 hover:bg-white/[0.05] hover:text-white"
        >
          <svg viewBox="0 0 16 16" className="mr-1.5 h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M10 3.5 5.5 8 10 12.5" />
          </svg>
          Back to CRM
        </Button>
      </div>

      <PageHeader
        eyebrow="CRM / Detail"
        title={customerName}
        actions={
          <>
            {audioSource ? (
              <Button asChild>
                <a href={audioSource} target="_blank" rel="noreferrer">
                  Open audio
                </a>
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card variant="metric" className="flex min-h-30 flex-col justify-between border-blue-500/15 p-4 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.10),0_0_20px_rgba(59,130,246,0.06)]">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-blue-400/75">Status</p>
          <Badge className="mt-3 self-start bg-white/10 text-white border-white/20">{customer.status}</Badge>
        </Card>
        <Card variant="metric" className="flex min-h-30 flex-col justify-between border-violet-500/15 p-4 shadow-[inset_0_0_0_1px_rgba(139,92,246,0.10),0_0_20px_rgba(139,92,246,0.05)]">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-violet-400/75">Assistant</p>
          <p className="mt-3 text-xl font-semibold text-white tracking-tight">{customer.assistant_name || '-'}</p>
        </Card>
        <Card variant="metric" className="flex min-h-30 flex-col justify-between border-emerald-500/15 p-4 shadow-[inset_0_0_0_1px_rgba(34,197,94,0.10),0_0_20px_rgba(34,197,94,0.05)]">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-emerald-400/75">Language</p>
          <p className="mt-3 text-xl font-semibold text-white tracking-tight">{customer.conversation_language || '-'}</p>
        </Card>
        <Card variant="metric" className="flex min-h-30 flex-col justify-between border-amber-500/15 p-4 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.10),0_0_20px_rgba(245,158,11,0.05)]">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-amber-400/75">Created</p>
          <p className="mt-3 text-xl font-semibold text-white tracking-tight">{formatShortDate(customer.created_at)}</p>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="overflow-hidden">
          <div className="border-b border-(--border) px-6 py-6">
            <SectionTitle title="Profile" />
          </div>
          <div className="grid gap-3 px-6 py-5">
            {[
              ['Username', formatUsernameHandle(customer.username) || '-'],
              ['Phone', customer.phone_number ?? customer.phone ?? '-'],
              ['Platform', getCustomerDisplayPlatform(customer) || '-'],
              ['Audio file ID', customer.audio_file_id || '-'],
              ['Recall time', customer.recall_time || '-'],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-4 rounded-xl border border-(--border) bg-(--surface) px-4 py-3">
                <span className="text-sm text-(--muted-strong)">{label}</span>
                <span className="text-sm font-semibold text-white text-right">{value}</span>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid gap-6">
          <Card className="overflow-hidden">
            <div className="border-b border-(--border) px-6 py-6">
              <SectionTitle title="Notes" />
            </div>
            <div className="px-6 py-5">
              {customer.notes ? (
                <p className="whitespace-pre-wrap text-sm leading-6 text-(--muted-strong)">{customer.notes}</p>
              ) : (
                <EmptyStateBlock eyebrow="Notes" title="No notes" description="There are no notes for this customer." />
              )}
            </div>
          </Card>
          <Card className="overflow-hidden">
            <div className="border-b border-(--border) px-6 py-6">
              <SectionTitle title="AI Summary" />
            </div>
            <div className="px-6 py-5">
              {customer.aisummary ? (
                <p className="whitespace-pre-wrap text-sm leading-6 text-(--muted-strong)">{customer.aisummary}</p>
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
