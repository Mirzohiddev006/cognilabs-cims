import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { membersService } from '../../../shared/api/services/members.service'
import { updateTrackingService } from '../../../shared/api/services/updateTracking.service'
import { useAsyncData } from '../../../shared/hooks/useAsyncData'
import { getApiErrorMessage } from '../../../shared/lib/api-error'
import { useToast } from '../../../shared/toast/useToast'
import { Badge } from '../../../shared/ui/badge'
import { Button } from '../../../shared/ui/button'
import { Card } from '../../../shared/ui/card'
import { Dialog } from '../../../shared/ui/dialog'
import { Input } from '../../../shared/ui/input'
import { SelectField } from '../../../shared/ui/select-field'
import { ErrorStateBlock, LoadingStateBlock } from '../../../shared/ui/state-block'
import { Textarea } from '../../../shared/ui/textarea'
import { MemberMonthlyUpdateCalendarBoard } from '../components/MemberMonthlyUpdateCalendar'
import { DetailStatTile, RefreshIcon } from '../components/SalaryEstimatePrimitives'
import {
  buildEmployeeSalaryDetail,
  buildEmployeeReports,
  buildReportFromUser,
  createVirtualUser,
  defaultMonth,
  defaultYear,
  findFirstRecord,
  formatAmount,
  formatCount,
  formatDetailDate,
  formatPercent,
  getEstimateRecordForMember,
  getMonthName,
  getSuccessMessage,
  isRecord,
  monthOptions,
  normalizeEstimateEntry,
  parseMaybeJson,
  resolveRecordDisplayName,
} from '../lib/salaryEstimates'

type FaultsMemberDetailPageMode = 'salary-detail' | 'member-updates'

type FaultsMemberDetailPageProps = {
  memberIdOverride?: number
  mode?: FaultsMemberDetailPageMode
}

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

function findHistoryEmployeeRecord(payload: unknown, memberId: number) {
  const parsed = parseMaybeJson(payload)

  if (!isRecord(parsed) || !Array.isArray(parsed.employees)) {
    return null
  }

  return parsed.employees.find((item) => (
    isRecord(item) &&
    Number(item.user_id ?? item.id ?? item.employee_id ?? item.member_id) === memberId
  )) ?? null
}

function findHistoryPeriodRecord(historyEmployeeRecord: Record<string, unknown> | null, year: number, month: number) {
  if (!historyEmployeeRecord || !Array.isArray(historyEmployeeRecord.periods)) {
    return null
  }

  return historyEmployeeRecord.periods.find((item) => (
    isRecord(item) &&
    Number(item.year) === year &&
    Number(item.month) === month
  )) ?? null
}

function resolveMemberDisplayName(...sources: Array<unknown>) {
  for (const source of sources) {
    const parsed = parseMaybeJson(source)
    const candidateRecords: Record<string, unknown>[] = []

    if (Array.isArray(parsed)) {
      const firstRecord = parsed.find(isRecord)

      if (firstRecord) {
        candidateRecords.push(firstRecord)
      }
    } else if (isRecord(parsed)) {
      candidateRecords.push(parsed)

      for (const key of ['user', 'employee', 'member', 'user_data', 'member_data', 'summary', 'statistics', 'salary_update', 'monthly_stats']) {
        const nestedRecord = findFirstRecord(parsed, [key])

        if (nestedRecord) {
          candidateRecords.push(nestedRecord)
        }
      }

      for (const key of ['employees', 'members', 'items', 'results', 'rows', 'updates', 'data']) {
        const collection = parsed[key]

        if (!Array.isArray(collection)) {
          continue
        }

        const firstRecord = collection.find(isRecord)

        if (firstRecord) {
          candidateRecords.push(firstRecord)
        }
      }
    }

    const resolvedName = resolveRecordDisplayName(...candidateRecords)

    if (resolvedName) {
      return resolvedName
    }
  }

  return null
}

export function FaultsMemberDetailPage({
  memberIdOverride,
  mode = 'salary-detail',
}: FaultsMemberDetailPageProps = {}) {
  const navigate = useNavigate()
  const params = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { showToast } = useToast()
  const [penaltyPoints, setPenaltyPoints] = useState('10')
  const [penaltyReason, setPenaltyReason] = useState('')
  const [bonusAmount, setBonusAmount] = useState('')
  const [bonusReason, setBonusReason] = useState('')
  const [isPenaltyDialogOpen, setIsPenaltyDialogOpen] = useState(false)
  const [isBonusDialogOpen, setIsBonusDialogOpen] = useState(false)
  const [isPenaltySubmitting, setIsPenaltySubmitting] = useState(false)
  const [isBonusSubmitting, setIsBonusSubmitting] = useState(false)

  const isMemberUpdatesMode = mode === 'member-updates'
  const memberId = memberIdOverride ?? Number(params.memberId)
  const year = parsePeriodNumber(searchParams.get('year'), defaultYear, 2020, 2035)
  const month = parsePeriodNumber(searchParams.get('month'), defaultMonth, 1, 12)
  const pageEyebrow = isMemberUpdatesMode ? 'Updates / My Detail' : 'CEO / Salary / Detail'
  const loadingTitle = isMemberUpdatesMode ? 'Loading your update detail' : 'Loading member salary detail'
  const loadingDescription = isMemberUpdatesMode
    ? 'Retrieving your monthly update context, estimate snapshot and activity details.'
    : 'Retrieving member estimate, penalties, bonuses, and monthly update context.'
  const errorActionLabel = isMemberUpdatesMode ? 'Back to dashboard' : 'Back to salary estimates'
  const backTarget = isMemberUpdatesMode ? '/member/dashboard' : `/faults?year=${year}&month=${month}`
  const topHeaderEyebrow = isMemberUpdatesMode ? 'My Update Detail' : 'CEO Salary Detail'
  const showCompensationActions = !isMemberUpdatesMode

  const detailQuery = useAsyncData(
    async () => {
      const [estimateResult, updatesResult, calendarResult, historyResult] = await Promise.allSettled([
        membersService.salaryEstimates({ year, month, employeeIds: [memberId] }),
        membersService.updatesStatistics({ year, month, employeeIds: [memberId] }),
        updateTrackingService.employeeMonthlyUpdates(year, month, memberId),
        membersService.updatesAll({ year, month, employeeIds: [memberId] }),
      ])

      const estimatePayload = estimateResult.status === 'fulfilled' ? estimateResult.value : null
      const updatesPayload = updatesResult.status === 'fulfilled' ? updatesResult.value : null
      const calendarPayload = calendarResult.status === 'fulfilled' ? calendarResult.value : null
      const historyPayload = historyResult.status === 'fulfilled' ? historyResult.value : null
      const historyEmployeeRecord = findHistoryEmployeeRecord(historyPayload, memberId)
      const historyPeriodRecord = findHistoryPeriodRecord(historyEmployeeRecord, year, month)
      const effectiveEstimatePayload = estimatePayload ?? historyPeriodRecord ?? historyEmployeeRecord
      const estimateRecord = getEstimateRecordForMember(effectiveEstimatePayload, memberId)
      const snapshot = estimateRecord ? normalizeEstimateEntry(estimateRecord) : null
      const historyReport = historyPayload
        ? buildEmployeeReports([], historyPayload, { includeFallbackUsers: false }).find((entry) => entry.id === memberId) ?? null
        : null
      const historyReportBaseSalary = historyReport?.baseSalary
      const resolvedUserName =
        resolveMemberDisplayName(
          estimatePayload,
          effectiveEstimatePayload,
          historyPeriodRecord,
          historyEmployeeRecord,
          updatesPayload,
          calendarPayload,
        ) ??
        historyReport?.fullName ??
        `Member #${memberId}`
      const resolvedSnapshot = snapshot
        ? {
            ...snapshot,
            userId: snapshot.userId ?? memberId,
            userName: snapshot.userName?.trim() || resolvedUserName,
          }
        : null
      const apiUser = resolvedSnapshot
        ? {
            ...createVirtualUser(resolvedSnapshot),
            id: resolvedSnapshot.userId ?? memberId,
          }
        : historyEmployeeRecord || historyReport || resolvedUserName
          ? {
              ...createVirtualUser({
                userId: memberId,
                userName: resolvedUserName,
                roleLabel: historyReport?.roleLabel ?? 'Member',
                baseSalary:
                  typeof historyEmployeeRecord?.default_salary === 'number'
                    ? historyEmployeeRecord.default_salary
                    : typeof historyReportBaseSalary === 'number' && Number.isFinite(historyReportBaseSalary)
                      ? historyReportBaseSalary
                      : undefined,
              }),
              id: memberId,
            }
          : null
      const fallbackReport =
        resolvedSnapshot && apiUser
          ? buildReportFromUser(apiUser, resolvedSnapshot)
          : historyReport ?? (apiUser ? buildReportFromUser(apiUser) : null)

      if (!fallbackReport) {
        throw new Error('Could not resolve this member from the Employees API salary estimate response.')
      }

      return buildEmployeeSalaryDetail({
        report: fallbackReport,
        user: apiUser,
        estimatePayload: effectiveEstimatePayload,
        updatesPayload,
        calendarPayload,
        estimateError: estimateResult.status === 'rejected' ? getApiErrorMessage(estimateResult.reason) : null,
        updatesError: updatesResult.status === 'rejected' ? getApiErrorMessage(updatesResult.reason) : null,
        calendarError: calendarResult.status === 'rejected' ? getApiErrorMessage(calendarResult.reason) : null,
        year,
        month,
      })
    },
    [memberId, year, month],
    {
      enabled: Number.isFinite(memberId) && memberId > 0,
    },
  )

  const detail = detailQuery.data

  function updatePeriod(next: { year?: number; month?: number }) {
    const nextYear = next.year ?? year
    const nextMonth = next.month ?? month
    setSearchParams({
      year: String(nextYear),
      month: String(nextMonth),
    }, { replace: true })
  }

  function handleCalendarMonthShift(delta: number) {
    const shifted = new Date(year, month - 1 + delta, 1)
    updatePeriod({
      year: shifted.getFullYear(),
      month: shifted.getMonth() + 1,
    })
  }

  function handleCalendarTodayJump() {
    updatePeriod({
      year: defaultYear,
      month: defaultMonth,
    })
  }

  async function handleRefresh() {
    try {
      await detailQuery.refetch()
      showToast({
        title: 'Member detail refreshed',
        description: `${detail?.report.fullName ?? 'Member'} synced for ${getMonthName(month)} ${year}.`,
        tone: 'success',
      })
    } catch (error) {
      showToast({
        title: 'Member detail refresh failed',
        description: getApiErrorMessage(error),
        tone: 'error',
      })
    }
  }

  function openPenaltyDialog() {
    setPenaltyPoints('10')
    setPenaltyReason('')
    setIsPenaltyDialogOpen(true)
  }

  function openBonusDialog() {
    setBonusAmount('')
    setBonusReason('')
    setIsBonusDialogOpen(true)
  }

  async function handleSubmitPenalty() {
    if (!detail) {
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
        userId: detail.report.id,
        year,
        month,
        penaltyPoints: parsedPoints,
        reason: penaltyReason.trim() || undefined,
      })

      await detailQuery.refetch()
      setIsPenaltyDialogOpen(false)
      showToast({
        title: 'Penalty added',
        description: getSuccessMessage(response, `${detail.report.fullName} updated.`),
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
    if (!detail) {
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
        userId: detail.report.id,
        year,
        month,
        bonusAmount: parsedAmount,
        reason: bonusReason.trim() || undefined,
      })

      await detailQuery.refetch()
      setIsBonusDialogOpen(false)
      showToast({
        title: 'Bonus added',
        description: getSuccessMessage(response, `${detail.report.fullName} updated.`),
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

  if (!Number.isFinite(memberId) || memberId <= 0) {
    return (
      <ErrorStateBlock
        eyebrow={pageEyebrow}
        title="Invalid member ID"
        description="The member identifier in the route is invalid."
        actionLabel={errorActionLabel}
        onAction={() => navigate(backTarget)}
      />
    )
  }

  if (detailQuery.isLoading && !detail) {
    return (
      <LoadingStateBlock
        eyebrow={pageEyebrow}
        title={loadingTitle}
        description={loadingDescription}
      />
    )
  }

  if (detailQuery.isError || !detail) {
    return (
      <ErrorStateBlock
        eyebrow={pageEyebrow}
        title="Member detail unavailable"
        description="Could not build a salary detail page for this member."
        actionLabel={errorActionLabel}
        onAction={() => navigate(backTarget)}
      />
    )
  }

  const updatesSummary = detail.updatesSummary
  const updatesCompletion =
    Number.isFinite(updatesSummary?.updatePercentage)
      ? updatesSummary!.updatePercentage
      : updatesSummary?.completionPercentage

  return (
    <section className="space-y-6 page-enter">
      {!isMemberUpdatesMode ? (
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(backTarget)}
            className="min-h-8 rounded-xl border border-white/8 bg-white/[0.03] px-3 text-[11px] text-white/78 hover:border-white/12 hover:bg-white/[0.05] hover:text-white"
          >
            <svg viewBox="0 0 16 16" className="mr-1.5 h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10 3.5 5.5 8 10 12.5" />
            </svg>
            {errorActionLabel}
          </Button>
        </div>
      ) : null}

      <Card variant="glass" noPadding className="overflow-hidden rounded-[28px] border-[var(--blue-border)]">
        <div className="relative overflow-hidden px-6 py-6 sm:px-8 sm:py-7">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_38%),radial-gradient(circle_at_right,rgba(34,211,238,0.12),transparent_26%)]" />

          <div className="relative z-10 flex flex-col gap-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.02em] text-[var(--blue-text)]">
                  {topHeaderEyebrow}
                </p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
                  {detail.report.fullName}
                </h1>
                <p className="mt-2 text-sm text-[var(--muted-strong)]">
                  {detail.report.roleLabel}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Badge variant="blue">Employee API detail</Badge>
                  <Badge variant={detail.report.hasPenalty ? 'danger' : 'outline'}>
                    {detail.report.hasPenalty ? 'Penalty applied' : 'No penalties'}
                  </Badge>
                  <Badge variant={detail.report.hasBonus ? 'blue' : 'outline'}>
                    {detail.report.hasBonus ? 'Bonus applied' : 'No bonuses'}
                  </Badge>
                  <Badge variant="outline">{detail.report.label}</Badge>
                </div>

                {detail.estimateError ? (
                  <p className="mt-4 text-xs leading-5 text-amber-300">
                    Estimate API unavailable: {detail.estimateError}
                  </p>
                ) : null}
                {detail.updatesError ? (
                  <p className="mt-2 text-xs leading-5 text-amber-300">
                    Update statistics unavailable: {detail.updatesError}
                  </p>
                ) : null}
                {detail.calendarError ? (
                  <p className="mt-2 text-xs leading-5 text-amber-300">
                    Daily update calendar unavailable: {detail.calendarError}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                {showCompensationActions ? (
                  <Button variant="ghost" size="sm" onClick={openPenaltyDialog} className="rounded-xl">
                    Add penalty
                  </Button>
                ) : null}
                {showCompensationActions ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={openBonusDialog}
                    className="rounded-xl border-[var(--blue-border)] bg-[var(--blue-dim)] text-[var(--blue-text)] hover:border-[var(--blue-border)] hover:bg-[var(--blue-soft)] hover:text-[var(--blue-text)]"
                  >
                    Add bonus
                  </Button>
                ) : null}
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<RefreshIcon />}
                  onClick={() => void handleRefresh()}
                  loading={detailQuery.isLoading}
                  className="rounded-xl"
                >
                  Refresh details
                </Button>
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

              <div className="grid gap-3 md:self-end md:justify-items-end">
                <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">
                  {getMonthName(month)} {year}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DetailStatTile label="Final salary" value={formatAmount(detail.report.finalSalary)} />
        <DetailStatTile label="Estimated salary" value={formatAmount(detail.report.estimatedSalary)} />
        <DetailStatTile label="Deduction" value={formatAmount(detail.report.deductionAmount)} tone="danger" />
        <DetailStatTile label="Bonus amount" value={formatAmount(detail.report.bonusAmount)} tone="blue" />
      </div>

      <Card className="rounded-[24px] border-white/10 p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
              Compensation flow
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">
              How the final salary is built
            </h2>
          </div>
          <Badge variant={(detail.report.penaltyPercentage ?? 0) > 0 ? 'danger' : 'outline'}>
            {formatPercent(detail.report.penaltyPercentage)} penalty impact
          </Badge>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <DetailStatTile label="Base salary" value={formatAmount(detail.report.baseSalary)} />
          <DetailStatTile label="After penalty" value={formatAmount(detail.report.afterPenalty)} />
          <DetailStatTile label="Penalty points" value={formatCount(detail.report.penaltyPoints)} tone="danger" />
          <DetailStatTile label="Bonus entries" value={formatCount(detail.report.bonusEntries)} tone="blue" />
        </div>

        <div className="mt-5 rounded-[18px] border border-white/8 bg-black/15 px-4 py-4">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-white/72">{formatAmount(detail.report.baseSalary)}</span>
            <span className="text-white/25">-</span>
            <span className="font-semibold text-rose-400">{formatAmount(detail.report.deductionAmount)}</span>
            <span className="text-white/25">+</span>
            <span className="font-semibold text-[var(--blue-text)]">{formatAmount(detail.report.bonusAmount)}</span>
            <span className="text-white/25">=</span>
            <span className="text-base font-semibold tracking-tight text-white">
              {formatAmount(detail.report.finalSalary)}
            </span>
          </div>
          <div className="mt-4 h-2 rounded-full bg-white/8">
            <div
              className="h-full rounded-full bg-rose-500 transition-[width] duration-300"
              style={{ width: `${Math.min(100, Math.max(0, Number.isFinite(detail.report.penaltyPercentage) ? detail.report.penaltyPercentage : 0))}%` }}
            />
          </div>
        </div>
      </Card>

      <Card className="rounded-[24px] border-white/10 p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
              Monthly execution
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">
              Salary context and update performance
            </h2>
          </div>
          <Badge
            variant={updatesSummary ? 'blue' : 'outline'}
          >
            {updatesSummary
              ? `${formatPercent(updatesSummary.completionPercentage)} completion`
              : 'No update stats'}
          </Badge>
        </div>

        {updatesSummary ? (
          <>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <DetailStatTile label="Logged updates" value={formatCount(updatesSummary.submittedCount)} />
              <DetailStatTile label="Missing days" value={formatCount(updatesSummary.missingCount)} tone="danger" />
              <DetailStatTile label="Total updates" value={formatCount(updatesSummary.totalUpdates)} />
              <DetailStatTile
                label="Update percentage"
                value={formatPercent(updatesCompletion)}
                tone={updatesSummary ? 'blue' : 'default'}
              />
            </div>

            <div className="mt-4 grid gap-3 xl:grid-cols-3">
              <div className="rounded-[18px] border border-white/8 bg-black/15 px-4 py-3">
                <p className="text-xs text-[var(--muted-strong)]">Last update</p>
                <p className="mt-2 text-sm font-semibold text-white">
                  {formatDetailDate(updatesSummary!.lastUpdateDate)}
                </p>
              </div>
              <div className="rounded-[18px] border border-white/8 bg-black/15 px-4 py-3">
                <p className="text-xs text-[var(--muted-strong)]">Next payment date</p>
                <p className="mt-2 text-sm font-semibold text-white">
                  {formatDetailDate(updatesSummary!.nextPaymentDate)}
                </p>
              </div>
              <div className="rounded-[18px] border border-white/8 bg-black/15 px-4 py-3">
                <p className="text-xs text-[var(--muted-strong)]">Salary amount in update record</p>
                <p className="mt-2 text-sm font-semibold text-white">
                  {typeof updatesSummary!.salaryAmount === 'number'
                    ? formatAmount(updatesSummary!.salaryAmount)
                    : 'Not returned'}
                </p>
              </div>
            </div>

            {updatesSummary!.note ? (
              <div className="mt-4 rounded-[18px] border border-white/8 bg-black/15 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                  Manager note
                </p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/80">
                  {updatesSummary!.note}
                </p>
              </div>
            ) : null}

            {detail.updateCalendar ? (
              <MemberMonthlyUpdateCalendarBoard
                calendar={detail.updateCalendar}
                className="mt-5"
                onMonthShift={handleCalendarMonthShift}
                onJumpToToday={handleCalendarTodayJump}
              />
            ) : detail.calendarError ? (
              <div className="mt-4 rounded-[18px] border border-dashed border-amber-500/30 bg-amber-500/8 px-4 py-5 text-sm text-amber-100/80">
                Monthly calendar could not be loaded from the CEO employee updates endpoint.
              </div>
            ) : null}
          </>
        ) : (
          <>
            <div className="mt-4 rounded-[18px] border border-dashed border-white/10 bg-black/10 px-4 py-5 text-sm text-[var(--muted-strong)]">
              No monthly update statistics were returned for this member.
            </div>

            {detail.updateCalendar ? (
              <MemberMonthlyUpdateCalendarBoard
                calendar={detail.updateCalendar}
                className="mt-5"
                onMonthShift={handleCalendarMonthShift}
                onJumpToToday={handleCalendarTodayJump}
              />
            ) : detail.calendarError ? (
              <div className="mt-4 rounded-[18px] border border-dashed border-amber-500/30 bg-amber-500/8 px-4 py-5 text-sm text-amber-100/80">
                Monthly calendar could not be loaded from the CEO employee updates endpoint.
              </div>
            ) : null}
          </>
        )}
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="rounded-[24px] border-rose-500/18 bg-[linear-gradient(180deg,rgba(56,16,22,0.30),rgba(18,12,15,0.92))] p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-rose-200/70">
                Penalty ledger
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">
                Penalty entries for this month
              </h2>
            </div>
            <Badge variant={detail.penalties.length > 0 ? 'danger' : 'outline'}>
              {detail.penalties.length} entries
            </Badge>
          </div>

          <div className="mt-4 space-y-3">
            {detail.penalties.length > 0 ? detail.penalties.map((item) => (
              <div key={item.id} className="rounded-[18px] border border-rose-500/18 bg-black/15 px-4 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    {item.description ? (
                      <p className="mt-1 text-xs leading-5 text-rose-100/72">
                        {item.description}
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {item.points ? <Badge variant="danger">{item.points} points</Badge> : null}
                      {item.percentage ? <Badge variant="outline">{formatPercent(item.percentage)}</Badge> : null}
                      {item.createdAt ? <Badge variant="outline">{formatDetailDate(item.createdAt)}</Badge> : null}
                    </div>
                  </div>
                  <p className="text-base font-semibold tracking-tight text-rose-400">
                    {formatAmount(item.amount)}
                  </p>
                </div>
              </div>
            )) : (
              <div className="rounded-[18px] border border-dashed border-rose-500/18 bg-black/10 px-4 py-5 text-sm text-rose-100/72">
                No penalty line-items were returned for this member in the selected month.
              </div>
            )}
          </div>
        </Card>

        <Card className="rounded-[24px] border-emerald-500/18 bg-[linear-gradient(180deg,rgba(10,52,37,0.30),rgba(7,18,14,0.92))] p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-200/70">
                Bonus ledger
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">
                Bonus entries for this month
              </h2>
            </div>
            <Badge variant={detail.bonuses.length > 0 ? 'success' : 'outline'}>
              {detail.bonuses.length} entries
            </Badge>
          </div>

          <div className="mt-4 space-y-3">
            {detail.bonuses.length > 0 ? detail.bonuses.map((item) => (
              <div key={item.id} className="rounded-[18px] border border-emerald-500/18 bg-black/15 px-4 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    {item.description ? (
                      <p className="mt-1 text-xs leading-5 text-emerald-100/72">
                        {item.description}
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {item.createdAt ? <Badge variant="outline">{formatDetailDate(item.createdAt)}</Badge> : null}
                    </div>
                  </div>
                  <p className="text-base font-semibold tracking-tight text-emerald-400">
                    {formatAmount(item.amount)}
                  </p>
                </div>
              </div>
            )) : (
              <div className="rounded-[18px] border border-dashed border-emerald-500/18 bg-black/10 px-4 py-5 text-sm text-emerald-100/72">
                No bonus line-items were returned for this member in the selected month.
              </div>
            )}
          </div>
        </Card>
      </div>

      {showCompensationActions ? (
        <Dialog
          open={isPenaltyDialogOpen}
          onClose={() => setIsPenaltyDialogOpen(false)}
          title={`Add penalty for ${detail.report.fullName}`}
          description={`${getMonthName(month)} ${year} monthly penalty entry.`}
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => setIsPenaltyDialogOpen(false)}
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
              <p className="mt-2 text-base font-semibold text-white">{detail.report.fullName}</p>
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
      ) : null}

      {showCompensationActions ? (
        <Dialog
          open={isBonusDialogOpen}
          onClose={() => setIsBonusDialogOpen(false)}
          title={`Add bonus for ${detail.report.fullName}`}
          description={`${getMonthName(month)} ${year} monthly bonus entry.`}
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => setIsBonusDialogOpen(false)}
                disabled={isBonusSubmitting}
              >
                Cancel
              </Button>
            <Button
              variant="secondary"
              onClick={() => void handleSubmitBonus()}
              loading={isBonusSubmitting}
              className="border-[var(--blue-border)] bg-[var(--blue-dim)] text-[var(--blue-text)] hover:border-[var(--blue-border)] hover:bg-[var(--blue-soft)] hover:text-[var(--blue-text)]"
            >
              Save bonus
            </Button>
            </>
          }
        >
          <div className="grid gap-4">
            <div className="rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3">
              <p className="text-xs text-[var(--muted-strong)]">Employee</p>
              <p className="mt-2 text-base font-semibold text-white">{detail.report.fullName}</p>
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
      ) : null}
    </section>
  )
}
