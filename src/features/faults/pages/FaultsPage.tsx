import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { CeoUserRecord } from '../../../shared/api/services/ceo.service'
import { membersService } from '../../../shared/api/services/members.service'
import { updateTrackingService, type WorkdayOverrideMemberOption } from '../../../shared/api/services/updateTracking.service'
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
import { DetailStatTile, RefreshIcon } from '../components/SalaryEstimatePrimitives'
import {
  buildEmployeeReports,
  defaultMonth,
  defaultYear,
  type EmployeeSalaryReport,
  formatCount,
  findFirstNumber,
  findFirstRecord,
  formatAmount,
  formatPercent,
  getMonthName,
  getSuccessMessage,
  isRecord,
  monthOptions,
  parseMaybeJson,
} from '../lib/salaryEstimates'

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function parsePeriodNumber(value: string | null, fallback: number, min: number, max: number) {
  if (!value?.trim()) {
    return fallback
  }

  const parsed = Number(value)

  if (!Number.isFinite(parsed)) {
    return fallback
  }

  return clampNumber(parsed, min, max)
}

type EmployeeApiSummary = {
  totalEmployees?: number
  totalReports?: number
  averageUpdatePercentage?: number
  totalSalaryAmount?: number
  totalBaseSalary?: number
  totalDeductionAmount?: number
  totalBonusAmount?: number
  totalFinalSalary?: number
  totalEstimatedSalary?: number
  employeesWithPenalties?: number
  employeesWithBonuses?: number
}

function createRosterUsers(memberOptions: WorkdayOverrideMemberOption[]): CeoUserRecord[] {
  return memberOptions.map((member) => ({
    id: member.id,
    email: '',
    name: member.name,
    surname: member.surname,
    company_code: '',
    telegram_id: member.telegram_id ?? null,
    default_salary: null,
    role: member.role,
    job_title: member.role,
    is_active: true,
  }))
}

function extractEmployeeApiSummary(payload: unknown): EmployeeApiSummary {
  const parsed = parseMaybeJson(payload)
  const root = isRecord(parsed) ? parsed : null
  const nestedData = root && isRecord(root.data) ? root.data : null
  const summary =
    root && isRecord(root.summary)
      ? root.summary
      : nestedData && isRecord(nestedData.summary)
        ? nestedData.summary
        : null
  const salarySummary = summary
    ? findFirstRecord(summary, ['salary_estimate_summary', 'salary_summary', 'salary_estimates_summary'])
    : null

  return {
    totalEmployees: summary ? findFirstNumber(summary, ['total_employees']) : undefined,
    totalReports: summary ? findFirstNumber(summary, ['total_reports']) : undefined,
    averageUpdatePercentage: summary ? findFirstNumber(summary, ['average_update_percentage']) : undefined,
    totalSalaryAmount:
      (summary ? findFirstNumber(summary, ['total_salary_amount']) : undefined) ??
      (salarySummary ? findFirstNumber(salarySummary, ['total_salary_amount', 'total_final_salary', 'final_salary_total']) : undefined),
    totalBaseSalary:
      (salarySummary ? findFirstNumber(salarySummary, ['total_base_salary', 'base_salary_total', 'base_salary']) : undefined),
    totalDeductionAmount:
      (salarySummary ? findFirstNumber(salarySummary, ['total_deduction_amount', 'deduction_amount_total', 'deduction_total']) : undefined),
    totalBonusAmount:
      (salarySummary ? findFirstNumber(salarySummary, ['total_bonus_amount', 'bonus_amount_total', 'bonus_total']) : undefined),
    totalFinalSalary:
      (salarySummary ? findFirstNumber(salarySummary, ['total_final_salary', 'final_salary_total']) : undefined),
    totalEstimatedSalary:
      (salarySummary ? findFirstNumber(salarySummary, ['total_estimated_salary', 'estimated_salary_total', 'salary_estimate_total']) : undefined),
    employeesWithPenalties:
      (salarySummary ? findFirstNumber(salarySummary, ['employees_with_penalties', 'penalty_employee_count', 'employees_with_deductions']) : undefined),
    employeesWithBonuses:
      (salarySummary ? findFirstNumber(salarySummary, ['employees_with_bonuses', 'bonus_employee_count']) : undefined),
  }
}

export function FaultsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { showToast } = useToast()
  const [penaltyTarget, setPenaltyTarget] = useState<EmployeeSalaryReport | null>(null)
  const [penaltyPoints, setPenaltyPoints] = useState('10')
  const [penaltyReason, setPenaltyReason] = useState('')
  const [bonusTarget, setBonusTarget] = useState<EmployeeSalaryReport | null>(null)
  const [bonusAmount, setBonusAmount] = useState('')
  const [bonusReason, setBonusReason] = useState('')
  const [isPenaltySubmitting, setIsPenaltySubmitting] = useState(false)
  const [isBonusSubmitting, setIsBonusSubmitting] = useState(false)
  const year = parsePeriodNumber(searchParams.get('year'), defaultYear, 2020, 2035)
  const month = parsePeriodNumber(searchParams.get('month'), defaultMonth, 1, 12)
  const memberOptionsQuery = useAsyncData(
    () => updateTrackingService.workdayOverrideMemberOptions(),
    [],
  )
  const rosterUsers = useMemo(
    () => createRosterUsers(memberOptionsQuery.data ?? []),
    [memberOptionsQuery.data],
  )
  const employeeIds = useMemo(
    () => rosterUsers.map((user) => user.id),
    [rosterUsers],
  )

  const updatesAllQuery = useAsyncData(
    () => membersService.updatesAll({ year, month }),
    [year, month],
    {
      onError: (error) => {
        showToast({
          title: 'Employee updates API failed',
          description: getApiErrorMessage(error),
          tone: 'error',
        })
      },
    },
  )

  const statisticsQuery = useAsyncData(
    () => membersService.updatesStatistics({ year, month }),
    [year, month],
    {
      onError: (error) => {
        showToast({
          title: 'Employee summary API failed',
          description: getApiErrorMessage(error),
          tone: 'error',
        })
      },
    },
  )
  const salaryEstimatesQuery = useAsyncData(
    () => membersService.salaryEstimates({ year, month, employeeIds }),
    [year, month, employeeIds.join(',')],
    {
      enabled: employeeIds.length > 0,
      onError: (error) => {
        showToast({
          title: 'Employee salary estimates API failed',
          description: getApiErrorMessage(error),
          tone: 'error',
        })
      },
    },
  )

  const reports = useMemo(
    () => buildEmployeeReports(rosterUsers, salaryEstimatesQuery.data ?? updatesAllQuery.data, { includeFallbackUsers: true }),
    [rosterUsers, salaryEstimatesQuery.data, updatesAllQuery.data],
  )
  const apiSummary = useMemo(
    () => {
      const statisticsSummary = extractEmployeeApiSummary(statisticsQuery.data)
      const salarySummary = extractEmployeeApiSummary(salaryEstimatesQuery.data)

      return {
        totalEmployees: salarySummary.totalEmployees ?? statisticsSummary.totalEmployees,
        totalReports: statisticsSummary.totalReports,
        averageUpdatePercentage: statisticsSummary.averageUpdatePercentage,
        totalSalaryAmount: salarySummary.totalSalaryAmount ?? statisticsSummary.totalSalaryAmount,
        totalBaseSalary: salarySummary.totalBaseSalary ?? statisticsSummary.totalBaseSalary,
        totalDeductionAmount: salarySummary.totalDeductionAmount ?? statisticsSummary.totalDeductionAmount,
        totalBonusAmount: salarySummary.totalBonusAmount ?? statisticsSummary.totalBonusAmount,
        totalFinalSalary: salarySummary.totalFinalSalary ?? statisticsSummary.totalFinalSalary,
        totalEstimatedSalary: salarySummary.totalEstimatedSalary ?? statisticsSummary.totalEstimatedSalary,
        employeesWithPenalties: statisticsSummary.employeesWithPenalties,
        employeesWithBonuses: statisticsSummary.employeesWithBonuses,
      } satisfies EmployeeApiSummary
    },
    [salaryEstimatesQuery.data, statisticsQuery.data],
  )
  const hasReports = reports.length > 0

  async function handleRefresh() {
    const [membersResult, updatesResult, statisticsResult, salaryResult] = await Promise.allSettled([
      memberOptionsQuery.refetch(),
      updatesAllQuery.refetch(),
      statisticsQuery.refetch(),
      employeeIds.length > 0 ? salaryEstimatesQuery.refetch() : Promise.resolve(undefined),
    ])

    if (
      membersResult.status === 'rejected' &&
      updatesResult.status === 'rejected' &&
      statisticsResult.status === 'rejected' &&
      salaryResult.status === 'rejected'
    ) {
      showToast({
        title: 'Refresh failed',
        description: getApiErrorMessage(
          membersResult.reason ?? updatesResult.reason ?? statisticsResult.reason ?? salaryResult.reason,
        ),
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

  function openBonusDialog(report: EmployeeSalaryReport) {
    setBonusTarget(report)
    setBonusAmount('')
    setBonusReason('')
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

      await Promise.all([updatesAllQuery.refetch(), statisticsQuery.refetch()])
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

  async function handleSubmitBonus() {
    if (!bonusTarget) {
      return
    }

    const parsedAmount = Number(bonusAmount)

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      showToast({
        title: 'Invalid bonus amount',
        description: 'Bonus amount must be greater than 0.',
        tone: 'error',
      })
      return
    }

    setIsBonusSubmitting(true)

    try {
      const response = await membersService.addBonus({
        userId: bonusTarget.id,
        year,
        month,
        bonusAmount: parsedAmount,
        reason: bonusReason.trim() || undefined,
      })

      await Promise.all([updatesAllQuery.refetch(), statisticsQuery.refetch()])
      setBonusTarget(null)
      showToast({
        title: 'Bonus added',
        description: getSuccessMessage(response, `${bonusTarget.fullName} updated.`),
        tone: 'success',
      })
    } catch (error) {
      showToast({
        title: 'Bonus not added',
        description: getApiErrorMessage(error),
        tone: 'error',
      })
    } finally {
      setIsBonusSubmitting(false)
    }
  }

  if (!hasReports && (memberOptionsQuery.isLoading || updatesAllQuery.isLoading || statisticsQuery.isLoading || salaryEstimatesQuery.isLoading)) {
    return (
      <LoadingStateBlock
        eyebrow="CEO / Salary"
        title="Loading employee salary report"
        description="Fetching employee monthly salary and update statistics from the Employees API."
      />
    )
  }

  if (!hasReports && updatesAllQuery.isError && salaryEstimatesQuery.isError) {
    return (
      <ErrorStateBlock
        eyebrow="CEO / Salary"
        title="Salary report unavailable"
        description="Could not fetch employee monthly salary data from the Employees API."
        actionLabel="Retry"
        onAction={() => {
          void handleRefresh()
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
                  variant={(apiSummary.employeesWithPenalties ?? 0) > 0 ? 'danger' : 'outline'}
                  className="rounded-full px-3 py-1 text-xs"
                >
                  {formatCount(apiSummary.employeesWithPenalties)} with penalties
                </Badge>
                <Badge
                  variant={(apiSummary.employeesWithBonuses ?? 0) > 0 ? 'success' : 'outline'}
                  className="rounded-full px-3 py-1 text-xs"
                >
                  {formatCount(apiSummary.employeesWithBonuses)} with bonuses
                </Badge>
                <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">Employee API summary</Badge>
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
              render: (row) => <span className="text-rose-400">{formatCount(row.penaltyEntries)}</span>,
            },
            {
              key: 'bonuses',
              header: 'Bonuses',
              align: 'right',
              render: (row) => <span className="text-emerald-400">{formatCount(row.bonusEntries)}</span>,
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
              render: (row) => <span className="text-rose-400">{formatCount(row.penaltyPoints)}</span>,
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
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => openBonusDialog(row)}
                    className="rounded-lg"
                  >
                    Add bonus
                  </Button>
                </div>
              ),
            },
          ]}
        />
      </Card>

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
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => openBonusDialog(report)}
                    className="rounded-xl"
                  >
                    Add bonus
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
              <DetailStatTile label="Penalty points" value={formatCount(report.penaltyPoints)} tone="danger" />
              <DetailStatTile label="Penalty entries" value={formatCount(report.penaltyEntries)} tone="danger" />
              <DetailStatTile label="Bonus entries" value={formatCount(report.bonusEntries)} tone="success" />
            </div>

            <div className="border-t border-white/8 px-5 py-4">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-rose-300">Penalty percentage</span>
                <span className={cn('font-semibold', (report.penaltyPercentage ?? 0) > 0 ? 'text-rose-400' : 'text-white')}>
                  {formatPercent(report.penaltyPercentage)}
                </span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-white/7">
                <div
                  className="h-full rounded-full bg-rose-500 transition-[width] duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, Number.isFinite(report.penaltyPercentage) ? report.penaltyPercentage : 0))}%` }}
                />
              </div>
            </div>
          </Card>
        ))}
      </div>

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

      <Dialog
        open={Boolean(bonusTarget)}
        onClose={() => setBonusTarget(null)}
        title={bonusTarget ? `Add bonus for ${bonusTarget.fullName}` : 'Add bonus'}
        description={bonusTarget ? `${getMonthName(month)} ${year} monthly bonus entry.` : undefined}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setBonusTarget(null)}
              disabled={isBonusSubmitting}
            >
              Cancel
            </Button>
            <Button variant="success" onClick={() => void handleSubmitBonus()} loading={isBonusSubmitting}>
              Save bonus
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <div className="rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3">
            <p className="text-xs text-[var(--muted-strong)]">Employee</p>
            <p className="mt-2 text-base font-semibold text-white">{bonusTarget?.fullName ?? '-'}</p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-white">Bonus amount</label>
            <Input
              type="number"
              min="1"
              value={bonusAmount}
              onChange={(event) => setBonusAmount(event.target.value)}
              placeholder="Enter bonus amount"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-white">Reason</label>
            <Textarea
              value={bonusReason}
              onChange={(event) => setBonusReason(event.target.value)}
              placeholder="Optional bonus reason"
            />
          </div>
        </div>
      </Dialog>
    </section>
  )
}
