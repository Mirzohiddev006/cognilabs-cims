import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTheme } from '../../../app/hooks/useTheme'
import { getIntlLocale, translateCurrentLiteral } from '../../../shared/i18n/translations'
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
  onAddDeliveryBonus,
}: {
  open: boolean
  report: EmployeeSalaryReport | null
  month: number
  year: number
  onClose: () => void
  onOpenDetail: () => void
  onAddDeliveryBonus: () => void
}) {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const lt = translateCurrentLiteral
  const locale = getIntlLocale()
  const tr = (key: string, uzFallback: string, ruFallback: string) => {
    const value = lt(key)

    if (value !== key) {
      return value
    }

    if (locale.startsWith('ru')) {
      return ruFallback
    }

    if (locale.startsWith('en')) {
      return key
    }

    return uzFallback
  }

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
    <div
      className={cn('fixed inset-0 z-[90] salary-estimate-drawer', isLight ? 'text-[var(--foreground)]' : 'text-[var(--foreground)]')}
      data-theme={theme}
      style={{ colorScheme: isLight ? 'light' : 'dark' }}
    >
      <button
        type="button"
        aria-label={lt('Close salary detail drawer')}
        className={cn(
          'absolute inset-0 backdrop-blur-md',
          isLight
            ? 'bg-[radial-gradient(circle_at_right,rgba(59,130,246,0.08),transparent_24%),rgba(248,250,252,0.78)]'
            : 'bg-[radial-gradient(circle_at_right,rgba(59,130,246,0.10),transparent_24%),rgba(0,0,0,0.62)]',
        )}
        onClick={onClose}
      />

      <div className="absolute inset-y-0 right-0 w-full md:w-[min(50vw,760px)] xl:w-[min(46vw,780px)]">
        <div
          className={cn(
            'sheet-enter flex h-full flex-col border-l border-[var(--border)]',
            isLight
              ? 'bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(248,250,252,1))] shadow-[0_20px_80px_rgba(15,23,42,0.16)]'
              : 'bg-[linear-gradient(180deg,rgba(10,12,18,0.98),rgba(8,9,14,1))] shadow-[0_20px_80px_rgba(0,0,0,0.46)]',
          )}
        >
          <div
            className={cn(
              'flex items-center justify-between gap-4 border-b border-[var(--border)] px-5 py-4 sm:px-6',
              isLight ? 'bg-white/95' : 'bg-transparent',
            )}
          >
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--blue-text)]">{lt('Salary estimate')}</p>
              <h2 className="mt-1 truncate text-lg font-semibold tracking-tight text-[var(--foreground)]">
                {report.fullName}
              </h2>
              <p className="mt-1 text-xs text-[var(--muted-strong)]">
                {getMonthName(month)} {year} {lt('snapshot')}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className={cn(
                'inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] transition',
                isLight
                  ? 'bg-[var(--surface-elevated)] text-[var(--foreground)] hover:border-[var(--border-hover)] hover:bg-[var(--card-hover)]'
                  : 'bg-white/[0.03] text-white/72 hover:border-white/16 hover:bg-white/[0.06] hover:text-white',
              )}
              aria-label={lt('Close salary drawer')}
            >
              <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M4 4l8 8M12 4 4 12" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className={cn('min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6', isLight ? 'bg-white' : 'bg-transparent')}>
            <div
              className={cn(
                'rounded-[24px] border border-[var(--border)] p-5',
                isLight
                  ? 'bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(248,250,252,0.98))] shadow-[0_8px_24px_rgba(148,163,184,0.10)]'
                  : 'bg-white/[0.03]',
              )}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm text-[var(--muted-strong)]">{report.label}</p>
                  <h3 className="mt-2 text-[1.8rem] font-semibold tracking-tight text-[var(--foreground)]">{report.fullName}</h3>
                  <p className="mt-1 text-sm text-[var(--muted)]">{report.roleLabel}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={report.hasPenalty ? 'danger' : 'outline'}>
                    {report.hasPenalty ? lt('Has deduction') : lt('Clean')}
                  </Badge>
                  <Badge variant={report.hasBonus ? 'success' : 'outline'}>
                    {report.hasBonus ? lt('Has bonus') : lt('No bonus')}
                  </Badge>
                  <Badge variant={report.qualifiesProductivityBonus ? 'success' : 'outline'}>
                    {report.qualifiesProductivityBonus ? lt('Productivity qualified') : lt('Productivity pending')}
                  </Badge>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <Button variant="ghost" size="sm" className="rounded-xl" onClick={onOpenDetail}>
                  {lt('Open full detail')}
                </Button>
                <Button variant="success" size="sm" className="rounded-xl" onClick={onAddDeliveryBonus}>
                  {lt('Add delivery bonus')}
                </Button>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
              <DetailStatTile label={lt('Final salary')} value={formatAmount(report.finalSalary)} theme={theme} />
              <DetailStatTile label={lt('Estimated salary')} value={formatAmount(report.estimatedSalary)} theme={theme} />
              <DetailStatTile label={lt('Base salary')} value={formatAmount(report.baseSalary)} theme={theme} />
              <DetailStatTile label={tr('After deduction', 'Ayirmadan keyin', 'После удержания')} value={formatAmount(report.afterPenalty)} theme={theme} />
              <DetailStatTile label={lt('Deduction')} value={formatAmount(report.deductionAmount)} tone="danger" theme={theme} />
              <DetailStatTile label={lt('Bonus amount')} value={formatAmount(report.bonusAmount)} tone="success" theme={theme} />
              <DetailStatTile label={lt('Bonus %')} value={formatPercent(report.totalBonusPercent)} tone="success" theme={theme} />
              <DetailStatTile label={tr('Deduction %', 'Ayirma %', 'Удержание %')} value={formatPercent(report.penaltyPercentage)} tone="danger" theme={theme} />
              <DetailStatTile label={lt('Mistakes')} value={formatCount(report.mistakesCount)} tone="danger" theme={theme} />
              <DetailStatTile label={lt('Delivery bonuses')} value={formatCount(report.deliveryBonusCount)} tone="success" theme={theme} />
              <DetailStatTile label={lt('Working days')} value={formatCount(report.workingDays)} theme={theme} />
              <DetailStatTile label={lt('Update days')} value={formatCount(report.updateDays)} theme={theme} />
              <DetailStatTile
                label={lt('Productivity')}
                value={Number.isFinite(report.productivityPercentage)
                  ? `${formatCount(report.updateDays)}/${formatCount(report.workingDays)} / ${formatPercent(report.productivityPercentage)}`
                  : '-'}
                tone={report.qualifiesProductivityBonus ? 'success' : 'default'}
                theme={theme}
              />
            </div>

            <div className="mt-5 grid gap-4">
              <div
                className={cn(
                  'rounded-[22px] border px-5 py-4',
                  isLight
                    ? 'border-rose-500/18 bg-rose-50'
                    : 'border-[var(--danger-border)] bg-[var(--danger-dim)]',
                )}
              >
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className={cn(isLight ? 'text-rose-600' : 'text-[var(--danger-text)]')}>{tr('deduction impact', 'ayirma ta\'siri', 'влияние удержания')}</span>
                  <span className={cn('font-semibold', penaltyProgress > 0 ? (isLight ? 'text-rose-600' : 'text-[var(--danger-text)]') : 'text-[var(--foreground)]')}>
                    {formatPercent(report.penaltyPercentage)}
                  </span>
                </div>
                <div className={cn('mt-3 h-2 rounded-full', isLight ? 'bg-rose-100' : 'bg-white/7')}>
                  <div
                    className="h-full rounded-full bg-rose-500 transition-[width] duration-300"
                    style={{ width: `${penaltyProgress}%` }}
                  />
                </div>
                <p className="mt-3 text-xs leading-6 text-[var(--muted)]">
                  {report.deductionAmount > 0
                    ? `${formatAmount(report.deductionAmount)} ${tr('deducted in this period.', 'shu davrda ayirilgan.', 'удержано за этот период.')}`
                    : tr('No deductions were recorded for this period.', 'Bu davr uchun ayirma qayd etilmadi.', 'За этот период удержания не зафиксированы.')}
                </p>
              </div>

              <div
                className={cn(
                  'rounded-[22px] border px-5 py-4',
                  isLight
                    ? 'border-emerald-500/18 bg-emerald-50'
                    : 'border-[var(--success-border)] bg-[var(--success-dim)]',
                )}
              >
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className={cn(isLight ? 'text-emerald-600' : 'text-[var(--success-text)]')}>{lt('Productivity performance')}</span>
                  <span className={cn('font-semibold', report.qualifiesProductivityBonus ? (isLight ? 'text-emerald-600' : 'text-[var(--success-text)]') : 'text-[var(--foreground)]')}>
                    {Number.isFinite(report.productivityPercentage) ? formatPercent(report.productivityPercentage) : '-'}
                  </span>
                </div>
                <div className={cn('mt-3 h-2 rounded-full', isLight ? 'bg-emerald-100' : 'bg-white/7')}>
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-[width] duration-300"
                    style={{ width: `${productivityProgress}%` }}
                  />
                </div>
                <p className="mt-3 text-xs leading-6 text-[var(--muted)]">
                  {report.qualifiesProductivityBonus
                    ? lt('Productivity bonus qualified for this period.')
                    : lt('Productivity bonus did not qualify for this period.')}
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
