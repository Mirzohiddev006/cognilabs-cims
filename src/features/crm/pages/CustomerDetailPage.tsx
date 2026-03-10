import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { crmService } from '../../../shared/api/services/crm.service'
import { env } from '../../../shared/config/env'
import { useAsyncData } from '../../../shared/hooks/useAsyncData'
import { formatShortDate } from '../../../shared/lib/format'
import { Badge } from '../../../shared/ui/badge'
import { Button } from '../../../shared/ui/button'
import { Card } from '../../../shared/ui/card'
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

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">CRM / Detail</p>
          <h1 className="mt-2 text-3xl font-semibold text-white tracking-tight">{customer.full_name}</h1>
          <p className="mt-3 text-sm text-zinc-500">
            {customer.platform} | {customer.phone_number}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => navigate('/crm')}>
            Back to CRM
          </Button>
          {audioSource ? (
            <Button asChild>
              <a href={audioSource} target="_blank" rel="noreferrer">
                Open audio
              </a>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="flex min-h-[140px] flex-col justify-between p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#3b82f6]">Status</p>
          <div className="mt-3">
            <Badge className="bg-white/10 text-white border-white/20">{customer.status}</Badge>
          </div>
        </Card>
        <Card className="flex min-h-[140px] flex-col justify-between p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#3b82f6]">Assistant</p>
          <p className="mt-5 text-[1.5rem] font-semibold text-white tracking-tight">{customer.assistant_name || '-'}</p>
        </Card>
        <Card className="flex min-h-[140px] flex-col justify-between p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#3b82f6]">Language</p>
          <p className="mt-5 text-[1.5rem] font-semibold text-white tracking-tight">{customer.conversation_language || '-'}</p>
        </Card>
        <Card className="flex min-h-[140px] flex-col justify-between p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#3b82f6]">Created</p>
          <p className="mt-5 text-[1.5rem] font-semibold text-white tracking-tight">{formatShortDate(customer.created_at)}</p>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-white tracking-tight">Profile</h2>
          <div className="mt-5 grid gap-4">
            {[
              ['Username', customer.username || '-'],
              ['Phone', customer.phone_number],
              ['Platform', customer.platform],
              ['Audio file ID', customer.audio_file_id || '-'],
              ['Recall time', customer.recall_time || '-'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[18px] border border-white/10 bg-[var(--surface)] px-5 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#3b82f6]">{label}</p>
                <p className="mt-3 text-sm text-white">{value}</p>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid gap-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-white tracking-tight">Notes</h2>
            {customer.notes ? (
              <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-zinc-400">{customer.notes}</p>
            ) : (
              <EmptyStateBlock eyebrow="Notes" title="No notes" description="There are no notes for this customer." />
            )}
          </Card>
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-white tracking-tight">AI Summary</h2>
            {customer.aisummary ? (
              <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-zinc-400">
                {customer.aisummary}
              </p>
            ) : (
              <EmptyStateBlock eyebrow="AI" title="No AI summary" description="AI summary is not available for this record." />
            )}
          </Card>
        </div>
      </div>
    </section>
  )
}
