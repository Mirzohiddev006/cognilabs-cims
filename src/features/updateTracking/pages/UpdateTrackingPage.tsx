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
    <Card className="p-6">
      <SectionTitle
        eyebrow={eyebrow}
        title={title}
        description="API javobi to'g'ridan-to'g'ri preview formatida ko'rsatilmoqda."
      />
      <pre className="mt-5 overflow-x-auto rounded-lg border border-[var(--border)] bg-[#0f172a] p-4 text-xs leading-6 text-slate-100">
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
      title: 'Update tracking yangilandi',
      description: "Barcha update-tracking bloklari qayta yuklandi.",
      tone: 'success',
    })
  }

  if (myStatsQuery.isLoading && !myStatsQuery.data) {
    return (
      <LoadingStateBlock
        eyebrow="Updates / Day 8"
        title="Update tracking yuklanmoqda"
        description="Stats, company metrics va report endpointlari backenddan olinmoqda."
      />
    )
  }

  if (myStatsQuery.isError && !myStatsQuery.data) {
    return (
      <ErrorStateBlock
        eyebrow="Updates / Day 8"
        title="Update tracking ochilmadi"
        description="Asosiy update-tracking statistikalari olinmadi."
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
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-[var(--muted)]">Updates / Day 8</p>
          <h1 className="mt-2 text-4xl font-semibold text-[var(--foreground)]">Update tracking va release polish</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted-strong)]">
            My stats, company stats, recent, missing, monthly report, trends va calendar endpointlari bitta dashboard
            ichida ulandi.
          </p>
        </div>
        <Button onClick={() => void refreshAll()}>Refresh all</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">This week</p>
          <p className="mt-3 text-3xl font-semibold text-[var(--foreground)]">
            {formatCompactNumber(myStatsQuery.data?.updates_this_week ?? 0)}
          </p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {Math.round(myStatsQuery.data?.percentage_this_week ?? 0)}% completion.
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">This month</p>
          <p className="mt-3 text-3xl font-semibold text-[var(--foreground)]">
            {formatCompactNumber(myStatsQuery.data?.updates_this_month ?? 0)}
          </p>
          <p className="mt-2 text-sm text-[var(--muted)]">{monthlyCompletion}% oy yakuni.</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Company today</p>
          <p className="mt-3 text-3xl font-semibold text-[var(--foreground)]">
            {formatCompactNumber(companyStatsQuery.data?.total_updates_today ?? 0)}
          </p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {companyStatsQuery.data?.total_employees ?? 0} employee bazasidan.
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Company weekly avg</p>
          <p className="mt-3 text-3xl font-semibold text-[var(--foreground)]">
            {Math.round(companyStatsQuery.data?.avg_percentage_this_week ?? 0)}%
          </p>
          <p className="mt-2 text-sm text-[var(--muted)]">Team bo'yicha weekly completion.</p>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[140px]">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-[var(--foreground)]">Month</span>
              <Input type="number" min="1" max="12" value={month} onChange={(event) => setMonth(Number(event.target.value))} />
            </label>
          </div>
          <div className="min-w-[140px]">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-[var(--foreground)]">Year</span>
              <Input type="number" min="2020" max="2035" value={year} onChange={(event) => setYear(Number(event.target.value))} />
            </label>
          </div>
          <div className="min-w-[180px]">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-[var(--foreground)]">Missing date</span>
              <Input type="date" value={dateCheck} onChange={(event) => setDateCheck(event.target.value)} />
            </label>
          </div>
          <div className="min-w-[140px]">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-[var(--foreground)]">Recent limit</span>
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
