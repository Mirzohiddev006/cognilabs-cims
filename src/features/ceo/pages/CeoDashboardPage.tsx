import { useMemo, useState } from 'react'
import { ceoService, type CeoMessageRecord } from '../../../shared/api/services/ceo.service'
import type { PaymentItem } from '../../../shared/api/types'
import { useAsyncData } from '../../../shared/hooks/useAsyncData'
import { useConfirm } from '../../../shared/confirm/useConfirm'
import { formatCompactNumber, formatCurrency, formatShortDate } from '../../../shared/lib/format'
import { useToast } from '../../../shared/toast/useToast'
import { Button } from '../../../shared/ui/button'
import { Card } from '../../../shared/ui/card'
import { ActionsMenu } from '../../../shared/ui/actions-menu'
import { DataTable } from '../../../shared/ui/data-table'
import { SectionTitle } from '../../../shared/ui/section-title'
import { EmptyStateBlock, ErrorStateBlock, LoadingStateBlock } from '../../../shared/ui/state-block'
import { MessageComposerModal, type MessageComposerValues } from '../components/MessageComposerModal'
import { MetricCard } from '../components/MetricCard'
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

const emptyPayments: PaymentItem[] = []
const emptyMessages: CeoMessageRecord[] = []

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

export function CeoDashboardPage() {
  const { showToast } = useToast()
  const { confirm } = useConfirm()

  const dashboardQuery = useAsyncData(() => ceoService.getDashboard(), [])
  const todayMetricsQuery = useAsyncData(() => ceoService.getTodayMetrics(), [])
  const messagesQuery = useAsyncData(() => ceoService.listMessages(), [])
  const paymentsQuery = useAsyncData(() => ceoService.listPayments(), [])

  const [broadcastValues, setBroadcastValues] = useState<MessageComposerValues>(initialBroadcastMessage)
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false)
  const [isBroadcastSubmitting, setIsBroadcastSubmitting] = useState(false)

  const [paymentMode, setPaymentMode] = useState<'create' | 'edit'>('create')
  const [paymentValues, setPaymentValues] = useState<PaymentFormValues>(initialPaymentForm)
  const [selectedPayment, setSelectedPayment] = useState<PaymentItem | null>(null)
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  const [isPaymentSubmitting, setIsPaymentSubmitting] = useState(false)

  const statistics = dashboardQuery.data?.statistics
  const metrics = todayMetricsQuery.data
  const messages = messagesQuery.data?.messages ?? emptyMessages
  const payments = paymentsQuery.data?.payments ?? emptyPayments

  const totalPlannedPayments = useMemo(() => {
    return payments.reduce((sum, payment) => sum + Number(payment.summ ?? 0), 0)
  }, [payments])

  async function refreshAll() {
    await Promise.all([
      dashboardQuery.refetch(),
      todayMetricsQuery.refetch(),
      messagesQuery.refetch(),
      paymentsQuery.refetch(),
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

      await Promise.all([paymentsQuery.refetch(), todayMetricsQuery.refetch()])
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
      await Promise.all([paymentsQuery.refetch(), todayMetricsQuery.refetch()])
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
      await Promise.all([paymentsQuery.refetch(), todayMetricsQuery.refetch()])
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

  if (dashboardQuery.isLoading && todayMetricsQuery.isLoading && !dashboardQuery.data && !todayMetricsQuery.data) {
    return (
      <LoadingStateBlock
        eyebrow="CEO / Day 6"
        title="CEO dashboard yuklanmoqda"
        description="Statistics, metrics, messages va payments ma`lumotlari olib kelinmoqda."
      />
    )
  }

  if (dashboardQuery.isError && todayMetricsQuery.isError && !dashboardQuery.data && !todayMetricsQuery.data) {
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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.26em] text-[var(--accent)]">CEO / Day 6</p>
          <h1 className="mt-3 text-3xl font-semibold text-[var(--foreground)]">Dashboard, messages va payments</h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-[var(--muted-strong)]">
            CEO statistik kartalari, today metrics, broadcast message, messages list va payments CRUD bitta sahifaga
            yig`ildi.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => void refreshAll()}>
            Refresh
          </Button>
          <Button variant="ghost" onClick={() => setIsBroadcastOpen(true)}>
            Send message all
          </Button>
          <Button onClick={openCreatePaymentModal}>Create payment</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Users" value={formatCompactNumber(statistics?.user_count ?? 0)} />
        <MetricCard label="Need to call" value={formatCompactNumber(metrics?.need_to_call_count ?? 0)} />
        <MetricCard
          label="Due today"
          value={formatCompactNumber(metrics?.due_payments_today ?? 0)}
          caption="Unpaid payment rows for today"
        />
        <MetricCard
          label="Total balance"
          value={metrics?.total_balance_formatted ?? formatCurrency(metrics?.total_balance_uzs ?? 0)}
          caption="Latest DB exchange rate bilan"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="p-6">
          <SectionTitle
            eyebrow="Today metrics"
            title="Bugungi customerlar"
            description="Today metrics endpointdan kelgan customerlar ro`yxati va operativ ko`rsatkichlar."
          />
          <div className="mt-6">
            <DataTable
              caption="Today customers"
              rows={metrics?.today_customers ?? []}
              getRowKey={(row) => String(row.id)}
              emptyState={
                <EmptyStateBlock
                  eyebrow="Today customers"
                  title="Bugungi customer yo`q"
                  description="Today metrics endpoint bo`sh ro`yxat qaytardi."
                />
              }
              columns={[
                {
                  key: 'full_name',
                  header: 'Customer',
                  render: (row) => (
                    <div>
                      <p className="font-semibold text-[var(--foreground)]">{row.full_name}</p>
                      <p className="text-xs text-[var(--muted)]">{row.platform}</p>
                    </div>
                  ),
                },
                { key: 'status', header: 'Status', render: (row) => row.status },
                { key: 'assistant', header: 'Assistant', render: (row) => row.assistant_name || '-' },
                { key: 'created_at', header: 'Created', render: (row) => formatShortDate(row.created_at) },
              ]}
            />
          </div>
        </Card>

        <Card className="p-6">
          <SectionTitle
            eyebrow="Summary"
            title="CEO quick snapshot"
            description="Users, messages va payments bo`yicha tezkor jamlama."
          />
          <div className="mt-6 grid gap-3">
            <div className="rounded-[18px] border border-white/10 bg-[var(--card)] px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#3b82f6]">Messages sent</p>
              <p className="mt-3 text-xl font-semibold text-[var(--foreground)]">{messages.length}</p>
            </div>
            <div className="rounded-[18px] border border-white/10 bg-[var(--card)] px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#3b82f6]">Payments rows</p>
              <p className="mt-3 text-xl font-semibold text-[var(--foreground)]">{payments.length}</p>
            </div>
            <div className="rounded-[18px] border border-white/10 bg-[var(--card)] px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#3b82f6]">Planned amount</p>
              <p className="mt-3 text-xl font-semibold text-[var(--foreground)]">{formatCurrency(totalPlannedPayments)}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-6">
          <SectionTitle
            eyebrow="Messages"
            title="CEO sent messages"
            description="Broadcast va userga yuborilgan xabarlar shu listdan delete qilinadi."
          />
          <div className="mt-6">
            <DataTable
              caption="CEO messages list"
              rows={messages}
              getRowKey={(row) => String(row.id)}
              emptyState={
                <EmptyStateBlock
                  eyebrow="Messages"
                  title="Xabarlar yo`q"
                  description="Hozircha CEO tomonidan yuborilgan message topilmadi."
                />
              }
              columns={[
                {
                  key: 'receiver',
                  header: 'Receiver',
                  render: (row) => (
                    <div>
                      <p className="font-semibold text-[var(--foreground)]">{row.receiver_name}</p>
                      <p className="text-xs text-[var(--muted)]">{row.receiver_email}</p>
                    </div>
                  ),
                },
                { key: 'subject', header: 'Subject', render: (row) => row.subject },
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
          <SectionTitle
            eyebrow="Payments"
            title="CEO payments list"
            description="Create, edit, toggle va delete amallari payments table ichida ulandi."
          />
          <div className="mt-6">
            <DataTable
              caption="CEO payments list"
              rows={payments}
              getRowKey={(row) => String(row.id)}
              emptyState={
                <EmptyStateBlock
                  eyebrow="Payments"
                  title="To`lovlar yo`q"
                  description="Hozircha CEO payments endpoint bo`sh ro`yxat qaytardi."
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
                    <span className={row.payment ? 'font-semibold text-emerald-400' : 'font-semibold text-amber-300'}>
                      {row.payment ? 'Paid' : 'Pending'}
                    </span>
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
    </section>
  )
}
