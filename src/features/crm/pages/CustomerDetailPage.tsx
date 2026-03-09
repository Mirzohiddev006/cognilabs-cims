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
        eyebrow="CRM detail"
        title="Noto'g'ri customer ID"
        description="Route ichidagi customer identifikatori yaroqsiz."
        actionLabel="Back to CRM"
        onAction={() => navigate('/crm')}
      />
    )
  }

  if (detailQuery.isLoading && !detailQuery.data) {
    return (
      <LoadingStateBlock
        eyebrow="CRM detail"
        title="Customer detail yuklanmoqda"
        description="Customer haqida batafsil ma'lumotlar olinmoqda."
      />
    )
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <ErrorStateBlock
        eyebrow="CRM detail"
        title="Customer topilmadi"
        description="Bitta mijoz detail endpointi ma'lumot qaytarmadi yoki xato berdi."
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
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-[var(--muted)]">CRM detail</p>
          <h1 className="mt-2 text-4xl font-semibold text-[var(--foreground)]">{customer.full_name}</h1>
          <p className="mt-3 text-sm text-[var(--muted-strong)]">
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
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Status</p>
          <div className="mt-3">
            <Badge>{customer.status}</Badge>
          </div>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Assistant</p>
          <p className="mt-3 text-lg font-semibold text-[var(--foreground)]">{customer.assistant_name || '-'}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Language</p>
          <p className="mt-3 text-lg font-semibold text-[var(--foreground)]">{customer.conversation_language || '-'}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Created</p>
          <p className="mt-3 text-lg font-semibold text-[var(--foreground)]">{formatShortDate(customer.created_at)}</p>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-[var(--foreground)]">Profile</h2>
          <div className="mt-5 grid gap-4">
            {[
              ['Username', customer.username || '-'],
              ['Phone', customer.phone_number],
              ['Platform', customer.platform],
              ['Audio file ID', customer.audio_file_id || '-'],
              ['Recall time', customer.recall_time || '-'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-[var(--border)] bg-[var(--accent-soft)]/40 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">{label}</p>
                <p className="mt-2 text-sm text-[var(--foreground)]">{value}</p>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid gap-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-[var(--foreground)]">Notes</h2>
            {customer.notes ? (
              <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[var(--muted-strong)]">{customer.notes}</p>
            ) : (
              <EmptyStateBlock eyebrow="Notes" title="Notes yo'q" description="Mijoz uchun notes kiritilmagan." />
            )}
          </Card>
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-[var(--foreground)]">AI summary</h2>
            {customer.aisummary ? (
              <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[var(--muted-strong)]">
                {customer.aisummary}
              </p>
            ) : (
              <EmptyStateBlock eyebrow="AI" title="AI summary yo'q" description="AI summary hali mavjud emas." />
            )}
          </Card>
        </div>
      </div>
    </section>
  )
}
