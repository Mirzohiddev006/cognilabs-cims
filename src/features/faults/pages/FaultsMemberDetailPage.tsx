import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ceoService } from '../../../shared/api/services/ceo.service'
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
  buildReportFromUser,
  createVirtualUser,
  defaultMonth,
  defaultYear,
  formatAmount,
  formatDetailDate,
  formatPercent,
  getMonthName,
  getPrimaryEstimateRecord,
  getSuccessMessage,
  isEmployeeUser,
  monthOptions,
  normalizeEstimateEntry,
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

export function FaultsMemberDetailPage() {
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

  const memberId = Number(params.memberId)
  const year = parsePeriodNumber(searchParams.get('year'), defaultYear, 2020, 2035)
  const month = parsePeriodNumber(searchParams.get('month'), defaultMonth, 1, 12)

  const detailQuery = useAsyncData(
    async () => {
      const [dashboardResult, estimateResult, updatesResult, calendarResult] = await Promise.allSettled([
        ceoService.getDashboard(),
        membersService.salaryEstimate(memberId, year, month),
        membersService.updatesStatistics({ year, month, employeeIds: [memberId] }),
        updateTrackingService.employeeMonthlyUpdates(year, month, memberId),
      ])

      const employees =
        dashboardResult.status === 'fulfilled'
          ? (dashboardResult.value.users ?? []).filter(isEmployeeUser)
          : []
      const user = employees.find((item) => item.id === memberId) ?? null
      const estimatePayload = estimateResult.status === 'fulfilled' ? estimateResult.value : null
      const estimateRecord = getPrimaryEstimateRecord(estimatePayload)
      const snapshot = estimateRecord ? normalizeEstimateEntry(estimateRecord) : null
      const fallbackReport =
        user
          ? buildReportFromUser(user, snapshot)
          : snapshot
            ? buildReportFromUser(createVirtualUser(snapshot), snapshot)
            : null

      if (!fallbackReport) {
        throw new Error('Could not resolve this member from dashboard or salary estimate data.')
      }

      return buildEmployeeSalaryDetail({
        report: fallbackReport,
        user,
        estimatePayload,
        updatesPayload: updatesResult.status === 'fulfilled' ? updatesResult.value : null,
        calendarPayload: calendarResult.status === 'fulfilled' ? calendarResult.value : null,
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
        eyebrow="CEO / Salary / Detail"
        title="Invalid member ID"
        description="The member identifier in the route is invalid."
        actionLabel="Back to salary estimates"
        onAction={() => navigate('/faults')}
      />
    )
  }

  if (detailQuery.isLoading && !detail) {
    return (
      <LoadingStateBlock
        eyebrow="CEO / Salary / Detail"
        title="Loading member salary detail"
        description="Retrieving member estimate, penalties, bonuses, and monthly update context."
      />
    )
  }

  if (detailQuery.isError || !detail) {
    return (
      <ErrorStateBlock
        eyebrow="CEO / Salary / Detail"
        title="Member detail unavailable"
        description="Could not build a salary detail page for this member."
        actionLabel="Back to salary estimates"
        onAction={() => navigate('/faults')}
      />
    )
  }

  return (
    <section className="space-y-6 page-enter">
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/faults?year=${year}&month=${month}`)}
          className="min-h-8 rounded-xl border border-white/8 bg-white/[0.03] px-3 text-[11px] text-white/78 hover:border-white/12 hover:bg-white/[0.05] hover:text-white"
        >
          <svg viewBox="0 0 16 16" className="mr-1.5 h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M10 3.5 5.5 8 10 12.5" />
          </svg>
          Back to salary estimates
        </Button>
      </div>

      <Card variant="glass" noPadding className="overflow-hidden rounded-[28px] border-orange-500/20">
        <div className="relative overflow-hidden px-6 py-6 sm:px-8 sm:py-7">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.16),transparent_38%),radial-gradient(circle_at_right,rgba(34,197,94,0.10),transparent_26%)]" />

          <div className="relative z-10 flex flex-col gap-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.02em] text-orange-200/80">
                  CEO Salary Detail
                </p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
                  {detail.report.fullName}
                </h1>
                <p className="mt-2 text-sm text-[var(--muted-strong)]">
                  {detail.report.roleLabel}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Badge variant={detail.estimateSource === 'live' ? 'success' : 'secondary'}>
                    {detail.estimateSource === 'live' ? 'Live member estimate' : 'Fallback summary'}
                  </Badge>
                  <Badge variant={detail.report.hasPenalty ? 'danger' : 'outline'}>
                    {detail.report.hasPenalty ? 'Penalty applied' : 'No penalties'}
                  </Badge>
                  <Badge variant={detail.report.hasBonus ? 'success' : 'outline'}>
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
                <Button variant="ghost" size="sm" onClick={openPenaltyDialog} className="rounded-xl">
                  Add penalty
                </Button>
                <Button variant="success" size="sm" onClick={openBonusDialog} className="rounded-xl">
                  Add bonus
                </Button>
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
        <DetailStatTile label="Bonus amount" value={formatAmount(detail.report.bonusAmount)} tone="success" />
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
          <Badge variant={detail.report.penaltyPercentage > 0 ? 'danger' : 'outline'}>
            {formatPercent(detail.report.penaltyPercentage)} penalty impact
          </Badge>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <DetailStatTile label="Base salary" value={formatAmount(detail.report.baseSalary)} />
          <DetailStatTile label="After penalty" value={formatAmount(detail.report.afterPenalty)} />
          <DetailStatTile label="Penalty points" value={detail.report.penaltyPoints} tone="danger" />
          <DetailStatTile label="Bonus entries" value={detail.report.bonusEntries} tone="success" />
        </div>

        <div className="mt-5 rounded-[18px] border border-white/8 bg-black/15 px-4 py-4">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-white/72">{formatAmount(detail.report.baseSalary)}</span>
            <span className="text-white/25">-</span>
            <span className="font-semibold text-rose-400">{formatAmount(detail.report.deductionAmount)}</span>
            <span className="text-white/25">+</span>
            <span className="font-semibold text-emerald-400">{formatAmount(detail.report.bonusAmount)}</span>
            <span className="text-white/25">=</span>
            <span className="text-base font-semibold tracking-tight text-white">
              {formatAmount(detail.report.finalSalary)}
            </span>
          </div>
          <div className="mt-4 h-2 rounded-full bg-white/8">
            <div
              className="h-full rounded-full bg-rose-500 transition-[width] duration-300"
              style={{ width: `${Math.min(100, Math.max(0, detail.report.penaltyPercentage))}%` }}
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
            variant={
              (detail.updatesSummary?.completionPercentage ?? 0) >= 80
                ? 'success'
                : (detail.updatesSummary?.completionPercentage ?? 0) > 0
                  ? 'warning'
                  : 'outline'
            }
          >
            {detail.updatesSummary
              ? `${formatPercent(detail.updatesSummary.completionPercentage)} completion`
              : 'No update stats'}
          </Badge>
        </div>

        {detail.updatesSummary ? (
          <>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <DetailStatTile label="Logged updates" value={detail.updatesSummary.submittedCount} />
              <DetailStatTile label="Missing days" value={detail.updatesSummary.missingCount} tone="danger" />
              <DetailStatTile label="Total updates" value={detail.updatesSummary.totalUpdates} />
              <DetailStatTile
                label="Update percentage"
                value={formatPercent(detail.updatesSummary.updatePercentage ?? detail.updatesSummary.completionPercentage)}
                tone={(detail.updatesSummary.updatePercentage ?? detail.updatesSummary.completionPercentage) >= 80 ? 'success' : 'default'}
              />
            </div>

            <div className="mt-4 grid gap-3 xl:grid-cols-3">
              <div className="rounded-[18px] border border-white/8 bg-black/15 px-4 py-3">
                <p className="text-xs text-[var(--muted-strong)]">Last update</p>
                <p className="mt-2 text-sm font-semibold text-white">
                  {formatDetailDate(detail.updatesSummary.lastUpdateDate)}
                </p>
              </div>
              <div className="rounded-[18px] border border-white/8 bg-black/15 px-4 py-3">
                <p className="text-xs text-[var(--muted-strong)]">Next payment date</p>
                <p className="mt-2 text-sm font-semibold text-white">
                  {formatDetailDate(detail.updatesSummary.nextPaymentDate)}
                </p>
              </div>
              <div className="rounded-[18px] border border-white/8 bg-black/15 px-4 py-3">
                <p className="text-xs text-[var(--muted-strong)]">Salary amount in update record</p>
                <p className="mt-2 text-sm font-semibold text-white">
                  {typeof detail.updatesSummary.salaryAmount === 'number'
                    ? formatAmount(detail.updatesSummary.salaryAmount)
                    : 'Not returned'}
                </p>
              </div>
            </div>

            {detail.updatesSummary.note ? (
              <div className="mt-4 rounded-[18px] border border-white/8 bg-black/15 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                  Manager note
                </p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/80">
                  {detail.updatesSummary.note}
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
            <Button variant="success" onClick={() => void handleSubmitBonus()} loading={isBonusSubmitting}>
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
    </section>
  )
}
