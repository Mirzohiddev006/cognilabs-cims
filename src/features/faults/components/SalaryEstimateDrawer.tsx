import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../../shared/lib/cn'
import { Badge } from '../../../shared/ui/badge'
import { Button } from '../../../shared/ui/button'
import { DetailStatTile } from './SalaryEstimatePrimitives'
import {
  type EmployeeSalaryReport,
  formatAmount,
  formatCount,
  formatPercent,
  getMonthName,
} from '../lib/salaryEstimates'

export function SalaryEstimateDrawer({
  open,
  report,
  month,
  year,
  onClose,
  onOpenDetail,
  onAddPenalty,
  onAddBonus,
}: {
  open: boolean
  report: EmployeeSalaryReport | null
  month: number
  year: number
  onClose: () => void
  onOpenDetail: () => void
  onAddPenalty: () => void
  onAddBonus: () => void
}) {
  useEffect(() => {
    if (!open) {
      return
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose, open])

  if (!open || !report) {
    return null
  }

  const penaltyProgress = Math.min(100, Math.max(0, Number.isFinite(report.penaltyPercentage) ? report.penaltyPercentage : 0))
  const productivityProgress = Math.min(100, Math.max(0, Number.isFinite(report.productivityPercentage) ? report.productivityPercentage : 0))

  return createPortal(
    <div className="fixed inset-0 z-[90]">
      <button
        type="button"
        aria-label="Close salary detail drawer"
        className="absolute inset-0 bg-[radial-gradient(circle_at_right,rgba(59,130,246,0.10),transparent_24%),rgba(0,0,0,0.62)] backdrop-blur-md"
        onClick={onClose}
      />

      <div className="absolute inset-y-0 right-0 w-full md:w-[min(50vw,760px)] xl:w-[min(46vw,780px)]">
        <div className="sheet-enter flex h-full flex-col border-l border-white/10 bg-[linear-gradient(180deg,rgba(10,12,18,0.98),rgba(8,9,14,1))] shadow-[0_20px_80px_rgba(0,0,0,0.46)]">
          <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-6">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-blue-300/72">Salary estimate</p>
              <h2 className="mt-1 truncate text-lg font-semibold tracking-tight text-white">
                {report.fullName}
              </h2>
              <p className="mt-1 text-xs text-[var(--muted-strong)]">
                {getMonthName(month)} {year} snapshot
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-white/72 transition hover:border-white/16 hover:bg-white/[0.06] hover:text-white"
              aria-label="Close salary drawer"
            >
              <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M4 4l8 8M12 4 4 12" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
            <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm text-[var(--muted-strong)]">{report.label}</p>
                  <h3 className="mt-2 text-[1.8rem] font-semibold tracking-tight text-white">{report.fullName}</h3>
                  <p className="mt-1 text-sm text-[var(--muted)]">{report.roleLabel}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={report.hasPenalty ? 'danger' : 'outline'}>
                    {report.hasPenalty ? 'Has deduction' : 'Clean'}
                  </Badge>
                  <Badge variant={report.hasBonus ? 'success' : 'outline'}>
                    {report.hasBonus ? 'Has bonus' : 'No bonus'}
                  </Badge>
                  <Badge variant={report.qualifiesProductivityBonus ? 'success' : 'outline'}>
                    {report.qualifiesProductivityBonus ? 'Productivity qualified' : 'Productivity pending'}
                  </Badge>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <Button variant="ghost" size="sm" className="rounded-xl" onClick={onOpenDetail}>
                  Open full detail
                </Button>
                <Button variant="secondary" size="sm" className="rounded-xl" onClick={onAddPenalty}>
                  Add penalty
                </Button>
                <Button variant="success" size="sm" className="rounded-xl" onClick={onAddBonus}>
                  Add bonus
                </Button>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
              <DetailStatTile label="Final salary" value={formatAmount(report.finalSalary)} />
              <DetailStatTile label="Estimated salary" value={formatAmount(report.estimatedSalary)} />
              <DetailStatTile label="Base salary" value={formatAmount(report.baseSalary)} />
              <DetailStatTile label="After penalty" value={formatAmount(report.afterPenalty)} />
              <DetailStatTile label="Deduction" value={formatAmount(report.deductionAmount)} tone="danger" />
              <DetailStatTile label="Bonus amount" value={formatAmount(report.bonusAmount)} tone="success" />
              <DetailStatTile label="Bonus %" value={formatPercent(report.totalBonusPercent)} tone="success" />
              <DetailStatTile label="Penalty %" value={formatPercent(report.penaltyPercentage)} tone="danger" />
              <DetailStatTile label="Penalty points" value={formatCount(report.penaltyPoints)} tone="danger" />
              <DetailStatTile label="Penalty entries" value={formatCount(report.penaltyEntries)} tone="danger" />
              <DetailStatTile label="Bonus entries" value={formatCount(report.bonusEntries)} tone="success" />
              <DetailStatTile label="Mistakes" value={formatCount(report.mistakesCount)} tone="danger" />
              <DetailStatTile label="Delivery bonuses" value={formatCount(report.deliveryBonusCount)} tone="success" />
              <DetailStatTile label="Working days" value={formatCount(report.workingDays)} />
              <DetailStatTile label="Update days" value={formatCount(report.updateDays)} />
              <DetailStatTile
                label="Productivity"
                value={Number.isFinite(report.productivityPercentage)
                  ? `${formatCount(report.updateDays)}/${formatCount(report.workingDays)} / ${formatPercent(report.productivityPercentage)}`
                  : '-'}
                tone={report.qualifiesProductivityBonus ? 'success' : 'default'}
              />
            </div>

            <div className="mt-5 grid gap-4">
              <div className="rounded-[22px] border border-white/10 bg-white/[0.03] px-5 py-4">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-rose-300">Penalty pressure</span>
                  <span className={cn('font-semibold', penaltyProgress > 0 ? 'text-rose-400' : 'text-white')}>
                    {formatPercent(report.penaltyPercentage)}
                  </span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-white/7">
                  <div
                    className="h-full rounded-full bg-rose-500 transition-[width] duration-300"
                    style={{ width: `${penaltyProgress}%` }}
                  />
                </div>
                <p className="mt-3 text-xs leading-6 text-[var(--muted)]">
                  {report.penaltyEntries > 0
                    ? `${formatCount(report.penaltyEntries)} penalties and ${formatCount(report.penaltyPoints)} points reduced this month.`
                    : 'No penalty entries were recorded for this period.'}
                </p>
              </div>

              <div className="rounded-[22px] border border-white/10 bg-white/[0.03] px-5 py-4">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-emerald-300">Productivity performance</span>
                  <span className={cn('font-semibold', report.qualifiesProductivityBonus ? 'text-emerald-400' : 'text-white')}>
                    {Number.isFinite(report.productivityPercentage) ? formatPercent(report.productivityPercentage) : '-'}
                  </span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-white/7">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-[width] duration-300"
                    style={{ width: `${productivityProgress}%` }}
                  />
                </div>
                <p className="mt-3 text-xs leading-6 text-[var(--muted)]">
                  {report.qualifiesProductivityBonus
                    ? 'Productivity bonus qualified for this period.'
                    : 'Productivity bonus did not qualify for this period.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
