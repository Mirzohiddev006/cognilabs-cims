import { useMemo, useState } from 'react'
import { updateTrackingService } from '../../../shared/api/services/updateTracking.service'
import { useAsyncData } from '../../../shared/hooks/useAsyncData'
import { stringifyApiData } from '../../../shared/lib/api-error'
import { formatCompactNumber } from '../../../shared/lib/format'
import { useToast } from '../../../shared/toast/useToast'
import { Button } from '../../../shared/ui/button'
import { Card } from '../../../shared/ui/card'
import { Input } from '../../../shared/ui/input'
import { SectionTitle } from '../../../shared/ui/section-title'
import { ErrorStateBlock, LoadingStateBlock } from '../../../shared/ui/state-block'

const now = new Date()

function RawDataCard({
  eyebrow,
  title,
  payload,
}: {
  eyebrow: string
  title: string
  payload: unknown
}) {
  return (
    <Card className="p-6 bg-white/5 border-white/10">
      <SectionTitle
        eyebrow={eyebrow}
        title={title}
        description="Direct API response preview for debugging and verification."
      />
      <pre className="mt-5 overflow-x-auto rounded-xl border border-white/10 bg-black/40 p-5 text-[11px] leading-relaxed font-medium text-blue-400">
        {stringifyApiData(payload)}
      </pre>
    </Card>
  )
}

export function UpdateTrackingPage() {
  const { showToast } = useToast()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [dateCheck, setDateCheck] = useState(now.toISOString().slice(0, 10))
  const [recentLimit, setRecentLimit] = useState(20)

  const myStatsQuery = useAsyncData(() => updateTrackingService.myStats(), [])
  const companyStatsQuery = useAsyncData(() => updateTrackingService.companyStats(), [])
  const myProfileQuery = useAsyncData(() => updateTrackingService.myProfile(), [])
  const monthlyReportQuery = useAsyncData(() => updateTrackingService.monthlyReport(month, year), [month, year])
  const calendarQuery = useAsyncData(() => updateTrackingService.calendar(month, year), [month, year])
  const trendsQuery = useAsyncData(() => updateTrackingService.trends(), [])
  const recentQuery = useAsyncData(() => updateTrackingService.recent(recentLimit), [recentLimit])
  const missingQuery = useAsyncData(() => updateTrackingService.missing(dateCheck), [dateCheck])

  const monthlyCompletion = useMemo(() => {
    return Math.round(myStatsQuery.data?.percentage_this_month ?? 0)
  }, [myStatsQuery.data?.percentage_this_month])

  async function refreshAll() {
    await Promise.all([
      myStatsQuery.refetch(),
      companyStatsQuery.refetch(),
      myProfileQuery.refetch(),
      monthlyReportQuery.refetch(),
      calendarQuery.refetch(),
      trendsQuery.refetch(),
      recentQuery.refetch(),
      missingQuery.refetch(),
    ])
    showToast({
      title: 'Tracking data updated',
      description: 'All update-tracking blocks have been reloaded.',
      tone: 'success',
    })
  }

  if (myStatsQuery.isLoading && !myStatsQuery.data) {
    return (
      <LoadingStateBlock
        eyebrow="Updates / Tracking"
        title="Tracking data loading"
        description="Fetching statistics, company metrics, and report data."
      />
    )
  }

  if (myStatsQuery.isError && !myStatsQuery.data) {
    return (
      <ErrorStateBlock
        eyebrow="Updates / Tracking"
        title="Tracking data unavailable"
        description="Could not retrieve core update-tracking statistics."
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
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-blue-500">Updates / Tracking</p>
          <h1 className="mt-2 text-4xl font-bold text-white tracking-tight">Activity & Submission Tracking</h1>
          <p className="mt-3 max-w-3xl text-sm font-medium leading-relaxed text-[var(--muted)]">
            Comprehensive overview of individual and company-wide update submissions and compliance metrics.
          </p>
        </div>
        <Button onClick={() => void refreshAll()}>Refresh all</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="p-6 bg-white/5 border-white/10">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-500">This week</p>
          <p className="mt-3 text-3xl font-bold text-white tracking-tight">
            {formatCompactNumber(myStatsQuery.data?.updates_this_week ?? 0)}
          </p>
          <p className="mt-2 text-xs font-medium text-[var(--muted)]">
            {Math.round(myStatsQuery.data?.percentage_this_week ?? 0)}% completion rate.
          </p>
        </Card>
        <Card className="p-6 bg-white/5 border-white/10">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-500">This month</p>
          <p className="mt-3 text-3xl font-bold text-white tracking-tight">
            {formatCompactNumber(myStatsQuery.data?.updates_this_month ?? 0)}
          </p>
          <p className="mt-2 text-xs font-medium text-[var(--muted)]">{monthlyCompletion}% monthly goal.</p>
        </Card>
        <Card className="p-6 bg-white/5 border-white/10">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-500">Company today</p>
          <p className="mt-3 text-3xl font-bold text-white tracking-tight">
            {formatCompactNumber(companyStatsQuery.data?.total_updates_today ?? 0)}
          </p>
          <p className="mt-2 text-xs font-medium text-[var(--muted)]">
            From {companyStatsQuery.data?.total_employees ?? 0} active employees.
          </p>
        </Card>
        <Card className="p-6 bg-white/5 border-white/10">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-500">Company weekly avg</p>
          <p className="mt-3 text-3xl font-bold text-white tracking-tight">
            {Math.round(companyStatsQuery.data?.avg_percentage_this_week ?? 0)}%
          </p>
          <p className="mt-2 text-xs font-medium text-[var(--muted)]">Team weekly completion avg.</p>
        </Card>
      </div>

      <Card className="p-6 bg-white/5 border-white/10">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[140px]">
            <label className="grid gap-2">
              <span className="text-sm font-bold text-white tracking-tight">Month</span>
              <Input type="number" min="1" max="12" value={month} onChange={(event) => setMonth(Number(event.target.value))} />
            </label>
          </div>
          <div className="min-w-[140px]">
            <label className="grid gap-2">
              <span className="text-sm font-bold text-white tracking-tight">Year</span>
              <Input type="number" min="2020" max="2035" value={year} onChange={(event) => setYear(Number(event.target.value))} />
            </label>
          </div>
          <div className="min-w-[180px]">
            <label className="grid gap-2">
              <span className="text-sm font-bold text-white tracking-tight">Missing date</span>
              <Input type="date" value={dateCheck} onChange={(event) => setDateCheck(event.target.value)} />
            </label>
          </div>
          <div className="min-w-[140px]">
            <label className="grid gap-2">
              <span className="text-sm font-bold text-white tracking-tight">Recent limit</span>
              <Input
                type="number"
                min="1"
                max="100"
                value={recentLimit}
                onChange={(event) => setRecentLimit(Number(event.target.value) || 20)}
              />
            </label>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <RawDataCard eyebrow="Profile" title="My profile" payload={myProfileQuery.data ?? 'No data'} />
        <RawDataCard eyebrow="Monthly report" title="Monthly AI report" payload={monthlyReportQuery.data ?? 'No data'} />
        <RawDataCard eyebrow="Calendar" title="Daily calendar" payload={calendarQuery.data ?? 'No data'} />
        <RawDataCard eyebrow="Trends" title="Performance trends" payload={trendsQuery.data ?? 'No data'} />
        <RawDataCard eyebrow="Recent" title="Recent updates" payload={recentQuery.data ?? 'No data'} />
        <RawDataCard eyebrow="Missing" title="Missing submissions" payload={missingQuery.data ?? 'No data'} />
      </div>
    </section>
  )
}
