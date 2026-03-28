import { useMemo, useState } from 'react'
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
  const companyPayments = companyPaymentsQuery.data ?? emptyCompanyPayments

  const activeRecurringPayments = useMemo(() => {
    return companyPayments.filter((payment) => payment.is_active).length
  }, [companyPayments])

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
        title: "Message to'liq emas",
        description: "Subject va body to'ldirilishi kerak.",
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
        title: 'Broadcast yuborildi',
        description: "Barcha userlarga xabar jo'natildi.",
        tone: 'success',
      })
    } catch (error) {
      showToast({
        title: 'Broadcast yuborilmadi',
        description: error instanceof Error ? error.message : 'Send-message-all flow xato berdi.',
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
        title: "Payment form to'liq emas",
        description: 'Project va date majburiy.',
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
        title: paymentMode === 'create' ? 'Payment yaratildi' : 'Payment yangilandi',
        description: "CEO payments ro'yxati yangilandi.",
        tone: 'success',
      })
    } catch (error) {
      showToast({
        title: 'Payment saqlanmadi',
        description: error instanceof Error ? error.message : 'Payment create/edit xatolikka uchradi.',
        tone: 'error',
      })
    } finally {
      setIsPaymentSubmitting(false)
    }
  }

  async function handleSubmitCompanyPayment() {
    if (!companyPaymentValues.title.trim()) {
      showToast({
        title: "Reminder form to'liq emas",
        description: 'Title majburiy.',
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
        title: companyPaymentMode === 'create' ? 'Recurring payment yaratildi' : 'Recurring payment yangilandi',
        description: "Company payment reminderlar ro'yxati yangilandi.",
        tone: 'success',
      })
    } catch (error) {
      showToast({
        title: 'Recurring payment saqlanmadi',
        description: error instanceof Error ? error.message : 'Company recurring payment flow xatolikka uchradi.',
        tone: 'error',
      })
    } finally {
      setIsCompanyPaymentSubmitting(false)
    }
  }

  async function handleDeleteMessage(message: CeoMessageRecord) {
    const approved = await confirm({
      title: "Message o'chirilsinmi?",
      description: `${message.receiver_email} ga yuborilgan xabar o'chiriladi.`,
      confirmLabel: 'Delete message',
      cancelLabel: 'Cancel',
      tone: 'danger',
    })

    if (!approved) {
      return
    }

    try {
      await ceoService.deleteMessage(message.id)
      await Promise.all([messagesQuery.refetch(), dashboardQuery.refetch()])
      showToast({
        title: "Message o'chirildi",
        description: 'CEO messages list yangilandi.',
        tone: 'success',
      })
    } catch (error) {
      showToast({
        title: "Message o'chirilmadi",
        description: error instanceof Error ? error.message : 'Delete message flow xato berdi.',
        tone: 'error',
      })
    }
  }

  async function handleTogglePayment(payment: PaymentItem) {
    try {
      await ceoService.togglePayment(payment.id)
      await paymentsQuery.refetch()
      showToast({
        title: 'Payment holati yangilandi',
        description: `${payment.project} payment status o'zgartirildi.`,
        tone: 'success',
      })
    } catch (error) {
      showToast({
        title: 'Payment toggle ishlamadi',
        description: error instanceof Error ? error.message : 'Payment toggle flow xatolikka uchradi.',
        tone: 'error',
      })
    }
  }

  async function handleDeletePayment(payment: PaymentItem) {
    const approved = await confirm({
      title: `${payment.project} payment o'chirilsinmi?`,
      description: "To'lov yozuvi butunlay o'chiriladi.",
      confirmLabel: 'Delete payment',
      cancelLabel: 'Cancel',
      tone: 'danger',
    })

    if (!approved) {
      return
    }

    try {
      await ceoService.deletePayment(payment.id)
      await paymentsQuery.refetch()
      showToast({
        title: "Payment o'chirildi",
        description: "Payments ro'yxati yangilandi.",
        tone: 'success',
      })
    } catch (error) {
      showToast({
        title: "Payment o'chirilmadi",
        description: error instanceof Error ? error.message : 'Delete payment flow xatolikka uchradi.',
        tone: 'error',
      })
    }
  }

  async function handleDeleteCompanyPayment(payment: CompanyPaymentRecord) {
    const approved = await confirm({
      title: `${payment.title} reminder o'chirilsinmi?`,
      description: "Company recurring payment reminder butunlay o'chiriladi.",
      confirmLabel: 'Delete reminder',
      cancelLabel: 'Cancel',
      tone: 'danger',
    })

    if (!approved) {
      return
    }

    try {
      await ceoService.deleteCompanyPayment(payment.id)
      await companyPaymentsQuery.refetch()
      showToast({
        title: "Recurring payment o'chirildi",
        description: "Reminderlar ro'yxati yangilandi.",
        tone: 'success',
      })
    } catch (error) {
      showToast({
        title: "Recurring payment o'chirilmadi",
        description: error instanceof Error ? error.message : 'Delete recurring payment flow xatolikka uchradi.',
        tone: 'error',
      })
    }
  }

  if (dashboardQuery.isLoading && !dashboardQuery.data) {
    return (
      <LoadingStateBlock
        eyebrow="CEO / Day 6"
        title="CEO dashboard yuklanmoqda"
        description="Statistics, metrics, messages va payments ma`lumotlari olib kelinmoqda."
      />
    )
  }

  if (dashboardQuery.isError && !dashboardQuery.data) {
    return (
      <ErrorStateBlock
        eyebrow="CEO / Day 6"
        title="CEO dashboard ochilmadi"
        description="Dashboard ma`lumotlari olinmadi. Retry qilib qayta urinib ko`ring."
        actionLabel="Retry"
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
        title="Dashboard, messages va payments"
        actions={
          <div className="grid w-full gap-2 sm:grid-cols-2 xl:w-[28rem]">
            <Button className="w-full justify-center" variant="secondary" onClick={() => void refreshAll()}>
              Refresh
            </Button>
            <Button className="w-full justify-center" variant="ghost" onClick={() => setIsBroadcastOpen(true)}>
              Send message all
            </Button>
            <Button className="w-full justify-center" variant="ghost" onClick={openCreateCompanyPaymentModal}>
              Add recurring payment
            </Button>
            <Button className="w-full justify-center" onClick={openCreatePaymentModal}>
              Create payment
            </Button>
          </div>
        }
      />

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
              eyebrow="Messages"
              title="CEO sent messages"
              description="Broadcast va userga yuborilgan xabarlar shu listdan delete qilinadi."
            />
            <Badge variant="violet" dot>
              {messages.length} entries
            </Badge>
          </div>
          <div className="mt-6">
            <DataTable
              caption="CEO messages list"
              rows={messages}
              getRowKey={(row) => String(row.id)}
              zebra
              emptyState={
                <EmptyStateBlock
                  eyebrow="Messages"
                  title="Xabarlar yo'q"
                  description="Hozircha CEO tomonidan yuborilgan message topilmadi."
                />
              }
              columns={[
                {
                  key: 'receiver',
                  header: 'Receiver',
                  render: (row) => (
                    <div>
                      <p className="font-semibold text-(--foreground)">{row.receiver_name}</p>
                      <p className="text-xs text-(--muted)">{row.receiver_email}</p>
                    </div>
                  ),
                },
                {
                  key: 'subject',
                  header: 'Subject',
                  render: (row) => (
                    <div className="max-w-[260px]">
                      <p className="truncate font-medium text-white">{row.subject}</p>
                    </div>
                  ),
                },
                {
                  key: 'sent_at',
                  header: 'Sent at',
                  render: (row) => formatShortDate(row.sent_at),
                },
                {
                  key: 'actions',
                  header: 'Actions',
                  render: (row) => (
                    <ActionsMenu
                      label={`Open actions for ${row.receiver_email}`}
                      items={[
                        {
                          label: 'Delete',
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
              eyebrow="Payments"
              title="CEO payments list"
              description="Create, edit, toggle va delete amallari payments table ichida ulandi."
            />
            <div className="flex flex-wrap gap-2">
              <Badge variant="success" dot>
                {payments.filter((row) => row.payment).length} paid
              </Badge>
              <Badge variant="warning" dot pulse={payments.some((row) => !row.payment)}>
                {payments.filter((row) => !row.payment).length} pending
              </Badge>
            </div>
          </div>
          <div className="mt-6">
            <DataTable
              caption="CEO payments list"
              rows={payments}
              getRowKey={(row) => String(row.id)}
              zebra
              emptyState={
                <EmptyStateBlock
                  eyebrow="Payments"
                  title="To'lovlar yo'q"
                  description="Hozircha CEO payments endpoint bo'sh ro'yxat qaytardi."
                />
              }
              columns={[
                {
                  key: 'project',
                  header: 'Project',
                  render: (row) => row.project,
                },
                {
                  key: 'date',
                  header: 'Date',
                  render: (row) => (row.date ? formatShortDate(row.date) : '-'),
                },
                {
                  key: 'amount',
                  header: 'Amount',
                  align: 'right',
                  render: (row) => formatCurrency(Number(row.summ ?? 0)),
                },
                {
                  key: 'status',
                  header: 'Status',
                  render: (row) => (
                    <Badge variant={row.payment ? 'success' : 'warning'} dot pulse={!row.payment}>
                      {row.payment ? 'Paid' : 'Pending'}
                    </Badge>
                  ),
                },
                {
                  key: 'actions',
                  header: 'Actions',
                  render: (row) => (
                    <ActionsMenu
                      label={`Open actions for ${row.project}`}
                      items={[
                        {
                          label: 'Edit',
                          onSelect: () => openEditPaymentModal(row),
                        },
                        {
                          label: 'Toggle',
                          onSelect: () => void handleTogglePayment(row),
                        },
                        {
                          label: 'Delete',
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
