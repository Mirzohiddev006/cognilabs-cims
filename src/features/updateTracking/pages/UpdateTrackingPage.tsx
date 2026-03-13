import { useMemo, useState, type ReactNode } from 'react'
import { updateTrackingService } from '../../../shared/api/services/updateTracking.service'
import type { DayStatus, UpdateTrackingStats } from '../../../shared/api/types'
import { useAuth } from '../../auth/hooks/useAuth'
import { useAsyncData } from '../../../shared/hooks/useAsyncData'
import { cn } from '../../../shared/lib/cn'
import { useToast } from '../../../shared/toast/useToast'
import { Badge } from '../../../shared/ui/badge'
import { Button } from '../../../shared/ui/button'
import { Card } from '../../../shared/ui/card'
import { Input } from '../../../shared/ui/input'
import { SectionTitle } from '../../../shared/ui/section-title'
import { ErrorStateBlock, LoadingStateBlock } from '../../../shared/ui/state-block'

const now = new Date()
const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/* ─── Types ─────────────────────────────────────────────── */
type CalendarDay = {
  day: number
  date?: string
  status: DayStatus
  updates_count?: number | null
}

type CalendarData = {
  month: number
  year: number
  days: CalendarDay[]
}

type RecentUpdate = {
  id?: number | string
  update_date?: string
  date?: string
  message?: string
  text?: string
  update_text?: string
  [key: string]: unknown
}

type TrendMonth = {
  month: number
  year: number
  month_name?: string
  submitted_count?: number
  missing_count?: number
  completion_percentage?: number
}

/* ─── Parsers ────────────────────────────────────────────── */
function parseCalendar(data: unknown): CalendarData | null {
  if (!data || typeof data !== 'object') return null
  const obj = data as Record<string, unknown>
  const month = typeof obj.month === 'number' ? obj.month : now.getMonth() + 1
  const year  = typeof obj.year  === 'number' ? obj.year  : now.getFullYear()
  const raw = Array.isArray(obj.calendar) ? obj.calendar
    : Array.isArray(obj.days) ? obj.days
    : Array.isArray(obj.data) ? obj.data : null
  if (!raw) return null
  const days: CalendarDay[] = (raw as Record<string, unknown>[])
    .filter((d) => typeof d === 'object' && d !== null)
    .map((d) => ({
      day: typeof d.day === 'number' ? d.day : 0,
      date: typeof d.date === 'string' ? d.date : typeof d.full_date === 'string' ? d.full_date : undefined,
      status: (typeof d.status === 'string' ? d.status : 'neutral') as DayStatus,
      updates_count: typeof d.updates_count === 'number' ? d.updates_count : null,
    }))
    .filter((d) => d.day > 0)
  return { month, year, days }
}

function parseRecent(data: unknown): RecentUpdate[] {
  if (!data) return []
  if (Array.isArray(data)) return data as RecentUpdate[]
  if (typeof data === 'object' && data !== null) {
    const obj = data as Record<string, unknown>
    for (const key of ['updates', 'items', 'results', 'data', 'recent']) {
      if (Array.isArray(obj[key])) return obj[key] as RecentUpdate[]
    }
  }
  return []
}

function parseTrends(data: unknown): TrendMonth[] {
  if (!data) return []
  if (Array.isArray(data)) return data as TrendMonth[]
  if (typeof data === 'object' && data !== null) {
    const obj = data as Record<string, unknown>
    for (const key of ['trends', 'months', 'data', 'results']) {
      if (Array.isArray(obj[key])) return obj[key] as TrendMonth[]
    }
  }
  return []
}

/* ─── Month helpers ──────────────────────────────────────── */
function getMonthName(month: number): string {
  return new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date(2024, month - 1))
}
const ALL_MONTHS = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: getMonthName(i + 1) }))

/* ─── Calendar day styles ────────────────────────────────── */
const dayStyle: Record<DayStatus, string> = {
  submitted: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200',
  missing:   'bg-rose-500/15 border-rose-500/30 text-rose-300',
  sunday:    'bg-amber-400/10 border-amber-400/20 text-amber-300/70',
  future:    'bg-white/[0.03] border-white/8 text-(--muted)',
  neutral:   'bg-white/[0.03] border-white/8 text-(--muted)',
}

/* ─── Summary card ───────────────────────────────────────── */
type AccentKey = 'default' | 'success' | 'warning' | 'blue' | 'violet'

const cardBorder: Record<AccentKey, string> = {
  default: 'border-white/8',
  success: 'border-emerald-500/20',
  warning: 'border-amber-500/20',
  blue:    'border-blue-500/20',
  violet:  'border-violet-500/20',
}

const cardIcon: Record<AccentKey, string> = {
  default: 'border-white/10 bg-white/6 text-(--muted-strong)',
  success: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
  warning: 'border-amber-500/20 bg-amber-400/10 text-amber-300',
  blue:    'border-blue-500/20 bg-blue-600/10 text-blue-300',
  violet:  'border-violet-500/20 bg-violet-500/10 text-violet-300',
}

function SummaryCard({ icon, label, value, accent = 'default' }: {
  icon: ReactNode
  label: string
  value: ReactNode
  accent?: AccentKey
}) {
  return (
    <div className={cn('card-base flex items-center gap-4 px-5 py-4', cardBorder[accent])}>
      <div className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl border', cardIcon[accent])}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-(--muted)">{label}</p>
        <p className="mt-1 truncate text-xl font-semibold leading-none text-white">{value}</p>
      </div>
    </div>
  )
}

function CompletionBar({ pct }: { pct: number }) {
  const color = pct >= 90 ? 'bg-emerald-500' : pct >= 75 ? 'bg-amber-400' : 'bg-rose-500'
  return (
    <div className="h-1.5 w-full rounded-full bg-white/8">
      <div className={cn('h-full rounded-full transition-all duration-500', color)} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  )
}

/* ─── Page ───────────────────────────────────────────────── */
export function UpdateTrackingPage() {
  const { user: currentUser } = useAuth()
  const { showToast } = useToast()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear]   = useState(now.getFullYear())

  const statsQuery    = useAsyncData(() => updateTrackingService.myStats(), [])
  const calendarQuery = useAsyncData(() => updateTrackingService.calendar(month, year), [month, year])
  const trendsQuery   = useAsyncData(() => updateTrackingService.trends(), [])
  const recentQuery   = useAsyncData(
    () => updateTrackingService.recent(20, currentUser?.id),
    [currentUser?.id],
  )

  const stats    = statsQuery.data
  const calendar = useMemo(() => parseCalendar(calendarQuery.data), [calendarQuery.data])
  const trends   = useMemo(() => parseTrends(trendsQuery.data), [trendsQuery.data])
  const recent   = useMemo(() => parseRecent(recentQuery.data), [recentQuery.data])

  async function handleRefresh() {
    await Promise.all([
      statsQuery.refetch(),
      calendarQuery.refetch(),
      trendsQuery.refetch(),
      recentQuery.refetch(),
    ])
    showToast({ title: 'Refreshed', description: 'Your update data has been reloaded.', tone: 'success' })
  }

  if (statsQuery.isLoading && !stats) {
    return (
      <LoadingStateBlock
        eyebrow="Updates"
        title="Loading your updates"
        description="Fetching your personal update statistics."
      />
    )
  }

  if (statsQuery.isError && !stats) {
    return (
      <ErrorStateBlock
        eyebrow="Updates"
        title="Updates unavailable"
        description="Could not load your update statistics."
        actionLabel="Retry"
        onAction={() => void statsQuery.refetch()}
      />
    )
  }

  const monthlyPct        = stats?.percentage_this_month ?? 0
  const weeklyPct         = stats?.percentage_this_week  ?? 0
  const selectedMonthName = getMonthName(month)

  const firstDayOffset = calendar
    ? (new Date(calendar.year, calendar.month - 1, 1).getDay() + 6) % 7
    : 0
  const calendarCells = calendar
    ? [...Array.from<null>({ length: firstDayOffset }).fill(null), ...calendar.days]
    : []

  return (
    <section className="space-y-6 page-enter">

      {/* ── Header ─────────────────────────────────── */}
      <Card variant="glass" noPadding className="overflow-hidden rounded-[28px] border-white/8">
        <div className="relative overflow-hidden px-6 py-6 sm:px-8 sm:py-7">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.15),transparent_70%)]" />
          <div className="pointer-events-none absolute -right-10 top-4 h-32 w-32 rounded-full bg-violet-400/8 blur-3xl" />

          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-violet-400/80">
                Personal
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-[1.75rem]">
                My Updates
              </h1>
              <p className="mt-1.5 text-[13px] text-(--muted)">
                Track your daily update submissions and performance.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/4 px-3 py-2">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-(--muted)">Year</label>
                <Input
                  type="number"
                  min="2020"
                  max="2035"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value) || now.getFullYear())}
                  className="h-7 w-18 border-white/10 bg-transparent px-2 text-sm text-white"
                />
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/4 px-3 py-2">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-(--muted)">Month</label>
                <select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="h-7 rounded-lg border border-white/10 bg-(--surface) px-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/20"
                >
                  {ALL_MONTHS.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => void handleRefresh()}
                className="min-h-9 gap-1.5 rounded-xl"
              >
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M1.5 8a6.5 6.5 0 1 1 1.2 3.8" />
                  <path d="M1.5 12.5V8.5h4" />
                </svg>
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Stats ──────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 stagger-children">
        <SummaryCard
          accent="violet"
          label="Monthly Completion"
          value={`${monthlyPct.toFixed(1)}%`}
          icon={
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 10a8 8 0 1 1 16 0" />
              <path d="M10 10V4" /><path d="M10 10l4 2.5" />
            </svg>
          }
        />
        <SummaryCard
          accent={weeklyPct >= 80 ? 'success' : weeklyPct >= 50 ? 'warning' : 'default'}
          label="Weekly Completion"
          value={`${weeklyPct.toFixed(1)}%`}
          icon={
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="16" height="14" rx="2" />
              <path d="M7 3v14M13 3v14M2 9h16M2 13h16" />
            </svg>
          }
        />
        <SummaryCard
          accent="blue"
          label="Updates This Month"
          value={stats?.updates_this_month ?? 0}
          icon={
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="10" cy="10" r="8" />
              <path d="m6.5 10 2.5 2.5 4.5-4.5" />
            </svg>
          }
        />
        <SummaryCard
          accent="default"
          label="Updates This Week"
          value={stats?.updates_this_week ?? 0}
          icon={
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="2 15 7 8 11 12 15 6 18 9" />
            </svg>
          }
        />
      </div>

      {/* ── Calendar + Side panel ──────────────────── */}
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">

        {/* Calendar */}
        <Card variant="glass" className="overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-(--border) px-5 py-4">
            <SectionTitle title={`${selectedMonthName} ${year} Calendar`} />
            {calendar && (
              <div className="flex gap-3 text-[11px] text-(--muted)">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  {calendar.days.filter((d) => d.status === 'submitted').length} submitted
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-rose-500/80" />
                  {calendar.days.filter((d) => d.status === 'missing').length} missing
                </span>
              </div>
            )}
          </div>
          <div className="px-5 py-4">
            {calendarQuery.isLoading ? (
              <div className="py-10 text-center text-sm text-(--muted)">Loading calendar…</div>
            ) : !calendar ? (
              <div className="py-10 text-center text-sm text-(--muted)">No calendar data for this period.</div>
            ) : (
              <>
                <div className="mb-2 grid grid-cols-7 gap-1">
                  {weekdayLabels.map((d) => (
                    <div key={d} className="text-center text-[10px] font-bold uppercase tracking-wider text-(--muted)">
                      {d}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {calendarCells.map((day, idx) => (
                    <div
                      key={day ? day.day : `empty-${idx}`}
                      className={cn(
                        'aspect-square rounded-lg border flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium',
                        day ? dayStyle[day.status] : 'border-transparent',
                      )}
                      title={day ? `Day ${day.day}: ${day.status}` : undefined}
                    >
                      {day && (
                        <>
                          <span>{day.day}</span>
                          {day.status === 'submitted' && (
                            <span className="text-[8px] text-emerald-400 leading-none">✓</span>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-(--muted)">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-sm bg-emerald-500/25 border border-emerald-500/35" />
                    Submitted
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-sm bg-rose-500/20 border border-rose-500/30" />
                    Missing
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-sm bg-amber-400/15 border border-amber-400/20" />
                    Sunday
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-sm bg-white/4 border border-white/10" />
                    Upcoming
                  </span>
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Right panel: Trends + Recent */}
        <div className="flex flex-col gap-6">

          {/* Trends */}
          {trends.length > 0 && (
            <Card variant="glass" className="overflow-hidden p-0">
              <div className="border-b border-(--border) px-5 py-4">
                <SectionTitle title="Performance Trends" />
              </div>
              <div className="space-y-3 px-5 py-4">
                {trends.slice(-6).map((t) => {
                  const pct   = t.completion_percentage ?? 0
                  const label = t.month_name ?? `${getMonthName(t.month)} ${t.year}`
                  return (
                    <div key={`${t.year}-${t.month}`} className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-(--muted-strong)">{label}</span>
                        <span className={cn('font-bold tabular-nums', pct >= 80 ? 'text-emerald-400' : pct >= 50 ? 'text-amber-400' : 'text-rose-400')}>
                          {pct.toFixed(1)}%
                        </span>
                      </div>
                      <CompletionBar pct={pct} />
                    </div>
                  )
                })}
              </div>
            </Card>
          )}

          {/* Recent updates */}
          <Card variant="glass" className="overflow-hidden p-0 flex-1">
            <div className="flex items-center justify-between border-b border-(--border) px-5 py-4">
              <SectionTitle title="Recent Updates" />
              <Badge variant="blue">{recent.length}</Badge>
            </div>
            <div className="divide-y divide-(--border)">
              {recent.length === 0 ? (
                <div className="py-10 text-center text-sm text-(--muted)">No recent updates.</div>
              ) : (
                recent.slice(0, 10).map((item, idx) => {
                  const dateStr = item.update_date ?? item.date ?? ''
                  const text    = item.update_text ?? item.message ?? item.text ?? ''
                  return (
                    <div key={String(item.id ?? idx)} className="px-5 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <p className="line-clamp-2 text-[13px] text-white/80">{text || '—'}</p>
                        {dateStr && (
                          <span className="shrink-0 text-[11px] tabular-nums text-(--muted)">
                            {new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </Card>

        </div>
      </div>
    </section>
  )
}
