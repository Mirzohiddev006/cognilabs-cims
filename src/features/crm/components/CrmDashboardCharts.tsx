import { useId, useMemo } from 'react'
import type {
  SalesDashboardChartsResponse,
  SalesDashboardTrendPoint,
} from '../../../shared/api/types'
import { getIntlLocale, translateCurrentLiteral } from '../../../shared/i18n/translations'
import { cn } from '../../../shared/lib/cn'
import { formatCompactNumber } from '../../../shared/lib/format'
import { Badge } from '../../../shared/ui/badge'
import { Button } from '../../../shared/ui/button'
import { Card } from '../../../shared/ui/card'
import { SelectField, type SelectFieldOption } from '../../../shared/ui/select-field'

const customerTypeOptions: SelectFieldOption[] = [
  { value: '', label: 'All leads' },
  { value: 'local', label: 'Local' },
  { value: 'international', label: 'International' },
]

const lt = translateCurrentLiteral

const tonePalette = {
  blue: {
    line: '#60a5fa',
    areaStart: 'rgba(96,165,250,0.28)',
    areaEnd: 'rgba(96,165,250,0.02)',
    dot: '#bfdbfe',
    ring: 'border-blue-500/16 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.08),0_0_24px_rgba(59,130,246,0.05)]',
    label: 'text-blue-300/80',
    badge: 'blue' as const,
    bar: 'bg-blue-400',
  },
  violet: {
    line: '#a78bfa',
    areaStart: 'rgba(167,139,250,0.26)',
    areaEnd: 'rgba(167,139,250,0.03)',
    dot: '#ddd6fe',
    ring: 'border-violet-500/16 shadow-[inset_0_0_0_1px_rgba(139,92,246,0.08),0_0_24px_rgba(139,92,246,0.05)]',
    label: 'text-violet-300/80',
    badge: 'violet' as const,
    bar: 'bg-violet-400',
  },
  emerald: {
    line: '#34d399',
    areaStart: 'rgba(52,211,153,0.26)',
    areaEnd: 'rgba(52,211,153,0.03)',
    dot: '#a7f3d0',
    ring: 'border-emerald-500/16 shadow-[inset_0_0_0_1px_rgba(34,197,94,0.08),0_0_24px_rgba(34,197,94,0.05)]',
    label: 'text-emerald-300/80',
    badge: 'success' as const,
    bar: 'bg-emerald-400',
  },
  amber: {
    line: '#fbbf24',
    areaStart: 'rgba(251,191,36,0.24)',
    areaEnd: 'rgba(251,191,36,0.03)',
    dot: '#fde68a',
    ring: 'border-amber-500/16 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.08),0_0_24px_rgba(245,158,11,0.05)]',
    label: 'text-amber-300/80',
    badge: 'warning' as const,
    bar: 'bg-amber-400',
  },
} as const

type AccentTone = keyof typeof tonePalette

type CrmDashboardChartsProps = {
  weekly?: SalesDashboardChartsResponse
  monthly?: SalesDashboardChartsResponse
  customerType: string
  onCustomerTypeChange: (value: string) => void
  isLoading: boolean
  isError: boolean
  onRetry: () => void
}

function formatPercent(value?: number | null) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '0.0%'
  }

  return `${value.toFixed(1)}%`
}

function formatRangeLabel(payload?: SalesDashboardChartsResponse) {
  if (!payload) {
    return lt('Period unavailable')
  }

  const start = new Date(payload.period.start_date)
  const end = new Date(payload.period.end_date)

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return `${payload.period.days} ${lt('days')}`
  }

  const formatter = new Intl.DateTimeFormat(getIntlLocale(), { month: 'short', day: 'numeric' })
  return `${formatter.format(start)} - ${formatter.format(end)}`
}

function formatTickLabel(date: string, totalPoints: number) {
  const parsed = new Date(date)

  if (Number.isNaN(parsed.getTime())) {
    return date
  }

  return new Intl.DateTimeFormat(
    getIntlLocale(),
    totalPoints <= 8
      ? { weekday: 'short' }
      : { month: 'short', day: 'numeric' },
  ).format(parsed)
}

function getPeakPoint(points: SalesDashboardTrendPoint[]) {
  return points.reduce<SalesDashboardTrendPoint | null>((current, point) => (
    !current || point.count > current.count ? point : current
  ), null)
}

function MiniStat({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint: string
}) {
  return (
    <div className="rounded-[20px] border border-white/8 bg-black/12 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-white">{value}</p>
      <p className="mt-1 text-xs text-[var(--muted-strong)]">{hint}</p>
    </div>
  )
}

function TrendChartCard({
  title,
  description,
  payload,
  accent,
}: {
  title: string
  description: string
  payload?: SalesDashboardChartsResponse
  accent: AccentTone
}) {
  const ids = useId()
  const gradientId = `crm-chart-${ids.replace(/:/g, '')}`
  const colors = tonePalette[accent]
  const chartWidth = 620
  const chartHeight = 220
  const padX = 14
  const padY = 18
  const trend = payload?.trend ?? []
  const totalPoints = trend.length
  const maxValue = Math.max(...trend.map((point) => point.count), 1)
  const points = useMemo(() => {
    if (trend.length === 0) {
      return []
    }

    return trend.map((point, index) => {
      const x = trend.length === 1
        ? chartWidth / 2
        : padX + (index / (trend.length - 1)) * (chartWidth - padX * 2)
      const y = chartHeight - padY - (point.count / maxValue) * (chartHeight - padY * 2)

      return {
        ...point,
        x,
        y,
      }
    })
  }, [chartHeight, chartWidth, maxValue, trend])
  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ')
  const areaPath = points.length > 1
    ? `${linePath} L ${points[points.length - 1]!.x.toFixed(2)} ${(chartHeight - padY).toFixed(2)} L ${points[0]!.x.toFixed(2)} ${(chartHeight - padY).toFixed(2)} Z`
    : ''
  const averagePerDay = totalPoints > 0
    ? trend.reduce((sum, point) => sum + point.count, 0) / totalPoints
    : 0
  const peakPoint = getPeakPoint(trend)
  const labelStep = totalPoints <= 7 ? 1 : Math.max(1, Math.ceil(totalPoints / 6))

  return (
    <Card className={cn('p-5', colors.ring)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className={cn('text-[10px] font-semibold uppercase tracking-[0.22em]', colors.label)}>{title}</p>
          <h3 className="mt-2 text-xl font-semibold tracking-tight text-white">
            {payload ? `${formatCompactNumber(payload.summary.total_period_leads)} ${lt('leads')}` : lt('No dataset yet')}
          </h3>
          <p className="mt-1 text-sm text-[var(--muted-strong)]">{description}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={colors.badge}>{payload ? formatRangeLabel(payload) : lt('Waiting for API')}</Badge>
          {payload ? (
            <Badge variant="outline">{formatPercent(payload.summary.conversion_rate_percent)} {lt('conversion')}</Badge>
          ) : null}
        </div>
      </div>

      {payload && trend.length > 0 ? (
        <>
          <div className="mt-5 overflow-hidden rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))] px-2 py-4">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-56 w-full">
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={colors.areaStart} />
                  <stop offset="100%" stopColor={colors.areaEnd} />
                </linearGradient>
              </defs>

              {[0.25, 0.5, 0.75, 1].map((fraction) => {
                const y = padY + (chartHeight - padY * 2) * fraction

                return (
                  <line
                    key={fraction}
                    x1={padX}
                    x2={chartWidth - padX}
                    y1={y}
                    y2={y}
                    stroke="rgba(255,255,255,0.08)"
                    strokeDasharray="3 6"
                  />
                )
              })}

              {areaPath ? <path d={areaPath} fill={`url(#${gradientId})`} /> : null}
              {linePath ? (
                <path
                  d={linePath}
                  fill="none"
                  stroke={colors.line}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : null}

              {points.map((point) => (
                <circle
                  key={`${point.date}-${point.count}`}
                  cx={point.x}
                  cy={point.y}
                  r="4"
                  fill={colors.dot}
                  stroke={colors.line}
                  strokeWidth="2"
                />
              ))}

              {points.map((point, index) => {
                if (index % labelStep !== 0 && index !== points.length - 1) {
                  return null
                }

                const textAnchor =
                  index === 0 ? 'start' :
                  index === points.length - 1 ? 'end' :
                  'middle'

                return (
                  <text
                    key={`label-${point.date}`}
                    x={point.x}
                    y={chartHeight - 2}
                    textAnchor={textAnchor}
                    fill="rgba(255,255,255,0.45)"
                    fontSize="10"
                    fontWeight="600"
                  >
                    {formatTickLabel(point.date, totalPoints)}
                  </text>
                )
              })}
            </svg>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <MiniStat
              label={lt('Today')}
              value={formatCompactNumber(payload.summary.today)}
              hint={lt('Leads created today')}
            />
            <MiniStat
              label={lt('Average / Day')}
              value={averagePerDay.toFixed(1)}
              hint={lt('Mean across this range')}
            />
            <MiniStat
              label={lt('Peak Day')}
              value={peakPoint ? formatCompactNumber(peakPoint.count) : '0'}
              hint={peakPoint ? formatTickLabel(peakPoint.date, totalPoints) : lt('No peak')}
            />
          </div>
        </>
      ) : (
        <div className="mt-5 rounded-[24px] border border-dashed border-white/10 bg-black/10 px-4 py-8 text-sm text-[var(--muted-strong)]">
          {lt('Trend dataset is empty for this period.')}
        </div>
      )}
    </Card>
  )
}

export function CrmDashboardCharts({
  weekly,
  monthly,
  customerType,
  onCustomerTypeChange,
  isLoading,
  isError,
  onRetry,
}: CrmDashboardChartsProps) {
  const summary = monthly?.summary ?? weekly?.summary

  return (
    <Card className="overflow-hidden border-white/10 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-blue-300/80">CRM</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">{lt('CRM lead movement')}</h2>
          <p className="mt-1 text-sm text-[var(--muted-strong)]">
            {lt('7-day and 30-day lead flow is shown together.')}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="min-w-[180px]">
            <SelectField
              value={customerType}
              options={customerTypeOptions.map((option) => ({ ...option, label: lt(option.label) }))}
              onValueChange={onCustomerTypeChange}
            />
          </div>
          <Button variant="secondary" onClick={onRetry} loading={isLoading}>
            {lt('Refresh charts')}
          </Button>
        </div>
      </div>

      {summary ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MiniStat
            label={lt('30d Leads')}
            value={formatCompactNumber(summary.total_period_leads)}
            hint={lt('Total leads across the selected monthly range')}
          />
          <MiniStat
            label={lt('This Week')}
            value={formatCompactNumber(summary.this_week)}
            hint={lt('Current week lead intake')}
          />
          <MiniStat
            label={lt('Started')}
            value={formatCompactNumber(summary.project_started)}
            hint={lt('Moved to project-started status')}
          />
          <MiniStat
            label={lt('Conversion')}
            value={formatPercent(summary.conversion_rate_percent)}
            hint={lt('Project-started conversion rate')}
          />
        </div>
      ) : null}

      {isError && !weekly && !monthly ? (
        <div className="mt-5 rounded-[24px] border border-dashed border-rose-500/30 bg-rose-500/[0.06] px-5 py-8 text-sm text-rose-100/80">
          {lt('Chart API could not be loaded. Retry the dashboard charts request.')}
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            <TrendChartCard
              title={lt('7-day view')}
              description={lt('Short-range lead flow for the last week.')}
              payload={weekly}
              accent="blue"
            />
            <TrendChartCard
              title={lt('30-day view')}
              description={lt('Longer-range lead flow for the last month.')}
              payload={monthly}
              accent="violet"
            />
          </div>
        </>
      )}
    </Card>
  )
}
