import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ceoService, type CeoMessageRecord, type CompanyPaymentRecord } from '../../../shared/api/services/ceo.service'
import { crmService } from '../../../shared/api/services/crm.service'
import type { PaymentItem } from '../../../shared/api/types'
import { useConfirm } from '../../../shared/confirm/useConfirm'
import { formatCurrency, formatShortDate } from '../../../shared/lib/format'
import { getErrorMessage } from '../../../shared/lib/error'
import { useToast } from '../../../shared/toast/useToast'
import { Badge } from '../../../shared/ui/badge'
import { Button } from '../../../shared/ui/button'
import { Card } from '../../../shared/ui/card'
import { ActionsMenu } from '../../../shared/ui/actions-menu'
import { DataTable } from '../../../shared/ui/data-table'
import { PageHeader } from '../../../shared/ui/page-header'
import { SectionTitle } from '../../../shared/ui/section-title'
import { EmptyStateBlock, ErrorStateBlock } from '../../../shared/ui/state-block'
import { Skeleton, SkeletonCard, SkeletonTable } from '../../../shared/ui/skeleton'
import { CrmDashboardCharts } from '../../crm/components/CrmDashboardCharts'
import { CompanyPaymentFormModal, type CompanyPaymentFormValues } from '../components/CompanyPaymentFormModal'
import { MessageComposerModal, type MessageComposerValues } from '../components/MessageComposerModal'
import { PaymentFormModal, type PaymentFormValues } from '../components/PaymentFormModal'
import { ceoKeys } from '../lib/queryKeys'
import { crmKeys } from '../../crm/lib/queryKeys'

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
  const queryClient = useQueryClient()

  const dashboardQuery = useQuery({
    queryKey: ceoKeys.dashboard(),
    queryFn: () => ceoService.getDashboard(),
  })

  const messagesQuery = useQuery({
    queryKey: ceoKeys.messages(),
    queryFn: () => ceoService.listMessages(),
  })

  const paymentsQuery = useQuery({
    queryKey: ceoKeys.payments(),
    queryFn: () => ceoService.listPayments(),
  })

  const companyPaymentsQuery = useQuery({
    queryKey: ceoKeys.companyPayments(),
    queryFn: () => ceoService.listCompanyPayments(),
  })

  const [chartCustomerType, setChartCustomerType] = useState('')

  const chartsQuery = useQuery({
    queryKey: crmKeys.charts({ customerType: chartCustomerType }),
    queryFn: async () => {
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
  })

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
    await queryClient.invalidateQueries({ queryKey: ceoKeys.all })
    await queryClient.invalidateQueries({ queryKey: crmKeys.charts() })
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
      await queryClient.invalidateQueries({ queryKey: ceoKeys.messages() })
      await queryClient.invalidateQueries({ queryKey: ceoKeys.dashboard() })
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
        description: getErrorMessage(error, t('ceo.dashboard.toast.broadcast_failed_description')),
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

      await queryClient.invalidateQueries({ queryKey: ceoKeys.payments() })
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
        description: getErrorMessage(error, t('ceo.dashboard.toast.payment_failed_description')),
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

      await queryClient.invalidateQueries({ queryKey: ceoKeys.companyPayments() })
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
        description: getErrorMessage(error, t('ceo.dashboard.toast.reminder_failed_description')),
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
      await queryClient.invalidateQueries({ queryKey: ceoKeys.messages() })
      await queryClient.invalidateQueries({ queryKey: ceoKeys.dashboard() })
      showToast({
        title: t('ceo.dashboard.toast.message_deleted_title'),
        description: t('ceo.dashboard.toast.message_deleted_description'),
        tone: 'success',
      })
    } catch (error) {
      showToast({
        title: t('ceo.dashboard.toast.message_delete_failed_title'),
        description: getErrorMessage(error, t('ceo.dashboard.toast.message_delete_failed_description')),
        tone: 'error',
      })
    }
  }

  async function handleTogglePayment(payment: PaymentItem) {
    try {
      await ceoService.togglePayment(payment.id)
      await queryClient.invalidateQueries({ queryKey: ceoKeys.payments() })
      showToast({
        title: t('ceo.dashboard.toast.payment_status_title'),
        description: t('ceo.dashboard.toast.payment_status_description', { project: payment.project }),
        tone: 'success',
      })
    } catch (error) {
      showToast({
        title: t('ceo.dashboard.toast.payment_toggle_failed_title'),
        description: getErrorMessage(error, t('ceo.dashboard.toast.payment_toggle_failed_description')),
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
      await queryClient.invalidateQueries({ queryKey: ceoKeys.payments() })
      showToast({
        title: t('ceo.dashboard.toast.payment_deleted_title'),
        description: t('ceo.dashboard.toast.payment_deleted_description'),
        tone: 'success',
      })
    } catch (error) {
      showToast({
        title: t('ceo.dashboard.toast.payment_delete_failed_title'),
        description: getErrorMessage(error, t('ceo.dashboard.toast.payment_delete_failed_description')),
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
      await queryClient.invalidateQueries({ queryKey: ceoKeys.companyPayments() })
      showToast({
        title: t('ceo.dashboard.toast.reminder_deleted_title'),
        description: t('ceo.dashboard.toast.reminder_deleted_description'),
        tone: 'success',
      })
    } catch (error) {
      showToast({
        title: t('ceo.dashboard.toast.reminder_delete_failed_title'),
        description: getErrorMessage(error, t('ceo.dashboard.toast.reminder_delete_failed_description')),
        tone: 'error',
      })
    }
  }

  if (dashboardQuery.isLoading && !dashboardQuery.data) {
    return (
      <section className="space-y-8" aria-busy="true" aria-label={t('ceo.dashboard.loading.title')}>
        <div className="flex flex-col gap-2.5 border-b border-[var(--border)] pb-6">
          <Skeleton height="h-2.5" width="w-16" rounded="rounded-full" />
          <Skeleton height="h-8" width="w-72" rounded="rounded-lg" />
          <Skeleton height="h-3" width="w-48" rounded="rounded-full" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <SkeletonTable rows={6} cols={5} />
        <SkeletonTable rows={4} cols={4} />
      </section>
    )
  }

  if (dashboardQuery.isError && !dashboardQuery.data) {
    return (
      <ErrorStateBlock
        eyebrow="CEO / Day 6"
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
        eyebrow="CEO / Day 6"
        title={t('ceo.dashboard.header.title')}
        actions={
          <div className="grid w-full gap-2 sm:grid-cols-2 xl:w-[28rem]">
            <Button className="w-full justify-center" variant="secondary" onClick={() => void refreshAll()}>
              {t('common.refresh')}
            </Button>
            <Button className="w-full justify-center" variant="ghost" onClick={() => setIsBroadcastOpen(true)}>
              {t('ceo.dashboard.actions.send_broadcast')}
            </Button>
            <Button className="w-full justify-center" variant="ghost" onClick={openCreateCompanyPaymentModal}>
              {t('ceo.dashboard.actions.add_recurring')}
            </Button>
            <Button className="w-full justify-center" onClick={openCreatePaymentModal}>
              {t('ceo.dashboard.actions.create_payment')}
            </Button>
          </div>
        }
      />

      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <SectionTitle
            eyebrow={t('ceo.dashboard.recurring.eyebrow')}
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
                eyebrow={t('ceo.dashboard.recurring.eyebrow')}
                title={t('ceo.dashboard.recurring.empty_title')}
                description={t('ceo.dashboard.recurring.empty_description')}
              />
            }
            columns={[
              {
                key: 'title',
                header: t('ceo.dashboard.table.title'),
                render: (row) => (
                  <div className="max-w-[320px]">
                    <p className="font-semibold text-(--foreground)">{row.title}</p>
                    <p className="text-xs text-(--muted)">{row.note?.trim() || t('ceo.dashboard.recurring.no_note')}</p>
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
          void queryClient.invalidateQueries({ queryKey: crmKeys.charts() })
        }}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <SectionTitle
              eyebrow={t('ceo.dashboard.messages.eyebrow')}
              title={t('ceo.dashboard.messages.title')}
              description={t('ceo.dashboard.messages.description')}
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
                  eyebrow={t('ceo.dashboard.messages.eyebrow')}
                  title={t('ceo.dashboard.messages.empty_title')}
                  description={t('ceo.dashboard.messages.empty_description')}
                />
              }
              columns={[
                {
                  key: 'receiver',
                  header: t('ceo.dashboard.table.receiver'),
                  render: (row) => (
                    <div>
                      <p className="font-semibold text-(--foreground)">{row.receiver_name}</p>
                      <p className="text-xs text-(--muted)">{row.receiver_email}</p>
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
              eyebrow={t('ceo.dashboard.payments.eyebrow')}
              title={t('ceo.dashboard.payments.title')}
              description={t('ceo.dashboard.payments.description')}
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
                  eyebrow={t('ceo.dashboard.payments.eyebrow')}
                  title={t('ceo.dashboard.payments.empty_title')}
                  description={t('ceo.dashboard.payments.empty_description')}
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
            eyebrow="Recurring payments"
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
                eyebrow="Recurring payments"
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
                    <p className="text-xs text-(--muted)">{row.note?.trim() || 'No note'}</p>
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
