import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ceoService, type CeoMessageRecord, type CompanyPaymentRecord } from '../../../shared/api/services/ceo.service'
import { crmService } from '../../../shared/api/services/crm.service'
import type { PaymentItem } from '../../../shared/api/types'
import { useAsyncData } from '../../../shared/hooks/useAsyncData'
import { useConfirm } from '../../../shared/confirm/useConfirm'
import { formatCurrency, formatShortDate } from '../../../shared/lib/format'
import { useToast } from '../../../shared/toast/useToast'
import { Badge } from '../../../shared/ui/badge'
import { Button } from '../../../shared/ui/button'
import { Card } from '../../../shared/ui/card'
import { ActionsMenu } from '../../../shared/ui/actions-menu'
import { DataTable } from '../../../shared/ui/data-table'
import { PageHeader } from '../../../shared/ui/page-header'
import { SectionTitle } from '../../../shared/ui/section-title'
import { EmptyStateBlock, ErrorStateBlock, LoadingStateBlock } from '../../../shared/ui/state-block'
import { CrmDashboardCharts } from '../../crm/components/CrmDashboardCharts'
import { CompanyPaymentFormModal, type CompanyPaymentFormValues } from '../components/CompanyPaymentFormModal'
import { MessageComposerModal, type MessageComposerValues } from '../components/MessageComposerModal'
import { PaymentFormModal, type PaymentFormValues } from '../components/PaymentFormModal'

const initialBroadcastMessage: MessageComposerValues = {
  subject: '',
  body: '',
}

const initialPaymentForm: PaymentFormValues = {
  project: '',
  date: new Date().toISOString().slice(0, 10),
  summ: 0,
  payment: false,
}

const initialCompanyPaymentForm: CompanyPaymentFormValues = {
  title: '',
  amount: 0,
  paymentDay: 1,
  paymentTime: '09:00',
  note: '',
  isActive: true,
}

const emptyPayments: PaymentItem[] = []
const emptyCompanyPayments: CompanyPaymentRecord[] = []
const emptyMessages: CeoMessageRecord[] = []
const showRecurringPayments = false

function toPaymentFormValues(payment?: PaymentItem | null): PaymentFormValues {
  if (!payment) {
    return initialPaymentForm
  }

  return {
    project: payment.project ?? '',
    date: payment.date ? payment.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
    summ: Number(payment.summ ?? 0),
    payment: Boolean(payment.payment),
  }
}

function normalizeCompanyPaymentTimeValue(value?: string | null) {
  if (!value) {
    return '09:00'
  }

  const match = value.trim().match(/(\d{2}):(\d{2})/)
  return match ? `${match[1]}:${match[2]}` : '09:00'
}

function formatCompanyPaymentTime(value?: string | null) {
  return normalizeCompanyPaymentTimeValue(value)
}

function toCompanyPaymentPayloadTime(value: string) {
  return `${normalizeCompanyPaymentTimeValue(value)}:00`
}

function toCompanyPaymentFormValues(payment?: CompanyPaymentRecord | null): CompanyPaymentFormValues {
  if (!payment) {
    return initialCompanyPaymentForm
  }

  return {
    title: payment.title ?? '',
    amount: Number(payment.amount ?? 0),
    paymentDay: Number(payment.payment_day ?? 1),
    paymentTime: normalizeCompanyPaymentTimeValue(payment.payment_time),
    note: payment.note ?? '',
    isActive: Boolean(payment.is_active),
  }
}

export function CeoDashboardPage() {
  const { t } = useTranslation()
  const { showToast } = useToast()
  const { confirm } = useConfirm()

  const dashboardQuery = useAsyncData(() => ceoService.getDashboard(), [])
  const messagesQuery = useAsyncData(() => ceoService.listMessages(), [])
  const paymentsQuery = useAsyncData(() => ceoService.listPayments(), [])
  const companyPaymentsQuery = useAsyncData(() => ceoService.listCompanyPayments(), [])
  const [chartCustomerType, setChartCustomerType] = useState('')
  const chartsQuery = useAsyncData(
    async () => {
      const selectedCustomerType = chartCustomerType || undefined
      const [weekly, monthly] = await Promise.all([
        crmService.salesDashboardCharts({
          days: 7,
          customer_type: selectedCustomerType,
          platform_limit: 8,
        }),
        crmService.salesDashboardCharts({
          days: 30,
          customer_type: selectedCustomerType,
          platform_limit: 10,
        }),
      ])

      return { weekly, monthly }
    },
    [chartCustomerType],
  )

  const [broadcastValues, setBroadcastValues] = useState<MessageComposerValues>(initialBroadcastMessage)
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false)
  const [isBroadcastSubmitting, setIsBroadcastSubmitting] = useState(false)

  const [paymentMode, setPaymentMode] = useState<'create' | 'edit'>('create')
  const [paymentValues, setPaymentValues] = useState<PaymentFormValues>(initialPaymentForm)
  const [selectedPayment, setSelectedPayment] = useState<PaymentItem | null>(null)
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  const [isPaymentSubmitting, setIsPaymentSubmitting] = useState(false)

  const [companyPaymentMode, setCompanyPaymentMode] = useState<'create' | 'edit'>('create')
  const [companyPaymentValues, setCompanyPaymentValues] = useState<CompanyPaymentFormValues>(initialCompanyPaymentForm)
  const [selectedCompanyPayment, setSelectedCompanyPayment] = useState<CompanyPaymentRecord | null>(null)
  const [isCompanyPaymentOpen, setIsCompanyPaymentOpen] = useState(false)
  const [isCompanyPaymentSubmitting, setIsCompanyPaymentSubmitting] = useState(false)

  const messages = messagesQuery.data?.messages ?? emptyMessages
  const payments = paymentsQuery.data?.payments ?? emptyPayments
  const companyPayments = companyPaymentsQuery.data?.payments ?? emptyCompanyPayments

  const activeRecurringPayments = useMemo(() => {
    return companyPayments.filter((payment) => payment.is_active).length
  }, [companyPayments])
  const totalRecurringPaymentsAmount = useMemo(() => {
    return companyPaymentsQuery.data?.totalAmount
      ?? companyPayments.reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0)
  }, [companyPayments, companyPaymentsQuery.data?.totalAmount])

  async function refreshAll() {
    await Promise.allSettled([
      dashboardQuery.refetch(),
      messagesQuery.refetch(),
      paymentsQuery.refetch(),
      companyPaymentsQuery.refetch(),
      chartsQuery.refetch(),
    ])
  }

  async function handleSendBroadcast() {
    if (!broadcastValues.subject.trim() || !broadcastValues.body.trim()) {
      showToast({
        title: t('ceo.dashboard.validation.broadcast_title'),
        description: t('ceo.dashboard.validation.broadcast_description'),
        tone: 'error',
      })
      return
    }

    setIsBroadcastSubmitting(true)

    try {
      await ceoService.sendMessageToAll({
        subject: broadcastValues.subject.trim(),
        body: broadcastValues.body.trim(),
      })
      await Promise.all([messagesQuery.refetch(), dashboardQuery.refetch()])
      setBroadcastValues(initialBroadcastMessage)
      setIsBroadcastOpen(false)
      showToast({
        title: t('ceo.dashboard.toast.broadcast_sent_title'),
        description: t('ceo.dashboard.toast.broadcast_sent_description'),
        tone: 'success',
      })
    } catch (error) {
      showToast({
        title: t('ceo.dashboard.toast.broadcast_failed_title'),
        description: error instanceof Error ? error.message : t('ceo.dashboard.toast.broadcast_failed_description'),
        tone: 'error',
      })
    } finally {
      setIsBroadcastSubmitting(false)
    }
  }

  function openCreatePaymentModal() {
    setPaymentMode('create')
    setSelectedPayment(null)
    setPaymentValues(initialPaymentForm)
    setIsPaymentOpen(true)
  }

  function openEditPaymentModal(payment: PaymentItem) {
    setPaymentMode('edit')
    setSelectedPayment(payment)
    setPaymentValues(toPaymentFormValues(payment))
    setIsPaymentOpen(true)
  }

  function openCreateCompanyPaymentModal() {
    setCompanyPaymentMode('create')
    setSelectedCompanyPayment(null)
    setCompanyPaymentValues(initialCompanyPaymentForm)
    setIsCompanyPaymentOpen(true)
  }

  function openEditCompanyPaymentModal(payment: CompanyPaymentRecord) {
    setCompanyPaymentMode('edit')
    setSelectedCompanyPayment(payment)
    setCompanyPaymentValues(toCompanyPaymentFormValues(payment))
    setIsCompanyPaymentOpen(true)
  }

  async function handleSubmitPayment() {
    if (!paymentValues.project.trim() || !paymentValues.date.trim()) {
      showToast({
        title: t('ceo.dashboard.validation.payment_title'),
        description: t('ceo.dashboard.validation.payment_description'),
        tone: 'error',
      })
      return
    }

    setIsPaymentSubmitting(true)

    try {
      if (paymentMode === 'create') {
        await ceoService.createPayment({
          project: paymentValues.project.trim(),
          date: paymentValues.date,
          summ: Number(paymentValues.summ),
          payment: paymentValues.payment,
        })
      } else if (selectedPayment) {
        await ceoService.updatePayment(selectedPayment.id, {
          project: paymentValues.project.trim(),
          date: paymentValues.date || null,
          summ: Number(paymentValues.summ),
          payment: paymentValues.payment,
        })
      }

      await paymentsQuery.refetch()
      setIsPaymentOpen(false)
      showToast({
        title: paymentMode === 'create'
          ? t('ceo.dashboard.toast.payment_created_title')
          : t('ceo.dashboard.toast.payment_updated_title'),
        description: t('ceo.dashboard.toast.payment_saved_description'),
        tone: 'success',
      })
    } catch (error) {
      showToast({
        title: t('ceo.dashboard.toast.payment_failed_title'),
        description: error instanceof Error ? error.message : t('ceo.dashboard.toast.payment_failed_description'),
        tone: 'error',
      })
    } finally {
      setIsPaymentSubmitting(false)
    }
  }

  async function handleSubmitCompanyPayment() {
    if (!companyPaymentValues.title.trim()) {
      showToast({
        title: t('ceo.dashboard.validation.reminder_title'),
        description: t('ceo.dashboard.validation.reminder_description'),
        tone: 'error',
      })
      return
    }

    setIsCompanyPaymentSubmitting(true)

    try {
      const payload = {
        title: companyPaymentValues.title.trim(),
        amount: Number(companyPaymentValues.amount),
        payment_day: Math.min(31, Math.max(1, Math.round(Number(companyPaymentValues.paymentDay) || 1))),
        payment_time: toCompanyPaymentPayloadTime(companyPaymentValues.paymentTime),
        note: companyPaymentValues.note.trim(),
        is_active: companyPaymentValues.isActive,
      }

      if (companyPaymentMode === 'create') {
        await ceoService.createCompanyPayment(payload)
      } else if (selectedCompanyPayment) {
        await ceoService.updateCompanyPayment(selectedCompanyPayment.id, payload)
      }

      await companyPaymentsQuery.refetch()
      setIsCompanyPaymentOpen(false)
      showToast({
        title: companyPaymentMode === 'create'
          ? t('ceo.dashboard.toast.reminder_created_title')
          : t('ceo.dashboard.toast.reminder_updated_title'),
        description: t('ceo.dashboard.toast.reminder_saved_description'),
        tone: 'success',
      })
    } catch (error) {
      showToast({
        title: t('ceo.dashboard.toast.reminder_failed_title'),
        description: error instanceof Error ? error.message : t('ceo.dashboard.toast.reminder_failed_description'),
        tone: 'error',
      })
    } finally {
      setIsCompanyPaymentSubmitting(false)
    }
  }

  async function handleDeleteMessage(message: CeoMessageRecord) {
    const approved = await confirm({
      title: t('ceo.dashboard.confirm.message_delete_title'),
      description: t('ceo.dashboard.confirm.message_delete_description', { email: message.receiver_email }),
      confirmLabel: t('ceo.dashboard.confirm.message_delete_confirm'),
      cancelLabel: t('common.cancel'),
      tone: 'danger',
    })

    if (!approved) {
      return
    }

    try {
      await ceoService.deleteMessage(message.id)
      await Promise.all([messagesQuery.refetch(), dashboardQuery.refetch()])
      showToast({
        title: t('ceo.dashboard.toast.message_deleted_title'),
        description: t('ceo.dashboard.toast.message_deleted_description'),
        tone: 'success',
      })
    } catch (error) {
      showToast({
        title: t('ceo.dashboard.toast.message_delete_failed_title'),
        description: error instanceof Error ? error.message : t('ceo.dashboard.toast.message_delete_failed_description'),
        tone: 'error',
      })
    }
  }

  async function handleTogglePayment(payment: PaymentItem) {
    try {
      await ceoService.togglePayment(payment.id)
      await paymentsQuery.refetch()
      showToast({
        title: t('ceo.dashboard.toast.payment_status_title'),
        description: t('ceo.dashboard.toast.payment_status_description', { project: payment.project }),
        tone: 'success',
      })
    } catch (error) {
      showToast({
        title: t('ceo.dashboard.toast.payment_toggle_failed_title'),
        description: error instanceof Error ? error.message : t('ceo.dashboard.toast.payment_toggle_failed_description'),
        tone: 'error',
      })
    }
  }

  async function handleDeletePayment(payment: PaymentItem) {
    const approved = await confirm({
      title: t('ceo.dashboard.confirm.payment_delete_title', { project: payment.project }),
      description: t('ceo.dashboard.confirm.payment_delete_description'),
      confirmLabel: t('ceo.dashboard.confirm.payment_delete_confirm'),
      cancelLabel: t('common.cancel'),
      tone: 'danger',
    })

    if (!approved) {
      return
    }

    try {
      await ceoService.deletePayment(payment.id)
      await paymentsQuery.refetch()
      showToast({
        title: t('ceo.dashboard.toast.payment_deleted_title'),
        description: t('ceo.dashboard.toast.payment_deleted_description'),
        tone: 'success',
      })
    } catch (error) {
      showToast({
        title: t('ceo.dashboard.toast.payment_delete_failed_title'),
        description: error instanceof Error ? error.message : t('ceo.dashboard.toast.payment_delete_failed_description'),
        tone: 'error',
      })
    }
  }

  async function handleDeleteCompanyPayment(payment: CompanyPaymentRecord) {
    const approved = await confirm({
      title: t('ceo.dashboard.confirm.reminder_delete_title', { title: payment.title }),
      description: t('ceo.dashboard.confirm.reminder_delete_description'),
      confirmLabel: t('ceo.dashboard.confirm.reminder_delete_confirm'),
      cancelLabel: t('common.cancel'),
      tone: 'danger',
    })

    if (!approved) {
      return
    }

    try {
      await ceoService.deleteCompanyPayment(payment.id)
      await companyPaymentsQuery.refetch()
      showToast({
        title: t('ceo.dashboard.toast.reminder_deleted_title'),
        description: t('ceo.dashboard.toast.reminder_deleted_description'),
        tone: 'success',
      })
    } catch (error) {
      showToast({
        title: t('ceo.dashboard.toast.reminder_delete_failed_title'),
        description: error instanceof Error ? error.message : t('ceo.dashboard.toast.reminder_delete_failed_description'),
        tone: 'error',
      })
    }
  }

  if (dashboardQuery.isLoading && !dashboardQuery.data) {
    return (
      <LoadingStateBlock
        eyebrow={t('ceo.dashboard.header.eyebrow', 'CEO Workspace')}
        title={t('ceo.dashboard.loading.title')}
        description={t('ceo.dashboard.loading.description')}
      />
    )
  }

  if (dashboardQuery.isError && !dashboardQuery.data) {
    return (
      <ErrorStateBlock
        eyebrow={t('ceo.dashboard.header.eyebrow', 'CEO Workspace')}
        title={t('ceo.dashboard.error.title')}
        description={t('ceo.dashboard.error.description')}
        actionLabel={t('common.retry')}
        onAction={() => {
          void refreshAll()
        }}
      />
    )
  }

  return (
    <section className="space-y-8">
      <PageHeader
        title={t('ceo.dashboard.header.title')}
        actions={
          <ActionsMenu
            triggerVariant="button"
            label={t('common.actions')}
            items={[
              {
                label: t('common.refresh'),
                icon: (
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5">
                    <path d="M1.84998 7.46254C1.84998 4.3586 4.37103 1.83754 7.47498 1.83754C8.91301 1.83754 10.2222 2.37681 11.218 3.26444L10.375 4.10744C10.2773 4.20517 10.2773 4.36346 10.375 4.46119C10.4727 4.55892 10.631 4.55892 10.7287 4.46119L12.1287 3.06119C12.2264 2.96346 12.2264 2.80517 12.1287 2.70744L10.7287 1.30744C10.631 1.20971 10.4727 1.20971 10.375 1.30744C10.2773 1.40517 10.2773 1.56346 10.375 1.66119L11.0821 2.36831C10.1064 1.5034 8.8507 0.987539 7.47498 0.987539C3.90164 0.987539 1 3.88918 1 7.46254C1 11.0359 3.90164 13.9375 7.47498 13.9375C11.0483 13.9375 13.95 11.0359 13.95 7.46254H13.1C13.1 10.5665 10.579 13.0875 7.47498 13.0875C4.37103 13.0875 1.84998 10.5665 1.84998 7.46254Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd" />
                  </svg>
                ),
                onSelect: () => void refreshAll(),
              },
              {
                label: t('ceo.dashboard.actions.send_broadcast'),
                icon: (
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5">
                    <path d="M1.20308 1.04312C1.17743 1.0114 1.14304 0.998483 1.10954 1.0003C1.07604 1.00212 1.0428 1.01861 1.02217 1.04482C1.00147 1.07112 0.993416 1.10425 0.99966 1.13524C1.0059 1.16623 1.02613 1.1942 1.05562 1.21175L13.8056 8.71175C13.8407 8.73238 13.8824 8.7332 13.918 8.71392C13.9536 8.69464 13.9774 8.65851 13.982 8.61802C13.9867 8.57753 13.9714 8.53924 13.9416 8.51478L1.20308 1.04312ZM1.00391 13.9961L1.00391 13.9961C1.00366 13.9961 1.00341 13.9961 1.00316 13.9961C0.96346 13.9959 0.925828 13.9782 0.90151 13.9482C0.877192 13.9182 0.868725 13.8791 0.878413 13.8423L2.24357 8.61833L8.00004 7.5L2.24357 6.38167L0.878413 1.15774C0.868725 1.1209 0.877192 1.08179 0.90151 1.05182C0.925828 1.02185 0.96346 1.00407 1.00316 1.00388C1.00341 1.00388 1.00366 1.00388 1.00391 1.00388C1.03664 1.00388 1.06913 1.01639 1.09241 1.03967L13.9124 13.8597C13.9405 13.8878 13.9536 13.9261 13.9479 13.9649C13.9422 14.0037 13.9184 14.0372 13.8839 14.0551C13.8493 14.0729 13.8087 14.0726 13.7744 14.0543L1.00391 13.9961Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd" />
                  </svg>
                ),
                onSelect: () => setIsBroadcastOpen(true),
              },
              {
                label: t('ceo.dashboard.actions.create_payment'),
                icon: (
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5">
                    <path d="M7.5 0.75C3.77208 0.75 0.75 3.77208 0.75 7.5C0.75 11.2279 3.77208 14.25 7.5 14.25C11.2279 14.25 14.25 11.2279 14.25 7.5C14.25 3.77208 11.2279 0.75 7.5 0.75ZM7.5 1.75C4.32436 1.75 1.75 4.32436 1.75 7.5C1.75 10.6756 4.32436 13.25 7.5 13.25C10.6756 13.25 13.25 10.6756 13.25 7.5C13.25 4.32436 10.6756 1.75 7.5 1.75ZM7.5 4.5C7.77614 4.5 8 4.72386 8 5V7H10C10.2761 7 10.5 7.22386 10.5 7.5C10.5 7.77614 10.2761 8 10 8H8V10C8 10.2761 7.77614 10.5 7.5 10.5C7.22386 10.5 7 10.2761 7 10V8H5C4.72386 8 4.5 7.77614 4.5 7.5C4.5 7.22386 4.72386 7 5 7H7V5C7 4.72386 7.22386 4.5 7.5 4.5Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd" />
                  </svg>
                ),
                onSelect: openCreatePaymentModal,
              },
              {
                label: t('ceo.dashboard.actions.add_recurring'),
                icon: (
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5">
                    <path d="M11.5 3C12.3284 3 13 3.67157 13 4.5V11.5C13 12.3284 12.3284 13 11.5 13H3.5C2.67157 13 2 12.3284 2 11.5V4.5C2 3.67157 2.67157 3 3.5 3H11.5ZM11.5 4H3.5C3.22386 4 3 4.22386 3 4.5V11.5C3 11.7761 3.22386 12 3.5 12H11.5C11.7761 12 12 11.7761 12 11.5V4.5C12 4.22386 11.7761 4 11.5 4ZM4.5 5.5H5.5V6.5H4.5V5.5ZM6.5 5.5H8.5V6.5H6.5V5.5ZM4.5 7.5H5.5V8.5H4.5V7.5ZM6.5 7.5H8.5V8.5H6.5V7.5ZM4.5 9.5H5.5V10.5H4.5V9.5ZM6.5 9.5H8.5V10.5H6.5V9.5ZM9.5 5.5H10.5V6.5H9.5V5.5ZM9.5 7.5H10.5V8.5H9.5V7.5ZM9.5 9.5H10.5V10.5H9.5V9.5Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd" />
                  </svg>
                ),
                onSelect: openCreateCompanyPaymentModal,
              },
              {
                label: t('ceo.dashboard.recurring.create'),
                icon: (
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5">
                    <path d="M7.5 1.5C7.77614 1.5 8 1.72386 8 2V3.06456C10.263 3.44099 12 5.42043 12 7.8V10.5H13C13.2761 10.5 13.5 10.7239 13.5 11C13.5 11.2761 13.2761 11.5 13 11.5H2C1.72386 11.5 1.5 11.2761 1.5 11C1.5 10.7239 1.72386 10.5 2 10.5H3V7.8C3 5.42043 4.73703 3.44099 7 3.06456V2C7 1.72386 7.22386 1.5 7.5 1.5ZM4 10.5H11V7.8C11 5.867 9.433 4.3 7.5 4.3C5.567 4.3 4 5.867 4 7.8V10.5ZM7.5 12.5C8.32843 12.5 9 13.1716 9 14H6C6 13.1716 6.67157 12.5 7.5 12.5Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd" />
                  </svg>
                ),
                onSelect: openCreateCompanyPaymentModal,
              },
            ]}
          />
        }
      />

      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <SectionTitle
            title={t('ceo.dashboard.recurring.title')}
          />
          <div className="flex flex-wrap gap-2">
            <Badge variant="success" dot>
              {t('ceo.dashboard.recurring.active_count', { count: activeRecurringPayments })}
            </Badge>
            <Badge variant="secondary" dot>
              {t('ceo.dashboard.recurring.inactive_count', { count: companyPayments.length - activeRecurringPayments })}
            </Badge>
            <Badge variant="blue" dot>
              {t('ceo.dashboard.recurring.total_amount', { amount: formatCurrency(totalRecurringPaymentsAmount) })}
            </Badge>
            <Button size="sm" onClick={openCreateCompanyPaymentModal}>
              {t('ceo.dashboard.recurring.create')}
            </Button>
          </div>
        </div>
        <div className="mt-6">
          <DataTable
            caption={t('ceo.dashboard.recurring.title')}
            rows={companyPayments}
            getRowKey={(row) => String(row.id)}
            zebra
            emptyState={
              <EmptyStateBlock
                eyebrow={t('ceo.dashboard.recurring.empty_eyebrow')}
                title={t('ceo.dashboard.recurring.empty_title')}
              />
            }
            columns={[
              {
                key: 'title',
                header: t('ceo.dashboard.table.title'),
                render: (row) => (
                  <div className="max-w-[320px]">
                    <p className="font-semibold text-(--foreground)">{row.title}</p>
                  </div>
                ),
              },
              {
                key: 'schedule',
                header: t('ceo.dashboard.table.schedule'),
                render: (row) => t('ceo.dashboard.recurring.schedule', {
                  day: row.payment_day,
                  time: formatCompanyPaymentTime(row.payment_time),
                }),
              },
              {
                key: 'amount',
                header: t('ceo.dashboard.table.amount'),
                align: 'right',
                render: (row) => formatCurrency(Number(row.amount ?? 0)),
              },
              {
                key: 'status',
                header: t('common.status'),
                render: (row) => (
                  <Badge variant={row.is_active ? 'success' : 'secondary'} dot>
                    {row.is_active ? t('status.active') : t('status.inactive')}
                  </Badge>
                ),
              },
              {
                key: 'actions',
                header: t('common.actions'),
                render: (row) => (
                  <ActionsMenu
                    label={t('ceo.dashboard.actions.open_row', { name: row.title })}
                    items={[
                      {
                        label: t('common.edit'),
                        onSelect: () => openEditCompanyPaymentModal(row),
                      },
                      {
                        label: t('customers.actions.delete'),
                        onSelect: () => void handleDeleteCompanyPayment(row),
                        tone: 'danger',
                      },
                    ]}
                  />
                ),
              },
            ]}
          />
        </div>
      </Card>

      <CrmDashboardCharts
        weekly={chartsQuery.data?.weekly}
        monthly={chartsQuery.data?.monthly}
        customerType={chartCustomerType}
        onCustomerTypeChange={setChartCustomerType}
        isLoading={chartsQuery.isLoading}
        isError={chartsQuery.isError}
        onRetry={() => {
          void chartsQuery.refetch()
        }}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <SectionTitle
              title={t('ceo.dashboard.messages.title')}
            />
            <Badge variant="violet" dot>
              {t('ceo.dashboard.messages.entries', { count: messages.length })}
            </Badge>
          </div>
          <div className="mt-6">
            <DataTable
              caption={t('ceo.dashboard.messages.title')}
              rows={messages}
              getRowKey={(row) => String(row.id)}
              zebra
              emptyState={
                <EmptyStateBlock
                  eyebrow={t('ceo.dashboard.header.eyebrow', 'CEO Workspace')}
                  title={t('ceo.dashboard.messages.empty_title')}
                />
              }
              columns={[
                {
                  key: 'receiver',
                  header: t('ceo.dashboard.table.receiver'),
                render: (row) => (
                  <div>
                    <p className="font-semibold text-(--foreground)">{row.receiver_name}</p>
                  </div>
                ),
              },
                {
                  key: 'subject',
                  header: t('ceo.dashboard.table.subject'),
                  render: (row) => (
                    <div className="max-w-[260px]">
                      <p className="truncate font-medium text-white">{row.subject}</p>
                    </div>
                  ),
                },
                {
                  key: 'sent_at',
                  header: t('ceo.dashboard.table.sent_at'),
                  render: (row) => formatShortDate(row.sent_at),
                },
                {
                  key: 'actions',
                  header: t('common.actions'),
                  render: (row) => (
                    <ActionsMenu
                      label={t('ceo.dashboard.actions.open_row', { name: row.receiver_email })}
                      items={[
                        {
                          label: t('customers.actions.delete'),
                          onSelect: () => void handleDeleteMessage(row),
                          tone: 'danger',
                        },
                      ]}
                    />
                  ),
                },
              ]}
            />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <SectionTitle
              title={t('ceo.dashboard.payments.title')}
            />
            <div className="flex flex-wrap gap-2">
              <Badge variant="success" dot>
                {t('ceo.dashboard.payments.paid_count', { count: payments.filter((row) => row.payment).length })}
              </Badge>
              <Badge variant="warning" dot pulse={payments.some((row) => !row.payment)}>
                {t('ceo.dashboard.payments.pending_count', { count: payments.filter((row) => !row.payment).length })}
              </Badge>
            </div>
          </div>
          <div className="mt-6">
            <DataTable
              caption={t('ceo.dashboard.payments.title')}
              rows={payments}
              getRowKey={(row) => String(row.id)}
              zebra
              emptyState={
                <EmptyStateBlock
                  eyebrow={t('ceo.dashboard.header.eyebrow', 'CEO Workspace')}
                  title={t('ceo.dashboard.payments.empty_title')}
                />
              }
              columns={[
                {
                  key: 'project',
                  header: t('ceo.dashboard.table.project'),
                  render: (row) => row.project,
                },
                {
                  key: 'date',
                  header: t('ceo.dashboard.table.date'),
                  render: (row) => (row.date ? formatShortDate(row.date) : '-'),
                },
                {
                  key: 'amount',
                  header: t('ceo.dashboard.table.amount'),
                  align: 'right',
                  render: (row) => formatCurrency(Number(row.summ ?? 0)),
                },
                {
                  key: 'status',
                  header: t('common.status'),
                  render: (row) => (
                    <Badge variant={row.payment ? 'success' : 'warning'} dot pulse={!row.payment}>
                      {row.payment ? t('status.paid') : t('status.pending')}
                    </Badge>
                  ),
                },
                {
                  key: 'actions',
                  header: t('common.actions'),
                  render: (row) => (
                    <ActionsMenu
                      label={t('ceo.dashboard.actions.open_row', { name: row.project })}
                      items={[
                        {
                          label: t('common.edit'),
                          onSelect: () => openEditPaymentModal(row),
                        },
                        {
                          label: t('ceo.dashboard.actions.toggle'),
                          onSelect: () => void handleTogglePayment(row),
                        },
                        {
                          label: t('customers.actions.delete'),
                          onSelect: () => void handleDeletePayment(row),
                          tone: 'danger',
                        },
                      ]}
                    />
                  ),
                },
              ]}
            />
          </div>
        </Card>
      </div>

      {showRecurringPayments && (
      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <SectionTitle
            title="Company payment reminders"
          />
          <div className="flex flex-wrap gap-2">
            <Badge variant="success" dot>
              {activeRecurringPayments} active
            </Badge>
            <Badge variant="secondary" dot>
              {companyPayments.length - activeRecurringPayments} inactive
            </Badge>
            <Badge variant="blue" dot>
              {formatCurrency(totalRecurringPaymentsAmount)} total
            </Badge>
            <Button size="sm" onClick={openCreateCompanyPaymentModal}>
              Create reminder
            </Button>
          </div>
        </div>
        <div className="mt-6">
          <DataTable
            caption="Company payment reminders"
            rows={companyPayments}
            getRowKey={(row) => String(row.id)}
            zebra
            emptyState={
              <EmptyStateBlock
                eyebrow={t('ceo.dashboard.header.eyebrow', 'CEO Workspace')}
                title="Reminderlar yo'q"
                description="Company recurring payment endpoint hozircha bo'sh ro'yxat qaytardi."
              />
            }
            columns={[
              {
                key: 'title',
                header: 'Title',
                render: (row) => (
                  <div className="max-w-[320px]">
                    <p className="font-semibold text-(--foreground)">{row.title}</p>
                  </div>
                ),
              },
              {
                key: 'schedule',
                header: 'Schedule',
                render: (row) => `Day ${row.payment_day} • ${formatCompanyPaymentTime(row.payment_time)}`,
              },
              {
                key: 'amount',
                header: 'Amount',
                align: 'right',
                render: (row) => formatCurrency(Number(row.amount ?? 0)),
              },
              {
                key: 'status',
                header: 'Status',
                render: (row) => (
                  <Badge variant={row.is_active ? 'success' : 'secondary'} dot>
                    {row.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                ),
              },
              {
                key: 'actions',
                header: 'Actions',
                render: (row) => (
                  <ActionsMenu
                    label={`Open actions for ${row.title}`}
                    items={[
                      {
                        label: 'Edit',
                        onSelect: () => openEditCompanyPaymentModal(row),
                      },
                      {
                        label: 'Delete',
                        onSelect: () => void handleDeleteCompanyPayment(row),
                        tone: 'danger',
                      },
                    ]}
                  />
                ),
              },
            ]}
          />
        </div>
      </Card>
      )}

      <MessageComposerModal
        open={isBroadcastOpen}
        onClose={() => setIsBroadcastOpen(false)}
        values={broadcastValues}
        isBroadcast
        isSubmitting={isBroadcastSubmitting}
        onChange={(field, value) =>
          setBroadcastValues((current) => ({
            ...current,
            [field]: value,
          }))
        }
        onSubmit={() => void handleSendBroadcast()}
      />

      <PaymentFormModal
        open={isPaymentOpen}
        mode={paymentMode}
        values={paymentValues}
        onClose={() => setIsPaymentOpen(false)}
        onChange={(field, value) =>
          setPaymentValues((current) => ({
            ...current,
            [field]: value,
          }))
        }
        onSubmit={() => void handleSubmitPayment()}
        isSubmitting={isPaymentSubmitting}
      />

      <CompanyPaymentFormModal
        open={isCompanyPaymentOpen}
        mode={companyPaymentMode}
        values={companyPaymentValues}
        onClose={() => setIsCompanyPaymentOpen(false)}
        onChange={(field, value) =>
          setCompanyPaymentValues((current) => ({
            ...current,
            [field]: value,
          }))
        }
        onSubmit={() => void handleSubmitCompanyPayment()}
        isSubmitting={isCompanyPaymentSubmitting}
      />
    </section>
  )
}

