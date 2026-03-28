import { useMemo, useState } from 'react'
import { websiteStatsService, type WebsiteAnalyticsRow } from '../../../shared/api/services/website-stats.service'
import { useAsyncData } from '../../../shared/hooks/useAsyncData'
import { getApiErrorMessage } from '../../../shared/lib/api-error'
import { formatCompactNumber } from '../../../shared/lib/format'
import { useToast } from '../../../shared/toast/useToast'
import { Badge } from '../../../shared/ui/badge'
import { Button } from '../../../shared/ui/button'
import { Card } from '../../../shared/ui/card'
import { DataTable } from '../../../shared/ui/data-table'
import { PageHeader } from '../../../shared/ui/page-header'
import { SelectField, type SelectFieldOption } from '../../../shared/ui/select-field'
import { SectionTitle } from '../../../shared/ui/section-title'
import { EmptyStateBlock, ErrorStateBlock, LoadingStateBlock } from '../../../shared/ui/state-block'
import { useAuth } from '../../auth/hooks/useAuth'
import { MetricCard } from '../components/MetricCard'

const analyticsRangeOptions: SelectFieldOption[] = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
]
const trackedWebsiteUrl = 'https://www.cognilabs.org/en'

const websiteStatsApiHost = (() => {
  try {
    return new URL(websiteStatsService.apiBaseUrl).host
  } catch {
    return websiteStatsService.apiBaseUrl
  }
})()

function formatDateOnly(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function resolveAnalyticsQuery(daysValue: string) {
  const days = Math.max(1, Number(daysValue) || 30)
  const endDate = new Date()
  const startDate = new Date(endDate)
  startDate.setDate(endDate.getDate() - (days - 1))

  return {
    days,
    startDate: formatDateOnly(startDate),
    endDate: formatDateOnly(endDate),
  }
}

function normalizeAnalyticsLookupKey(value: string) {
  return value.trim().replace(/[^a-zA-Z0-9]+/g, '').toLowerCase()
}

function getAnalyticsMetric(metrics: Record<string, number>, candidates: string[]) {
  const metricEntries = Object.entries(metrics)

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeAnalyticsLookupKey(candidate)
    const matched = metricEntries.find(([key]) => normalizeAnalyticsLookupKey(key) === normalizedCandidate)

    if (matched) {
      return matched[1]
    }
  }

  return 0
}

function getAnalyticsDimension(dimensions: Record<string, string>, candidates: string[]) {
  const dimensionEntries = Object.entries(dimensions)

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeAnalyticsLookupKey(candidate)
    const matched = dimensionEntries.find(([key]) => normalizeAnalyticsLookupKey(key) === normalizedCandidate)

    if (matched?.[1]) {
      return matched[1]
    }
  }

  return ''
}

function getAnalyticsRowLabel(row: WebsiteAnalyticsRow) {
  return (
    getAnalyticsDimension(row.dimensions, ['pageTitle', 'screenPageTitle', 'title', 'pagePath', 'pagePathPlusQueryString'])
    || Object.values(row.dimensions).find(Boolean)
    || 'Untitled'
  )
}

function getAnalyticsRowSubLabel(row: WebsiteAnalyticsRow) {
  return (
    getAnalyticsDimension(row.dimensions, ['pagePath', 'pagePathPlusQueryString', 'hostName', 'date'])
    || Object.values(row.dimensions).slice(1).find(Boolean)
    || '-'
  )
}

function getWebsiteStatsErrorMessage(error: unknown, fallback: string) {
  const message = getApiErrorMessage(error, fallback)

  if (/failed to fetch/i.test(message) || /err_name_not_resolved/i.test(message)) {
    return `Analytics hostiga ulanib bo'lmadi (${websiteStatsApiHost}). Backend proxy yoki DNS ni tekshiring.`
  }

  return message
}

export function WebsiteStatsPage() {
  const { isAuthenticated } = useAuth()
  const { showToast } = useToast()
  const [analyticsRange, setAnalyticsRange] = useState('30')

  const analyticsWindow = useMemo(() => resolveAnalyticsQuery(analyticsRange), [analyticsRange])

  const analyticsQuery = useAsyncData(
    () => websiteStatsService.getAnalytics(analyticsWindow),
    [analyticsWindow.days, analyticsWindow.startDate, analyticsWindow.endDate, isAuthenticated],
    { enabled: isAuthenticated },
  )

  const realtimeAnalyticsQuery = useAsyncData(
    () => websiteStatsService.getRealtimeAnalytics(),
    [isAuthenticated],
    { enabled: isAuthenticated },
  )

  const analyticsSummary = analyticsQuery.data?.summary ?? {}
  const realtimeSummary = realtimeAnalyticsQuery.data?.summary ?? {}

  const analyticsTopPages = useMemo(() => {
    return (analyticsQuery.data?.rows ?? [])
      .map((row, index) => ({
        id: `${getAnalyticsRowLabel(row)}-${index}`,
        title: getAnalyticsRowLabel(row),
        subtitle: getAnalyticsRowSubLabel(row),
        views: getAnalyticsMetric(row.metrics, ['screenPageViews', 'views', 'pageViews']),
        users: getAnalyticsMetric(row.metrics, ['totalUsers', 'activeUsers', 'users']),
        sessions: getAnalyticsMetric(row.metrics, ['sessions']),
      }))
      .sort((left, right) => right.views - left.views || right.users - left.users || right.sessions - left.sessions)
      .slice(0, 8)
  }, [analyticsQuery.data?.rows])

  const realtimeRows = useMemo(() => {
    return (realtimeAnalyticsQuery.data?.rows ?? [])
      .map((row, index) => ({
        id: `${getAnalyticsRowLabel(row)}-${index}`,
        label: getAnalyticsRowLabel(row),
        subtitle: getAnalyticsRowSubLabel(row),
        activeUsers: getAnalyticsMetric(row.metrics, ['activeUsers', 'users', 'totalUsers']),
        views: getAnalyticsMetric(row.metrics, ['screenPageViews', 'views', 'pageViews', 'eventCount']),
      }))
      .sort((left, right) => right.activeUsers - left.activeUsers || right.views - left.views)
      .slice(0, 6)
  }, [realtimeAnalyticsQuery.data?.rows])

  const totalUsersMetric = getAnalyticsMetric(analyticsSummary, ['totalUsers', 'activeUsers', 'users'])
  const sessionsMetric = getAnalyticsMetric(analyticsSummary, ['sessions'])
  const pageViewsMetric = getAnalyticsMetric(analyticsSummary, ['screenPageViews', 'views', 'pageViews'])
  const realtimeActiveUsersMetric = getAnalyticsMetric(realtimeSummary, ['activeUsers', 'users', 'totalUsers'])

  async function handleRefresh() {
    const results = await Promise.allSettled([
      analyticsQuery.refetch(),
      realtimeAnalyticsQuery.refetch(),
    ])

    const failed = results.find((result) => result.status === 'rejected')

    if (failed?.status === 'rejected') {
      showToast({
        title: 'Refresh failed',
        description: getWebsiteStatsErrorMessage(failed.reason, 'Analytics data yangilanmadi.'),
        tone: 'error',
      })
      return
    }

    showToast({
      title: 'Analytics refreshed',
      description: "Website traffic ma'lumotlari qayta yuklandi.",
      tone: 'success',
    })
  }

  return (
    <section className="space-y-8">
      <PageHeader
        eyebrow="CEO / Web"
        title="Website Stats"
        description={`Google Analytics overview for ${trackedWebsiteUrl}. Blog va admin CRUD oqimlari bu sahifadan olib tashlangan.`}
        meta={[
          {
            label: 'Tracked site',
            value: 'cognilabs.org/en',
            hint: trackedWebsiteUrl,
            tone: 'neutral',
          },
          {
            label: 'Range',
            value: `${analyticsWindow.days} days`,
            hint: `${analyticsWindow.startDate} to ${analyticsWindow.endDate}`,
            tone: 'neutral',
          },
          {
            label: 'Page views',
            value: formatCompactNumber(pageViewsMetric),
            hint: 'From /api/analytics summary',
            tone: 'blue',
          },
          {
            label: 'Users',
            value: formatCompactNumber(totalUsersMetric),
            hint: 'Selected date window',
            tone: 'success',
          },
          {
            label: 'Realtime active',
            value: formatCompactNumber(realtimeActiveUsersMetric),
            hint: 'From /api/analytics/realtime',
            tone: 'warning',
          },
        ]}
        actions={(
          <Button variant="secondary" onClick={() => void handleRefresh()}>
            Refresh analytics
          </Button>
        )}
      />

      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <SectionTitle
            eyebrow="Analytics"
            title="Google Analytics Snapshot"
            description={`Aynan ${trackedWebsiteUrl} statistikasi. Frontend faqat protected analytics hostga ulanadi, Google credentiallar browserga chiqmaydi.`}
          />
          <div className="w-full max-w-[180px]">
            <SelectField
              value={analyticsRange}
              options={analyticsRangeOptions}
              onValueChange={setAnalyticsRange}
            />
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Page views"
            value={formatCompactNumber(pageViewsMetric)}
            caption={`${analyticsWindow.startDate} to ${analyticsWindow.endDate}`}
            accent="blue"
            sparkBars={[1, Math.max(pageViewsMetric * 0.35, 1), Math.max(pageViewsMetric * 0.58, 1), Math.max(pageViewsMetric * 0.82, 1), Math.max(pageViewsMetric, 1)]}
          />
          <MetricCard
            label="Users"
            value={formatCompactNumber(totalUsersMetric)}
            caption="Total users in selected range"
            accent="success"
            sparkBars={[1, Math.max(totalUsersMetric * 0.32, 1), Math.max(totalUsersMetric * 0.54, 1), Math.max(totalUsersMetric * 0.78, 1), Math.max(totalUsersMetric, 1)]}
          />
          <MetricCard
            label="Sessions"
            value={formatCompactNumber(sessionsMetric)}
            caption="Tracked sessions"
            accent="violet"
            sparkBars={[1, Math.max(sessionsMetric * 0.3, 1), Math.max(sessionsMetric * 0.56, 1), Math.max(sessionsMetric * 0.8, 1), Math.max(sessionsMetric, 1)]}
          />
          <MetricCard
            label="Realtime active"
            value={formatCompactNumber(realtimeActiveUsersMetric)}
            caption="Current live users"
            accent="warning"
            sparkBars={[1, Math.max(realtimeActiveUsersMetric * 0.4, 1), Math.max(realtimeActiveUsersMetric * 0.7, 1), Math.max(realtimeActiveUsersMetric, 1)]}
          />
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card variant="glass" className="overflow-hidden p-0">
          <div className="border-b border-white/10 px-6 py-5">
            <SectionTitle
              eyebrow="Top pages"
              title="Most visited pages"
              description="Normalized from /api/analytics rows using title and path dimensions when available."
            />
          </div>
          <div className="px-6 py-5">
            {analyticsQuery.isLoading && !analyticsQuery.data ? (
              <LoadingStateBlock
                eyebrow="Analytics"
                title="Loading analytics report"
                description="Fetching summary and top pages from /api/analytics."
              />
            ) : analyticsQuery.isError && !analyticsQuery.data ? (
              <ErrorStateBlock
                eyebrow="Analytics"
                title="Analytics report unavailable"
                description={getWebsiteStatsErrorMessage(
                  analyticsQuery.error,
                  '/api/analytics did not return a usable payload.',
                )}
                actionLabel="Retry"
                onAction={() => {
                  void analyticsQuery.refetch().catch(() => null)
                }}
              />
            ) : (
              <DataTable
                caption="Google Analytics top pages"
                rows={analyticsTopPages}
                getRowKey={(row) => row.id}
                pageSize={8}
                zebra
                emptyState={(
                  <EmptyStateBlock
                    eyebrow="Analytics"
                    title="No page data"
                    description="The selected range returned no page-level rows."
                  />
                )}
                columns={[
                  {
                    key: 'page',
                    header: 'Page',
                    width: '320px',
                    render: (row) => (
                      <div className="max-w-[320px]">
                        <p className="truncate font-semibold text-(--foreground)">{row.title}</p>
                        <p className="mt-1 truncate text-xs text-(--muted)">{row.subtitle}</p>
                      </div>
                    ),
                  },
                  {
                    key: 'views',
                    header: 'Views',
                    align: 'right',
                    render: (row) => formatCompactNumber(row.views),
                  },
                  {
                    key: 'users',
                    header: 'Users',
                    align: 'right',
                    render: (row) => formatCompactNumber(row.users),
                  },
                  {
                    key: 'sessions',
                    header: 'Sessions',
                    align: 'right',
                    render: (row) => formatCompactNumber(row.sessions),
                  },
                ]}
              />
            )}
          </div>
        </Card>

        <Card variant="glass" className="overflow-hidden p-0">
          <div className="border-b border-white/10 px-6 py-5">
            <SectionTitle
              eyebrow="Realtime"
              title="Live traffic"
              description="Latest active pages and users from /api/analytics/realtime."
            />
          </div>
          <div className="px-6 py-5">
            {realtimeAnalyticsQuery.isLoading && !realtimeAnalyticsQuery.data ? (
              <LoadingStateBlock
                eyebrow="Realtime"
                title="Loading live traffic"
                description="Fetching current active users and events."
              />
            ) : realtimeAnalyticsQuery.isError && !realtimeAnalyticsQuery.data ? (
              <ErrorStateBlock
                eyebrow="Realtime"
                title="Realtime report unavailable"
                description={getWebsiteStatsErrorMessage(
                  realtimeAnalyticsQuery.error,
                  '/api/analytics/realtime did not return a usable payload.',
                )}
                actionLabel="Retry"
                onAction={() => {
                  void realtimeAnalyticsQuery.refetch().catch(() => null)
                }}
              />
            ) : realtimeRows.length === 0 ? (
              <EmptyStateBlock
                eyebrow="Realtime"
                title="No live traffic rows"
                description="Realtime endpoint responded, but there are no active rows right now."
              />
            ) : (
              <div className="space-y-3">
                {realtimeRows.map((row) => (
                  <div
                    key={row.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-white/10 bg-black/10 px-4 py-4"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-(--foreground)">{row.label}</p>
                      <p className="mt-1 truncate text-xs text-(--muted)">{row.subtitle}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="warning" dot>
                        {formatCompactNumber(row.activeUsers)} active
                      </Badge>
                      <Badge variant="secondary">
                        {formatCompactNumber(row.views)} events
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </section>
  )
}
