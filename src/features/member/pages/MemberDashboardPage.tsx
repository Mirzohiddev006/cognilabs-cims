import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { CurrentUser } from '../../../shared/api/types'
import type { CeoUserRecord } from '../../../shared/api/services/ceo.service'
import { membersService } from '../../../shared/api/services/members.service'
import { updateTrackingService } from '../../../shared/api/services/updateTracking.service'
import { useAsyncData } from '../../../shared/hooks/useAsyncData'
import { getApiErrorMessage } from '../../../shared/lib/api-error'
import { cn } from '../../../shared/lib/cn'
import { useToast } from '../../../shared/toast/useToast'
import { Badge } from '../../../shared/ui/badge'
import { Button } from '../../../shared/ui/button'
import { Card } from '../../../shared/ui/card'
import { Input } from '../../../shared/ui/input'
import { SelectField } from '../../../shared/ui/select-field'
import { ErrorStateBlock } from '../../../shared/ui/state-block'
import { useAuth } from '../../auth/hooks/useAuth'
import { DetailStatTile, RefreshIcon } from '../../faults/components/SalaryEstimatePrimitives'
import {
  buildEmployeeSalaryDetail,
  buildReportFromUser,
  defaultMonth,
  defaultYear,
  formatAmount,
  formatCount,
  formatDetailDate,
  formatPercent,
  getMonthName,
  monthOptions,
} from '../../faults/lib/salaryEstimates'

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

function createMemberUser(user: CurrentUser): CeoUserRecord {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    surname: user.surname,
    company_code: user.company_code,
    telegram_id: null,
    default_salary: null,
    job_title: user.job_title,
    role: user.role,
    is_active: user.is_active,
  }
}

type MemberDashboardData = {
  detail: ReturnType<typeof buildEmployeeSalaryDetail>
  stats: Awaited<ReturnType<typeof updateTrackingService.myStats>> | null
  statsError: string | null
}

const memberDashboardCache = new Map<string, MemberDashboardData>()

function getMemberDashboardCacheKey(userId: number, year: number, month: number) {
  return `${userId}:${year}:${month}`
}

async function loadMemberDashboardData(memberUser: CeoUserRecord, year: number, month: number, force = false): Promise<MemberDashboardData> {
  const cacheKey = getMemberDashboardCacheKey(memberUser.id, year, month)

  if (!force) {
    const cached = memberDashboardCache.get(cacheKey)

    if (cached) {
      return cached
    }
  }

  const [estimateResult, updatesResult, calendarResult, statsResult] = await Promise.allSettled([
    membersService.mySalaryEstimate(year, month),
    membersService.updatesStatistics({ year, month, employeeIds: [memberUser.id] }),
    updateTrackingService.employeeMonthlyUpdates(year, month, memberUser.id),
    updateTrackingService.myStats(),
  ])

  const result: MemberDashboardData = {
    detail: buildEmployeeSalaryDetail({
      report: buildReportFromUser(memberUser),
      user: memberUser,
      estimatePayload: estimateResult.status === 'fulfilled' ? estimateResult.value : null,
      updatesPayload: updatesResult.status === 'fulfilled' ? updatesResult.value : null,
      calendarPayload: calendarResult.status === 'fulfilled' ? calendarResult.value : null,
      estimateError: estimateResult.status === 'rejected' ? getApiErrorMessage(estimateResult.reason) : null,
      updatesError: updatesResult.status === 'rejected' ? getApiErrorMessage(updatesResult.reason) : null,
      calendarError: calendarResult.status === 'rejected' ? getApiErrorMessage(calendarResult.reason) : null,
      year,
      month,
    }),
    stats: statsResult.status === 'fulfilled' ? statsResult.value : null,
    statsError: statsResult.status === 'rejected' ? getApiErrorMessage(statsResult.reason) : null,
  }

  memberDashboardCache.set(cacheKey, result)
  return result
}

function ProgressBar({
  value,
  tone = 'violet',
}: {
  value: number
  tone?: 'violet' | 'success' | 'danger'
}) {
  const colorClassName = {
    violet: 'bg-violet-400',
    success: 'bg-emerald-400',
    danger: 'bg-rose-400',
  } as const

  return (
    <div className="h-2 rounded-full bg-white/8">
      <div
        className={cn('h-full rounded-full transition-[width] duration-300', colorClassName[tone])}
        style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
      />
    </div>
  )
}

function MetricPanel({
  label,
  value,
  hint,
  progress,
  progressTone,
}: {
  label: string
  value: string | number
  hint?: string
  progress?: number
  progressTone?: 'violet' | 'success' | 'danger'
}) {
  return (
    <div className="rounded-[22px] border border-white/8 bg-black/22 px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">{label}</p>
      <p className="mt-3 text-[1.9rem] font-semibold tracking-tight text-white">{value}</p>
      {hint ? (
        <p className="mt-2 text-xs text-white/58">{hint}</p>
      ) : null}
      {typeof progress === 'number' ? (
        <div className="mt-4">
          <ProgressBar value={progress} tone={progressTone} />
        </div>
      ) : null}
    </div>
  )
}

export function MemberDashboardPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const year = parsePeriodNumber(searchParams.get('year'), defaultYear, 2020, 2035)
  const month = parsePeriodNumber(searchParams.get('month'), defaultMonth, 1, 12)
  const memberUser = user ? createMemberUser(user) : null
  const cacheKey = memberUser ? getMemberDashboardCacheKey(memberUser.id, year, month) : null
  const cachedDashboardData = cacheKey ? memberDashboardCache.get(cacheKey) : undefined

  const dashboardQuery = useAsyncData(
    async () => {
      if (!memberUser) {
        throw new Error('Authenticated member not found.')
      }

      return loadMemberDashboardData(memberUser, year, month)
    },
    [memberUser?.id, month, year],
    { enabled: Boolean(memberUser), initialData: cachedDashboardData },
  )

  const data = dashboardQuery.data

  const calendarCounts = useMemo(() => {
    const days = data?.detail.updateCalendar?.days ?? []

    return days.reduce(
      (counts, day) => {
        if (day.status === 'submitted') counts.submitted += 1
        else if (day.status === 'missing') counts.missing += 1
        else if (day.status === 'future') counts.future += 1
        else if (day.status === 'neutral') counts.open += 1
        else if (day.status === 'sunday') counts.off += 1

        return counts
      },
      { submitted: 0, missing: 0, future: 0, open: 0, off: 0 },
    )
  }, [data?.detail.updateCalendar?.days])

  const elapsedWorkingDays = calendarCounts.submitted + calendarCounts.missing + calendarCounts.open
  const stats = data?.stats
  const expectedWeeklyUpdates = typeof stats?.expected_updates_per_week === 'number' ? stats.expected_updates_per_week : undefined
  const updatesThisWeek = typeof stats?.updates_this_week === 'number' ? stats.updates_this_week : undefined
  const weeklyRemaining =
    typeof expectedWeeklyUpdates === 'number' && typeof updatesThisWeek === 'number'
      ? Math.max(0, expectedWeeklyUpdates - updatesThisWeek)
      : undefined
  const weeklyCompletion = typeof stats?.percentage_this_week === 'number' ? Math.max(0, stats.percentage_this_week) : undefined
  const monthlyCompletion =
    typeof data?.detail.updatesSummary?.completionPercentage === 'number' && Number.isFinite(data.detail.updatesSummary.completionPercentage)
      ? data.detail.updatesSummary.completionPercentage
      : typeof stats?.percentage_this_month === 'number'
        ? stats.percentage_this_month
        : undefined
  const targetReached =
    (typeof weeklyCompletion === 'number' && weeklyCompletion >= 100) ||
    (typeof expectedWeeklyUpdates === 'number' && expectedWeeklyUpdates > 0 && typeof updatesThisWeek === 'number' && updatesThisWeek >= expectedWeeklyUpdates)

  function updatePeriod(next: { year?: number; month?: number }) {
    const nextYear = next.year ?? year
    const nextMonth = next.month ?? month

    setSearchParams(
      {
        year: String(nextYear),
        month: String(nextMonth),
      },
      { replace: true },
    )
  }

  async function handleRefresh() {
    try {
      if (!memberUser) {
        return
      }

      const nextData = await loadMemberDashboardData(memberUser, year, month, true)
      dashboardQuery.setData(nextData)
      showToast({
        title: 'Member dashboard refreshed',
        description: `${memberUser?.name ?? 'Your'} dashboard synced for ${getMonthName(month)} ${year}.`,
        tone: 'success',
      })
    } catch (error) {
      showToast({
        title: 'Refresh failed',
        description: getApiErrorMessage(error),
        tone: 'error',
      })
    }
  }

  if (!memberUser) {
    return (
      <ErrorStateBlock
        eyebrow="Member"
        title="Member session unavailable"
        description="The current authenticated user could not be resolved."
      />
    )
  }

  const detail = data?.detail

  if (dashboardQuery.isLoading && !detail) {
    return (
      <ErrorStateBlock
        eyebrow="Member"
        title="Dashboard loading"
        description="Member dashboard API data is still loading."
      />
    )
  }

  if (!detail) {
    return (
      <ErrorStateBlock
        eyebrow="Member"
        title="Dashboard unavailable"
        description="The dashboard payload did not return a valid member snapshot."
        actionLabel="Retry"
        onAction={() => void dashboardQuery.refetch()}
      />
    )
  }

  return (
    <section className="space-y-6 page-enter">
      <Card variant="glass" noPadding className="overflow-hidden rounded-[30px] border-white/10">
        <div className="relative overflow-hidden px-6 py-6 sm:px-8 sm:py-7">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_32%),radial-gradient(circle_at_right,rgba(16,185,129,0.12),transparent_24%)]" />

          <div className="relative z-10 flex flex-col gap-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.02em] text-white/62">Member Dashboard</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
                  {detail.report.fullName}
                </h1>
                <p className="mt-2 text-sm text-[var(--muted-strong)]">
                  {detail.report.roleLabel}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Badge variant="outline">User #{detail.report.id}</Badge>
                  <Badge variant="secondary">{detail.report.roleLabel}</Badge>
                  <Badge variant={targetReached ? 'success' : 'warning'}>
                    {targetReached ? 'Target reached' : 'Need follow-up'}
                  </Badge>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] xl:min-w-[430px]">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-white/48">Year</label>
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
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-white/48">Month</label>
                  <SelectField
                    value={String(month)}
                    options={monthOptions}
                    onValueChange={(value) => updatePeriod({ month: clampNumber(Number(value), 1, 12) })}
                    className="rounded-xl border-white/10 bg-white/[0.03]"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<RefreshIcon />}
                    onClick={() => void handleRefresh()}
                    loading={dashboardQuery.isLoading}
                    className="min-h-10 rounded-xl"
                  >
                    Refresh
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1fr_1fr_1.2fr]">
              <MetricPanel
                label="Expected updates (to date)"
                value={elapsedWorkingDays}
                hint={`${calendarCounts.submitted} logged, ${calendarCounts.missing} missing, ${calendarCounts.open} still open.`}
              />
              <MetricPanel
                label="This week progress"
                value={formatCount(updatesThisWeek)}
                hint={
                  typeof expectedWeeklyUpdates === 'number' && typeof weeklyRemaining === 'number'
                    ? `${formatCount(weeklyRemaining)} remaining from ${formatCount(expectedWeeklyUpdates)} expected.`
                    : 'Weekly target not returned by the API.'
                }
              />
              <MetricPanel
                label="Weekly completion"
                value={formatPercent(weeklyCompletion)}
                hint={targetReached ? 'Current weekly target has been reached.' : 'Keep logging updates to stay on track.'}
                progress={typeof weeklyCompletion === 'number' ? weeklyCompletion : undefined}
                progressTone={targetReached ? 'success' : (weeklyCompletion ?? 0) >= 60 ? 'violet' : 'danger'}
              />
            </div>

            {dashboardQuery.isLoading && !dashboardQuery.data ? (
              <div className="rounded-[20px] border border-blue-500/20 bg-blue-500/8 px-4 py-4 text-sm text-blue-100/80">
                Syncing your latest dashboard data...
              </div>
            ) : null}

            {data?.statsError || detail.estimateError || detail.updatesError || detail.calendarError ? (
              <div className="rounded-[20px] border border-amber-500/25 bg-amber-500/8 px-4 py-4 text-sm text-amber-100/82">
                {data?.statsError ? <p>Stats API unavailable: {data.statsError}</p> : null}
                {detail.estimateError ? <p>Salary estimate API unavailable: {detail.estimateError}</p> : null}
                {detail.updatesError ? <p>Update statistics unavailable: {detail.updatesError}</p> : null}
                {detail.calendarError ? <p>Calendar API unavailable: {detail.calendarError}</p> : null}
              </div>
            ) : null}
          </div>
        </div>
      </Card>

      <Card className="rounded-[28px] border-emerald-500/12 bg-[linear-gradient(180deg,rgba(8,38,30,0.52),rgba(10,15,14,0.98))] p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[11px] text-emerald-200/70">
              Salary estimate for {month}/{year}
            </p>
            <h2 className="mt-2 text-[1.7rem] font-semibold tracking-tight text-white">
              My Salary Snapshot
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={detail.report.hasPenalty ? 'danger' : 'outline'}>
              {detail.report.hasPenalty ? 'Deduction applied' : 'No deductions'}
            </Badge>
            <Badge variant={detail.report.hasBonus ? 'success' : 'outline'}>
              {detail.report.hasBonus ? 'Bonus applied' : 'No bonus'}
            </Badge>
            <Badge variant={(monthlyCompletion ?? 0) >= 80 ? 'success' : (monthlyCompletion ?? 0) > 0 ? 'warning' : 'outline'}>
              {formatPercent(monthlyCompletion)} monthly completion
            </Badge>
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-4">
          <DetailStatTile label="Estimated salary" value={formatAmount(detail.report.estimatedSalary)} tone="success" />
          <DetailStatTile label="Final salary" value={formatAmount(detail.report.finalSalary)} />
          <DetailStatTile label="Base salary" value={formatAmount(detail.report.baseSalary)} />
          <DetailStatTile label="Deduction amount" value={formatAmount(detail.report.deductionAmount)} tone="danger" />
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-6">
          <DetailStatTile label="Penalty entries" value={formatCount(detail.report.penaltyEntries)} tone="danger" />
          <DetailStatTile label="Bonus entries" value={formatCount(detail.report.bonusEntries)} tone="success" />
          <DetailStatTile label="Penalty points" value={formatCount(detail.report.penaltyPoints)} tone="danger" />
          <DetailStatTile label="After penalty" value={formatAmount(detail.report.afterPenalty)} />
          <DetailStatTile label="Bonus amount" value={formatAmount(detail.report.bonusAmount)} tone="success" />
          <div className="rounded-[16px] border border-rose-500/30 bg-rose-500/8 px-4 py-3">
            <p className="text-xs text-rose-100/78">Penalty percentage</p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="text-[1.05rem] font-semibold tracking-tight text-rose-300">
                {formatPercent(detail.report.penaltyPercentage)}
              </p>
              <span className="text-[10px] uppercase tracking-[0.18em] text-rose-200/62">impact</span>
            </div>
            <div className="mt-3">
              <ProgressBar value={Number.isFinite(detail.report.penaltyPercentage) ? detail.report.penaltyPercentage : 0} tone={(detail.report.penaltyPercentage ?? 0) > 0 ? 'danger' : 'violet'} />
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <div className="rounded-[22px] border border-rose-500/20 bg-black/18 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-rose-200/70">Penalty history</p>
                <p className="mt-1 text-sm text-white/64">
                  {detail.penalties.length > 0 ? `${detail.penalties.length} entries in this period.` : 'No penalty records returned.'}
                </p>
              </div>
              <Badge variant={detail.penalties.length > 0 ? 'danger' : 'outline'}>
                {detail.penalties.length}
              </Badge>
            </div>

            <div className="mt-4 space-y-3">
              {detail.penalties.length > 0 ? detail.penalties.map((item) => (
                <div key={item.id} className="rounded-[16px] border border-rose-500/16 bg-black/20 px-4 py-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-rose-200">{item.title}</p>
                      <p className="mt-1 text-xs text-white/56">{item.description ?? 'No reason provided.'}</p>
                    </div>
                    <p className="text-sm font-semibold text-rose-300">{formatDetailDate(item.createdAt)}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {item.points ? <Badge variant="danger">{item.points} points</Badge> : null}
                    <Badge variant="outline">{formatAmount(item.amount)}</Badge>
                  </div>
                </div>
              )) : (
                <div className="rounded-[16px] border border-dashed border-rose-500/18 bg-black/10 px-4 py-5 text-sm text-rose-100/68">
                  No penalty line-items were returned for the selected month.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[22px] border border-emerald-500/20 bg-black/18 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-200/70">Bonus history</p>
                <p className="mt-1 text-sm text-white/64">
                  {detail.bonuses.length > 0 ? `${detail.bonuses.length} entries in this period.` : 'No bonus records returned.'}
                </p>
              </div>
              <Badge variant={detail.bonuses.length > 0 ? 'success' : 'outline'}>
                {detail.bonuses.length}
              </Badge>
            </div>

            <div className="mt-4 space-y-3">
              {detail.bonuses.length > 0 ? detail.bonuses.map((item) => (
                <div key={item.id} className="rounded-[16px] border border-emerald-500/16 bg-black/20 px-4 py-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-emerald-200">{item.title}</p>
                      <p className="mt-1 text-xs text-white/56">{item.description ?? 'No reason provided.'}</p>
                    </div>
                    <p className="text-sm font-semibold text-emerald-300">{formatDetailDate(item.createdAt)}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge variant="success">{formatAmount(item.amount)}</Badge>
                  </div>
                </div>
              )) : (
                <div className="rounded-[16px] border border-dashed border-emerald-500/18 bg-black/10 px-4 py-5 text-sm text-emerald-100/68">
                  No bonus line-items were returned for the selected month.
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

    </section>
  )
}
