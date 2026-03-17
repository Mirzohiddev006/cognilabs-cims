import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ceoService } from '../../../shared/api/services/ceo.service'
import { membersService } from '../../../shared/api/services/members.service'
import { useAsyncData } from '../../../shared/hooks/useAsyncData'
import { getApiErrorMessage } from '../../../shared/lib/api-error'
import { cn } from '../../../shared/lib/cn'
import { useToast } from '../../../shared/toast/useToast'
import { Badge } from '../../../shared/ui/badge'
import { Button } from '../../../shared/ui/button'
import { Card } from '../../../shared/ui/card'
import { DataTable } from '../../../shared/ui/data-table'
import { Dialog } from '../../../shared/ui/dialog'
import { Input } from '../../../shared/ui/input'
import { SelectField } from '../../../shared/ui/select-field'
import { EmptyStateBlock, ErrorStateBlock, LoadingStateBlock } from '../../../shared/ui/state-block'
import { Textarea } from '../../../shared/ui/textarea'
import { DetailStatTile, RefreshIcon, SummaryMetricCard } from '../components/SalaryEstimatePrimitives'
import {
  buildEmployeeReports,
  defaultMonth,
  defaultYear,
  type EmployeeSalaryReport,
  extractEstimateEntries,
  formatAmount,
  formatPercent,
  getMonthName,
  getSuccessMessage,
  isEmployeeUser,
  monthOptions,
} from '../lib/salaryEstimates'

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function parsePeriodNumber(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number(value)

  if (!Number.isFinite(parsed)) {
    return fallback
  }

  return clampNumber(parsed, min, max)
}

export function FaultsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { showToast } = useToast()
  const [penaltyTarget, setPenaltyTarget] = useState<EmployeeSalaryReport | null>(null)
  const [penaltyPoints, setPenaltyPoints] = useState('10')
  const [penaltyReason, setPenaltyReason] = useState('')
  const [isPenaltySubmitting, setIsPenaltySubmitting] = useState(false)
  const year = parsePeriodNumber(searchParams.get('year'), defaultYear, 2020, 2035)
  const month = parsePeriodNumber(searchParams.get('month'), defaultMonth, 1, 12)

  const dashboardQuery = useAsyncData(() => ceoService.getDashboard(), [])

  const employeeUsers = useMemo(
    () => (dashboardQuery.data?.users ?? []).filter(isEmployeeUser),
    [dashboardQuery.data?.users],
  )

  const salaryQuery = useAsyncData(
    () => membersService.salaryEstimates({ year, month }),
    [year, month],
    {
      onError: (error) => {
        showToast({
          title: 'Salary estimate API failed',
          description: getApiErrorMessage(error, 'Employee default salary fallback mode is active.'),
          tone: 'error',
        })
      },
    },
  )

  const liveEstimateEntries = useMemo(
    () => extractEstimateEntries(salaryQuery.data),
    [salaryQuery.data],
  )
  const isUsingLiveEstimateData = liveEstimateEntries.length > 0

  const reports = useMemo(
    () => buildEmployeeReports(employeeUsers, salaryQuery.data, { includeFallbackUsers: !isUsingLiveEstimateData }),
    [employeeUsers, salaryQuery.data, isUsingLiveEstimateData],
  )

  const employeesWithPenalties = reports.filter((report) => report.hasPenalty).length
  const employeesWithBonuses = reports.filter((report) => report.hasBonus).length
  const totalBaseSalary = reports.reduce((total, report) => total + report.baseSalary, 0)
  const totalDeductionAmount = reports.reduce((total, report) => total + report.deductionAmount, 0)
  const totalBonusAmount = reports.reduce((total, report) => total + report.bonusAmount, 0)
  const totalFinalSalary = reports.reduce((total, report) => total + report.finalSalary, 0)
  const totalEstimatedSalary = reports.reduce((total, report) => total + report.estimatedSalary, 0)
  const hasReports = reports.length > 0

  async function handleRefresh() {
    const [dashboardResult, salaryResult] = await Promise.allSettled([
      dashboardQuery.refetch(),
      salaryQuery.refetch(),
    ])

    if (dashboardResult.status === 'rejected' && salaryResult.status === 'rejected') {
      showToast({
        title: 'Refresh failed',
        description: getApiErrorMessage(salaryResult.reason ?? dashboardResult.reason),
        tone: 'error',
      })
      return
    }

    showToast({
      title: 'Salary report refreshed',
      description: `${getMonthName(month)} ${year} report updated.`,
      tone: 'success',
    })
  }

  function openPenaltyDialog(report: EmployeeSalaryReport) {
    setPenaltyTarget(report)
    setPenaltyPoints('10')
    setPenaltyReason('')
  }

  function updatePeriod(next: { year?: number; month?: number }) {
    const nextYear = next.year ?? year
    const nextMonth = next.month ?? month
    setSearchParams({
      year: String(nextYear),
      month: String(nextMonth),
    }, { replace: true })
  }

  function openDetailPage(report: EmployeeSalaryReport) {
    navigate(`/faults/members/${report.id}?year=${year}&month=${month}`)
  }

  async function handleSubmitPenalty() {
    if (!penaltyTarget) {
      return
    }

    const parsedPoints = Number(penaltyPoints)

    if (!Number.isFinite(parsedPoints) || parsedPoints <= 0 || parsedPoints > 100) {
      showToast({
        title: 'Invalid penalty points',
        description: 'Penalty points must be between 1 and 100.',
        tone: 'error',
      })
      return
    }

    setIsPenaltySubmitting(true)

    try {
      const response = await membersService.addPenalty({
        userId: penaltyTarget.id,
        year,
        month,
        penaltyPoints: parsedPoints,
        reason: penaltyReason.trim() || undefined,
      })

      await salaryQuery.refetch()
      setPenaltyTarget(null)
      showToast({
        title: 'Penalty added',
        description: getSuccessMessage(response, `${penaltyTarget.fullName} updated.`),
        tone: 'success',
      })
    } catch (error) {
      showToast({
        title: 'Penalty not added',
        description: getApiErrorMessage(error),
        tone: 'error',
      })
    } finally {
      setIsPenaltySubmitting(false)
    }
  }

  if (!hasReports && (salaryQuery.isLoading || dashboardQuery.isLoading)) {
    return (
      <LoadingStateBlock
        eyebrow="CEO / Salary"
        title="Loading employee salary report"
        description="Fetching salary estimates from the Employees API."
      />
    )
  }

  if (!hasReports && salaryQuery.isError) {
    return (
      <ErrorStateBlock
        eyebrow="CEO / Salary"
        title="Salary report unavailable"
        description="Could not fetch salary estimates from the Employees API."
        actionLabel="Retry"
        onAction={() => {
          void salaryQuery.refetch()
        }}
      />
    )
  }

  if (!hasReports) {
    return (
      <EmptyStateBlock
        eyebrow="CEO / Salary"
        title="No salary estimates returned"
        description="The Employees API did not return any salary estimates for the selected period."
      />
    )
  }

  return (
    <section className="space-y-6 page-enter">
      <Card variant="glass" noPadding className="overflow-hidden rounded-[28px] border-orange-500/20">
        <div className="relative overflow-hidden px-6 py-6 sm:px-8 sm:py-7">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.16),transparent_38%),radial-gradient(circle_at_right,rgba(34,197,94,0.10),transparent_26%)]" />

          <div className="relative z-10 flex flex-col gap-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.02em] text-orange-200/80">
                  CEO Salary Estimates
                </p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
                  Salary Estimates, Penalties and Bonuses
                </h1>
                <p className="mt-3 max-w-3xl text-sm text-[var(--muted-strong)]">
                  Monthly breakdown for active employees. Open a member to inspect the full salary detail on its own page.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">
                  {month}/{year}
                </Badge>
                <Badge
                  variant={employeesWithPenalties > 0 ? 'danger' : 'outline'}
                  className="rounded-full px-3 py-1 text-xs"
                >
                  {employeesWithPenalties} with penalties
                </Badge>
                <Badge
                  variant={employeesWithBonuses > 0 ? 'success' : 'outline'}
                  className="rounded-full px-3 py-1 text-xs"
                >
                  {employeesWithBonuses} with bonuses
                </Badge>
                <Badge
                  variant={isUsingLiveEstimateData ? 'success' : 'secondary'}
                  className="rounded-full px-3 py-1 text-xs"
                >
                  {isUsingLiveEstimateData ? 'Live estimates' : 'Default salary fallback'}
                </Badge>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
              <div>
                <label className="mb-2 block text-sm font-semibold text-white">Year</label>
                <Input
                  type="number"
                  min="2020"
                  max="2035"
                  value={year}
                  onChange={(event) => updatePeriod({ year: clampNumber(Number(event.target.value) || defaultYear, 2020, 2035) })}
                  className="rounded-xl border-white/10 bg-white/[0.03]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-white">Month</label>
                <SelectField
                  value={String(month)}
                  options={monthOptions}
                  onValueChange={(value) => updatePeriod({ month: clampNumber(Number(value), 1, 12) })}
                  className="rounded-xl border-white/10 bg-white/[0.03]"
                />
              </div>

              <div className="md:self-end">
                <Button
                  variant="secondary"
                  size="lg"
                  leftIcon={<RefreshIcon />}
                  onClick={() => void handleRefresh()}
                  className="w-full justify-center rounded-xl border-white/10 bg-white/[0.03] md:w-auto"
                >
                  Refresh
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
        <SummaryMetricCard label="Employees in report" value={reports.length} />
        <SummaryMetricCard label="Total base salary" value={formatAmount(totalBaseSalary)} />
        <SummaryMetricCard
          label="Total deduction amount"
          value={formatAmount(totalDeductionAmount)}
          tone="danger"
          badge={employeesWithPenalties > 0 ? 'Deductions present' : 'No deductions'}
        />
        <SummaryMetricCard
          label="Total bonus amount"
          value={formatAmount(totalBonusAmount)}
          tone="success"
          badge={employeesWithBonuses > 0 ? 'Bonuses present' : 'No bonuses'}
        />
        <SummaryMetricCard label="Employees with penalties" value={employeesWithPenalties} />
        <SummaryMetricCard label="Total final salary" value={formatAmount(totalFinalSalary)} />
        <SummaryMetricCard label="Total estimated salary" value={formatAmount(totalEstimatedSalary)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {reports.map((report) => (
          <Card
            key={`${report.id}-${report.fullName}`}
            className="overflow-hidden rounded-[24px] border-white/10 bg-[linear-gradient(180deg,rgba(24,24,28,0.98),rgba(16,16,19,0.98))] p-0"
          >
            <div className="border-b border-white/8 px-5 py-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm text-[var(--muted-strong)]">{report.label}</p>
                  <h2 className="mt-2 text-[1.9rem] font-semibold tracking-tight text-white">
                    {report.fullName}
                  </h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">{report.roleLabel}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={report.hasPenalty ? 'danger' : 'outline'}>
                    {report.hasPenalty ? 'Has deduction' : 'Clean'}
                  </Badge>
                  <Badge variant={report.hasBonus ? 'success' : 'outline'}>
                    {report.hasBonus ? 'Has bonus' : 'No bonus'}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openDetailPage(report)}
                    className="rounded-xl"
                  >
                    View details
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => openPenaltyDialog(report)}
                    className="rounded-xl"
                  >
                    Add penalty
                  </Button>
                </div>
              </div>
            </div>
            <div className="grid gap-3 px-5 py-5 sm:grid-cols-3">
              <DetailStatTile label="Final salary" value={formatAmount(report.finalSalary)} />
              <DetailStatTile label="Estimated salary" value={formatAmount(report.estimatedSalary)} />
              <DetailStatTile label="Deduction" value={formatAmount(report.deductionAmount)} tone="danger" />
              <DetailStatTile label="Base salary" value={formatAmount(report.baseSalary)} />
              <DetailStatTile label="After penalty" value={formatAmount(report.afterPenalty)} />
              <DetailStatTile label="Bonus amount" value={formatAmount(report.bonusAmount)} tone="success" />
              <DetailStatTile label="Penalty points" value={report.penaltyPoints} tone="danger" />
              <DetailStatTile label="Penalty entries" value={report.penaltyEntries} tone="danger" />
              <DetailStatTile label="Bonus entries" value={report.bonusEntries} tone="success" />
            </div>

            <div className="border-t border-white/8 px-5 py-4">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-rose-300">Penalty percentage</span>
                <span className={cn('font-semibold', report.penaltyPercentage > 0 ? 'text-rose-400' : 'text-white')}>
                  {formatPercent(report.penaltyPercentage)}
                </span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-white/7">
                <div
                  className="h-full rounded-full bg-rose-500 transition-[width] duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, report.penaltyPercentage))}%` }}
                />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="rounded-[24px] border-white/10 p-6">
        <div className="mb-5 flex flex-col gap-2">
          <h2 className="text-2xl font-semibold tracking-tight text-white">All Members</h2>
          <p className="text-sm text-[var(--muted-strong)]">
            Detailed salary-estimate breakdown for the selected period.
          </p>
        </div>

        <DataTable
          caption="Salary estimate breakdown"
          rows={reports}
          pageSize={8}
          compact
          zebra
          getRowKey={(row) => `${row.id}-${row.fullName}`}
          columns={[
            {
              key: 'user',
              header: 'User',
              width: '280px',
              render: (row) => (
                <div>
                  <p className="font-semibold text-white">{row.fullName}</p>
                  <p className="text-xs text-[var(--muted)]">{row.label}</p>
                </div>
              ),
            },
            {
              key: 'penalties',
              header: 'Penalties',
              align: 'right',
              render: (row) => <span className="text-rose-400">{row.penaltyEntries}</span>,
            },
            {
              key: 'bonuses',
              header: 'Bonuses',
              align: 'right',
              render: (row) => <span className="text-emerald-400">{row.bonusEntries}</span>,
            },
            {
              key: 'base',
              header: 'Base',
              align: 'right',
              render: (row) => formatAmount(row.baseSalary),
            },
            {
              key: 'penaltyPct',
              header: 'Penalty %',
              align: 'right',
              render: (row) => (
                <span className={cn(row.penaltyPercentage > 0 ? 'text-rose-400' : 'text-white')}>
                  {formatPercent(row.penaltyPercentage)}
                </span>
              ),
            },
            {
              key: 'points',
              header: 'Points',
              align: 'right',
              render: (row) => <span className="text-rose-400">{row.penaltyPoints}</span>,
            },
            {
              key: 'deduction',
              header: 'Deduction',
              align: 'right',
              render: (row) => <span className="text-rose-400">{formatAmount(row.deductionAmount)}</span>,
            },
            {
              key: 'afterPenalty',
              header: 'After penalty',
              align: 'right',
              render: (row) => formatAmount(row.afterPenalty),
            },
            {
              key: 'bonusAmount',
              header: 'Bonus amount',
              align: 'right',
              render: (row) => <span className="text-emerald-400">{formatAmount(row.bonusAmount)}</span>,
            },
            {
              key: 'finalSalary',
              header: 'Final salary',
              align: 'right',
              render: (row) => formatAmount(row.finalSalary),
            },
            {
              key: 'actions',
              header: 'Actions',
              align: 'right',
              render: (row) => (
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openDetailPage(row)}
                    className="rounded-lg"
                  >
                    View details
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => openPenaltyDialog(row)}
                    className="rounded-lg"
                  >
                    Add penalty
                  </Button>
                </div>
              ),
            },
          ]}
        />
      </Card>

      <Dialog
        open={Boolean(penaltyTarget)}
        onClose={() => setPenaltyTarget(null)}
        title={penaltyTarget ? `Add penalty for ${penaltyTarget.fullName}` : 'Add penalty'}
        description={penaltyTarget ? `${getMonthName(month)} ${year} monthly penalty entry.` : undefined}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setPenaltyTarget(null)}
              disabled={isPenaltySubmitting}
            >
              Cancel
            </Button>
            <Button onClick={() => void handleSubmitPenalty()} loading={isPenaltySubmitting}>
              Save penalty
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <div className="rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3">
            <p className="text-xs text-[var(--muted-strong)]">Employee</p>
            <p className="mt-2 text-base font-semibold text-white">{penaltyTarget?.fullName ?? '-'}</p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-white">Penalty points</label>
            <Input
              type="number"
              min="1"
              max="100"
              value={penaltyPoints}
              onChange={(event) => setPenaltyPoints(event.target.value)}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-white">Reason</label>
            <Textarea
              value={penaltyReason}
              onChange={(event) => setPenaltyReason(event.target.value)}
              placeholder="Optional penalty reason"
            />
          </div>
        </div>
      </Dialog>
    </section>
  )
}
