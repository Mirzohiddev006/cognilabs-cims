import { useState } from 'react'
import { financeService } from '../../../shared/api/services/finance.service'
import { useAsyncAction } from '../../../shared/hooks/useAsyncAction'
import { useAsyncData } from '../../../shared/hooks/useAsyncData'
import { getApiErrorMessage } from '../../../shared/lib/api-error'
import { formatCompactNumber, formatCurrency, formatShortDate } from '../../../shared/lib/format'
import { useToast } from '../../../shared/toast/useToast'
import { Badge } from '../../../shared/ui/badge'
import { Button } from '../../../shared/ui/button'
import { Card } from '../../../shared/ui/card'
import { DataTable } from '../../../shared/ui/data-table'
import { Input } from '../../../shared/ui/input'
import { SectionTitle } from '../../../shared/ui/section-title'
import { ErrorStateBlock, LoadingStateBlock } from '../../../shared/ui/state-block'

function formatAmount(value: number, currency: string) {
  try {
    return formatCurrency(value, currency)
  } catch {
    return `${value.toLocaleString('en-US')} ${currency}`
  }
}

function StatusBadge({ value }: { value: string }) {
  const normalized = value.toLowerCase()
  const className =
    normalized === 'real'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : normalized === 'statistical'
        ? 'border-amber-200 bg-amber-50 text-amber-700'
        : normalized === 'incomer'
          ? 'border-sky-200 bg-sky-50 text-sky-700'
          : normalized === 'outcome'
            ? 'border-rose-200 bg-rose-50 text-rose-700'
            : 'border-[var(--border)] bg-[var(--accent-soft)] text-[var(--foreground)]'

  return <Badge className={className}>{value.replaceAll('_', ' ')}</Badge>
}

export function FinanceDashboardPage() {
  const { showToast } = useToast()
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [card, setCard] = useState('')
  const [transactionStatus, setTransactionStatus] = useState('')

  const dashboardQuery = useAsyncData(() => financeService.dashboard(), [])
  const listQuery = useAsyncData(() => financeService.list(page, perPage), [page, perPage])
  const statsQuery = useAsyncData(
    () =>
      financeService.advancedStats({
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        card: card || undefined,
        transaction_status: transactionStatus || undefined,
      }),
    [dateFrom, dateTo, card, transactionStatus],
  )
  const syncRateAction = useAsyncAction(() => financeService.syncExchangeRate())

  async function refreshAll() {
    try {
      await Promise.all([dashboardQuery.refetch(), listQuery.refetch(), statsQuery.refetch()])
      showToast({
        title: 'Finance dashboard yangilandi',
        description: "Finance list, balances va stats qayta yuklandi.",
        tone: 'success',
      })
    } catch (error) {
      showToast({
        title: 'Refresh muvaffaqiyatsiz',
        description: getApiErrorMessage(error),
        tone: 'error',
      })
    }
  }

  async function handleSyncExchangeRate() {
    try {
      await syncRateAction.run()
      await Promise.all([dashboardQuery.refetch(), statsQuery.refetch()])
      showToast({
        title: 'Kurs yangilandi',
        description: 'USD -> UZS kursi backenddan qayta sinxronlandi.',
        tone: 'success',
      })
    } catch (error) {
      showToast({
        title: 'Kurs sinxronlanmadi',
        description: getApiErrorMessage(error),
        tone: 'error',
      })
    }
  }

  if (dashboardQuery.isLoading && !dashboardQuery.data) {
    return (
      <LoadingStateBlock
        eyebrow="Finance"
        title="Finance workspace yuklanmoqda"
        description="Dashboard balances, exchange rate va transactions backenddan olinmoqda."
      />
    )
  }

  if (dashboardQuery.isError && !dashboardQuery.data) {
    return (
      <ErrorStateBlock
        eyebrow="Finance"
        title="Finance workspace ochilmadi"
        description="Finance dashboard asosiy ma'lumotlari olinmadi."
        actionLabel="Retry"
        onAction={() => {
          void refreshAll()
        }}
      />
    )
  }

  const dashboard = dashboardQuery.data
  const stats = statsQuery.data
  const financeRows = listQuery.data?.finances ?? []
  const pagination = listQuery.data

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-[var(--muted)]">Finance</p>
          <h1 className="mt-2 text-4xl font-semibold text-[var(--foreground)]">Finance dashboard va transaction list</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted-strong)]">
            Balances, exchange rate, advanced stats va transaction list bitta sahifada jamlandi.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => void refreshAll()}>
            Refresh all
          </Button>
          <Button onClick={() => void handleSyncExchangeRate()} disabled={syncRateAction.isRunning}>
            {syncRateAction.isRunning ? 'Syncing...' : 'Sync exchange rate'}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Total balance</p>
          <p className="mt-3 text-3xl font-semibold text-[var(--foreground)]">{dashboard?.balances.total_balance ?? '-'}</p>
          <p className="mt-2 text-sm text-[var(--muted)]">All cards combined.</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Potential balance</p>
          <p className="mt-3 text-3xl font-semibold text-[var(--foreground)]">
            {dashboard?.balances.potential_balance ?? '-'}
          </p>
          <p className="mt-2 text-sm text-[var(--muted)]">Potential projection from dashboard.</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Donation balance</p>
          <p className="mt-3 text-3xl font-semibold text-[var(--foreground)]">
            {formatAmount(dashboard?.donation_balance ?? 0, 'UZS')}
          </p>
          <p className="mt-2 text-sm text-[var(--muted)]">Accumulated donation pool.</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Exchange rate</p>
          <p className="mt-3 text-3xl font-semibold text-[var(--foreground)]">{dashboard?.exchange_rate ?? '-'}</p>
          <p className="mt-2 text-sm text-[var(--muted)]">Current USD to UZS value.</p>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="p-6">
          <SectionTitle
            eyebrow="Advanced stats"
            title="Filterable finance summary"
            description="Date, card va transaction status bo'yicha finance statistikasi backenddan olinadi."
          />
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-[var(--foreground)]">Date from</span>
              <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium text-[var(--foreground)]">Date to</span>
              <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium text-[var(--foreground)]">Card</span>
              <select
                className="min-h-10 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)] outline-none ring-0"
                value={card}
                onChange={(event) => setCard(event.target.value)}
              >
                <option value="">All cards</option>
                <option value="card1">Card 1</option>
                <option value="card2">Card 2</option>
                <option value="card3">Card 3</option>
              </select>
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium text-[var(--foreground)]">Transaction status</span>
              <select
                className="min-h-10 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)] outline-none ring-0"
                value={transactionStatus}
                onChange={(event) => setTransactionStatus(event.target.value)}
              >
                <option value="">All statuses</option>
                <option value="real">Real</option>
                <option value="statistical">Statistical</option>
              </select>
            </label>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Income / Outcome</p>
              <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                {formatAmount(stats?.total_income ?? 0, 'UZS')} / {formatAmount(stats?.total_outcome ?? 0, 'UZS')}
              </p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Net / Donation</p>
              <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                {formatAmount(stats?.net_profit ?? 0, 'UZS')} / {formatAmount(stats?.total_donation ?? 0, 'UZS')}
              </p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Transactions</p>
              <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                {formatCompactNumber(stats?.transaction_count ?? 0)}
              </p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Counts</p>
              <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                {formatCompactNumber(stats?.income_count ?? 0)} income / {formatCompactNumber(stats?.outcome_count ?? 0)} outcome
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <SectionTitle
            eyebrow="Cards"
            title="Balance distribution"
            description="Card balances va member card mapping finance dashboard javobidan olinadi."
          />
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Card 1</p>
              <p className="mt-2 text-xl font-semibold text-[var(--foreground)]">{dashboard?.balances.card1_balance ?? '-'}</p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Card 2</p>
              <p className="mt-2 text-xl font-semibold text-[var(--foreground)]">{dashboard?.balances.card2_balance ?? '-'}</p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Card 3</p>
              <p className="mt-2 text-xl font-semibold text-[var(--foreground)]">{dashboard?.balances.card3_balance ?? '-'}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-3">
            {dashboard?.member_data.map((member) => (
              <div key={`${member.name}-${member.surname}`} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  {member.name} {member.surname}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {member.cards.map((cardInfo) => (
                    <Badge key={cardInfo.card_number} className={cardInfo.is_primary ? 'border-sky-200 bg-sky-50 text-sky-700' : ''}>
                      {cardInfo.card_number} {cardInfo.is_primary ? '(Primary)' : ''}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionTitle
            eyebrow="Transactions"
            title="Finance list"
            description="Paginated transaction list real endpoint bilan ulandi."
          />
          <label className="grid gap-2">
            <span className="text-sm font-medium text-[var(--foreground)]">Per page</span>
            <select
              className="min-h-10 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)] outline-none ring-0"
              value={perPage}
              onChange={(event) => {
                setPerPage(Number(event.target.value))
                setPage(1)
              }}
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="30">30</option>
            </select>
          </label>
        </div>

        <div className="mt-6">
          {listQuery.isError && !financeRows.length ? (
            <ErrorStateBlock
              eyebrow="Transactions"
              title="Finance list ochilmadi"
              description={getApiErrorMessage(listQuery.error)}
              actionLabel="Retry"
              onAction={() => {
                void listQuery.refetch()
              }}
            />
          ) : listQuery.isLoading && !financeRows.length ? (
            <LoadingStateBlock
              eyebrow="Transactions"
              title="Finance list yuklanmoqda"
              description="Transactions list backenddan olinmoqda."
            />
          ) : (
            <DataTable
              caption="Finance transactions"
              rows={financeRows}
              getRowKey={(row) => String(row.id)}
              columns={[
                {
                  key: 'service',
                  header: 'Service',
                  render: (row) => (
                    <div>
                      <p className="font-medium text-[var(--foreground)]">{row.service}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <StatusBadge value={row.type} />
                        <StatusBadge value={row.transaction_status} />
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'card',
                  header: 'Card',
                  render: (row) => (
                    <div>
                      <p className="font-medium text-[var(--foreground)]">{row.card_display || row.card}</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">{row.status.replaceAll('_', ' ')}</p>
                    </div>
                  ),
                },
                {
                  key: 'amount',
                  header: 'Amount',
                  align: 'right',
                  render: (row) => formatAmount(row.summ, row.currency),
                },
                {
                  key: 'fees',
                  header: 'Fees',
                  align: 'right',
                  render: (row) => `${row.donation_percentage}% / ${row.tax_percentage}%`,
                },
                {
                  key: 'date',
                  header: 'Date',
                  render: (row) => (
                    <div>
                      <p className="font-medium text-[var(--foreground)]">{formatShortDate(row.date)}</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">Created {formatShortDate(row.initial_date)}</p>
                    </div>
                  ),
                },
              ]}
            />
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
          <p className="text-sm text-[var(--muted)]">
            Page {pagination?.page ?? page} / {pagination?.total_pages ?? 1} · Total {pagination?.total_count ?? financeRows.length}
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              disabled={!pagination?.has_prev}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              disabled={!pagination?.has_next}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>
    </section>
  )
}
