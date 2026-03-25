import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { crmService } from '../../../shared/api/services/crm.service'
import { useAsyncData } from '../../../shared/hooks/useAsyncData'
import { Button } from '../../../shared/ui/button'
import { ErrorStateBlock, LoadingStateBlock } from '../../../shared/ui/state-block'
import { CustomerDetailContent, resolveCustomerAudioUrl } from '../components/CustomerDetailDrawer'

export function CustomerDetailPage() {
  const navigate = useNavigate()
  const params = useParams()
  const customerId = Number(params.customerId)

  const detailQuery = useAsyncData(
    () => crmService.detail(customerId),
    [customerId],
    { enabled: Number.isFinite(customerId) && customerId > 0 },
  )

  const audioSource = useMemo(
    () => resolveCustomerAudioUrl(detailQuery.data?.audio_file_id, detailQuery.data?.audio_url),
    [detailQuery.data?.audio_file_id, detailQuery.data?.audio_url],
  )

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

  return (
    <section className="space-y-6 page-enter">
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

      <CustomerDetailContent customer={detailQuery.data} audioSource={audioSource} />
    </section>
  )
}
