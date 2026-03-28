import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { CeoUserRecord } from '../../../shared/api/services/ceo.service'
import { membersService } from '../../../shared/api/services/members.service'
import { updateTrackingService, type WorkdayOverrideMemberOption } from '../../../shared/api/services/updateTracking.service'
import { useAsyncData } from '../../../shared/hooks/useAsyncData'
import { getApiErrorMessage } from '../../../shared/lib/api-error'
import { cn } from '../../../shared/lib/cn'
import { useToast } from '../../../shared/toast/useToast'
import { ActionsMenu } from '../../../shared/ui/actions-menu'
import { Badge } from '../../../shared/ui/badge'
import { Button } from '../../../shared/ui/button'
import { Card } from '../../../shared/ui/card'
import { DataTable } from '../../../shared/ui/data-table'
import { Dialog } from '../../../shared/ui/dialog'
import { Input } from '../../../shared/ui/input'
import { MemberAvatar } from '../../../shared/ui/member-avatar'
import { SelectField } from '../../../shared/ui/select-field'
import { EmptyStateBlock, ErrorStateBlock, LoadingStateBlock } from '../../../shared/ui/state-block'
import { Textarea } from '../../../shared/ui/textarea'
import { DetailStatTile, RefreshIcon } from '../components/SalaryEstimatePrimitives'
import { SalaryEstimateDrawer } from '../components/SalaryEstimateDrawer'
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
    profile_image: member.profile_image ?? null,
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
    totalEmployees: summary ? findFirstNumber(summary, ['total_employees', 'employees_count', 'employee_count']) : undefined,
    totalReports: summary ? findFirstNumber(summary, ['total_reports']) : undefined,
    averageUpdatePercentage: summary ? findFirstNumber(summary, ['average_update_percentage']) : undefined,
    totalSalaryAmount:
      (summary ? findFirstNumber(summary, ['total_salary_amount']) : undefined) ??
      (salarySummary ? findFirstNumber(salarySummary, ['total_salary_amount', 'total_final_salary', 'final_salary_total']) : undefined),
    totalBaseSalary:
      (salarySummary ? findFirstNumber(salarySummary, ['total_base_salary', 'base_salary_total', 'base_salary']) : undefined),
    totalDeductionAmount:
      (salarySummary ? findFirstNumber(salarySummary, ['total_applied_deduction_amount', 'total_deduction_amount', 'deduction_amount_total', 'deduction_total']) : undefined),
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
  const [activeReportId, setActiveReportId] = useState<number | null>(null)
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
  const rosterUsersById = useMemo(
    () => new Map(rosterUsers.map((user) => [user.id, user] satisfies [number, CeoUserRecord])),
    [rosterUsers],
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
      const derivedEmployeesWithPenalties = reports.filter((report) => report.hasPenalty).length
      const derivedEmployeesWithBonuses = reports.filter((report) => report.hasBonus).length

      return {
        totalEmployees: salarySummary.totalEmployees ?? statisticsSummary.totalEmployees ?? reports.length,
        totalReports: statisticsSummary.totalReports,
        averageUpdatePercentage: statisticsSummary.averageUpdatePercentage,
        totalSalaryAmount: salarySummary.totalSalaryAmount ?? statisticsSummary.totalSalaryAmount,
        totalBaseSalary: salarySummary.totalBaseSalary ?? statisticsSummary.totalBaseSalary,
        totalDeductionAmount: salarySummary.totalDeductionAmount ?? statisticsSummary.totalDeductionAmount,
        totalBonusAmount: salarySummary.totalBonusAmount ?? statisticsSummary.totalBonusAmount,
        totalFinalSalary: salarySummary.totalFinalSalary ?? statisticsSummary.totalFinalSalary,
        totalEstimatedSalary: salarySummary.totalEstimatedSalary ?? statisticsSummary.totalEstimatedSalary,
        employeesWithPenalties: statisticsSummary.employeesWithPenalties ?? derivedEmployeesWithPenalties,
        employeesWithBonuses: statisticsSummary.employeesWithBonuses ?? derivedEmployeesWithBonuses,
      } satisfies EmployeeApiSummary
    },
    [reports, salaryEstimatesQuery.data, statisticsQuery.data],
  )
  const activeDrawerReport = useMemo(
    () => reports.find((report) => report.id === activeReportId) ?? null,
    [activeReportId, reports],
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

  function openReportDrawer(report: EmployeeSalaryReport) {
    setActiveReportId(report.id)
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

      await Promise.all([updatesAllQuery.refetch(), statisticsQuery.refetch(), salaryEstimatesQuery.refetch()])
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

      await Promise.all([updatesAllQuery.refetch(), statisticsQuery.refetch(), salaryEstimatesQuery.refetch()])
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
      <Card variant="glass" noPadding className="page-header-card overflow-hidden rounded-[28px]">
        <div className="relative overflow-hidden px-6 py-6 sm:px-8 sm:py-7">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.22),transparent_72%)]" />
          <div className="pointer-events-none absolute -left-12 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -right-10 top-6 h-28 w-28 rounded-full bg-cyan-400/8 blur-3xl" />

          <div className="relative z-10 flex flex-col gap-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.02em] text-[var(--blue-text)]">
                  CEO Salary Estimates
                </p>
                <h1 className="page-header-title mt-2 text-3xl font-semibold tracking-tight">
                  Salary Estimates, Penalties and Bonuses
                </h1>
                <p className="mt-3 max-w-3xl text-sm text-[var(--muted)]">
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
                <label className="mb-2 block text-sm font-semibold text-[var(--foreground)]">Year</label>
                <Input
                  type="number"
                  min="2020"
                  max="2035"
                  value={year}
                  onChange={(event) => updatePeriod({ year: clampNumber(Number(event.target.value) || defaultYear, 2020, 2035) })}
                  className="rounded-xl"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-[var(--foreground)]">Month</label>
                <SelectField
                  value={String(month)}
                  options={monthOptions}
                  onValueChange={(value) => updatePeriod({ month: clampNumber(Number(value), 1, 12) })}
                  className="rounded-xl"
                />
              </div>

              <div className="md:self-end">
                <Button
                  variant="secondary"
                  size="lg"
                  leftIcon={<RefreshIcon />}
                  onClick={() => void handleRefresh()}
                  className="w-full justify-center rounded-xl md:w-auto"
                >
                  Refresh
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <DetailStatTile label="Employees" value={formatCount(apiSummary.totalEmployees)} />
        <DetailStatTile label="Base salary total" value={formatAmount(apiSummary.totalBaseSalary ?? 0)} />
        <DetailStatTile label="Applied deductions" value={formatAmount(apiSummary.totalDeductionAmount ?? 0)} tone="danger" />
        <DetailStatTile label="Bonus total" value={formatAmount(apiSummary.totalBonusAmount ?? 0)} tone="success" />
        <DetailStatTile label="Estimated total" value={formatAmount(apiSummary.totalEstimatedSalary ?? 0)} />
        <DetailStatTile label="Final salary total" value={formatAmount(apiSummary.totalFinalSalary ?? apiSummary.totalSalaryAmount ?? 0)} tone="success" />
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
          pageSize={75}
          compact
          zebra
          onRowClick={openReportDrawer}
          getRowKey={(row) => `${row.id}-${row.fullName}`}
          columns={[
            {
              key: 'user',
              header: 'User',
              width: '280px',
              render: (row) => {
                const rosterUser = rosterUsersById.get(row.id)

                return (
                  <button
                    type="button"
                    onClick={() => openReportDrawer(row)}
                    className="flex items-center gap-3 text-left transition hover:opacity-90"
                  >
                    <MemberAvatar
                      name={rosterUser?.name ?? row.fullName}
                      surname={rosterUser?.surname ?? ''}
                      imageUrl={rosterUser?.profile_image}
                      size="sm"
                      title={row.fullName}
                    />
                    <span className="min-w-0">
                      <p className="truncate font-semibold text-white transition-colors hover:text-blue-300">{row.fullName}</p>
                      <p className="truncate text-xs text-[var(--muted)]">{row.label}</p>
                    </span>
                  </button>
                )
              },
              minWidth: '260px',
            },
            {
              key: 'base',
              header: 'Base',
              align: 'right',
              minWidth: '120px',
              render: (row) => formatAmount(row.baseSalary),
            },
            {
              key: 'afterPenalty',
              header: 'After penalty',
              align: 'right',
              minWidth: '140px',
              render: (row) => formatAmount(row.afterPenalty),
            },
            {
              key: 'bonusAmount',
              header: 'Bonus amount',
              align: 'right',
              minWidth: '130px',
              render: (row) => <span className="text-emerald-400">{formatAmount(row.bonusAmount)}</span>,
            },
            {
              key: 'bonusPercent',
              header: 'Bonus %',
              align: 'right',
              minWidth: '110px',
              render: (row) => <span className={cn(row.totalBonusPercent > 0 ? 'text-emerald-400' : 'text-white')}>{formatPercent(row.totalBonusPercent)}</span>,
            },
            {
              key: 'productivity',
              header: 'Productivity',
              align: 'right',
              minWidth: '180px',
              render: (row) => (
                <span className={cn(row.qualifiesProductivityBonus ? 'text-emerald-400' : 'text-white')}>
                  {Number.isFinite(row.productivityPercentage)
                    ? `${formatCount(row.updateDays)}/${formatCount(row.workingDays)} / ${formatPercent(row.productivityPercentage)}`
                    : '-'}
                </span>
              ),
            },
            {
              key: 'finalSalary',
              header: 'Final salary',
              align: 'right',
              minWidth: '130px',
              render: (row) => formatAmount(row.finalSalary),
            },
            {
              key: 'actions',
              header: 'Actions',
              align: 'right',
              minWidth: '88px',
              render: (row) => (
                <div className="flex justify-end" onClick={(event) => event.stopPropagation()}>
                  <ActionsMenu
                    label={`Open actions for ${row.fullName}`}
                    items={[
                      {
                        label: 'View details',
                        onSelect: () => openDetailPage(row),
                      },
                      {
                        label: 'Add penalty',
                        onSelect: () => openPenaltyDialog(row),
                        tone: 'danger',
                      },
                      {
                        label: 'Add bonus',
                        onSelect: () => openBonusDialog(row),
                      },
                    ]}
                  />
                </div>
              ),
            },
          ]}
        />
      </Card>

      <SalaryEstimateDrawer
        open={Boolean(activeDrawerReport)}
        report={activeDrawerReport}
        month={month}
        year={year}
        onClose={() => setActiveReportId(null)}
        onOpenDetail={() => {
          if (!activeDrawerReport) {
            return
          }

          setActiveReportId(null)
          openDetailPage(activeDrawerReport)
        }}
        onAddPenalty={() => {
          if (!activeDrawerReport) {
            return
          }

          setActiveReportId(null)
          openPenaltyDialog(activeDrawerReport)
        }}
        onAddBonus={() => {
          if (!activeDrawerReport) {
            return
          }

          setActiveReportId(null)
          openBonusDialog(activeDrawerReport)
        }}
      />

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
