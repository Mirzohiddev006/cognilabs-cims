import { useState } from 'react'
import { Badge } from '../../../shared/ui/badge'
import { Card } from '../../../shared/ui/card'
import { getIntlLocale, translateCurrentLiteral } from '../../../shared/i18n/translations'
import { cn } from '../../../shared/lib/cn'
import { DetailStatTile } from './SalaryEstimatePrimitives'
import {
  type EmployeeCompensationPolicy,
  formatAmount,
  formatPercent,
} from '../lib/salaryEstimates'

type CompensationPolicyPanelProps = {
  policy: EmployeeCompensationPolicy | null
  className?: string
}

export function CompensationPolicyPanel({
  policy,
  className,
}: CompensationPolicyPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)
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

  if (!policy) {
    return (
      <Card className={className ? `rounded-[24px] border-[var(--border)] bg-white p-6 dark:border-white/10 dark:bg-[var(--card)] ${className}` : 'rounded-[24px] border-[var(--border)] bg-white p-6 dark:border-white/10 dark:bg-[var(--card)]'}>
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
            {lt('Compensation policy')}
          </p>
          <h2 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">
            {lt('Policy configuration unavailable')}
          </h2>
          <p className="text-sm text-[var(--muted-strong)]">
            {lt('The compensation policy endpoint did not return a configuration for this employee.')}
          </p>
        </div>
      </Card>
    )
  }

  return (
    <Card className={className ? `overflow-hidden rounded-[24px] border-[var(--border)] bg-white dark:border-white/10 dark:bg-[var(--card)] ${className}` : 'overflow-hidden rounded-[24px] border-[var(--border)] bg-white dark:border-white/10 dark:bg-[var(--card)]'}>
      <button
        type="button"
        onClick={() => setIsExpanded((current) => !current)}
        aria-expanded={isExpanded}
        aria-label={lt('Compensation policy')}
        className="flex w-full items-start justify-between gap-4 px-6 py-6 text-left transition hover:bg-[var(--card-hover)]"
      >
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
            {lt('Compensation policy')}
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-[var(--foreground)]">
            {lt('Configured salary rules')}
          </h2>
          <p className="mt-2 text-sm text-[var(--muted-strong)]">
            {lt('Read-only policy values returned by the compensation policy API.')}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {policy.employeeName ? <Badge variant="outline">{policy.employeeName}</Badge> : null}
            <Badge variant="secondary">{policy.deductionRates.length} {lt('deduction rates')}</Badge>
            <Badge variant="secondary">{policy.bonusRates.length} {lt('bonus rules')}</Badge>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--foreground)]">
            <svg
              viewBox="0 0 16 16"
              className={cn('h-4 w-4 transition-transform duration-200', isExpanded ? 'rotate-180' : '')}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <path d="M4 6.5 8 10.5 12 6.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
      </button>

      {isExpanded ? (
        <div className="border-t border-[var(--border)] px-6 pb-6 pt-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <DetailStatTile label={lt('Salary base')} value={formatAmount(policy.salaryBase)} />
            <DetailStatTile label={lt('Deduction cap %')} value={formatPercent(policy.monthlyDeductionCapPercent)} tone="danger" />
            <DetailStatTile label={lt('Cap amount')} value={formatAmount(policy.monthlyDeductionCapAmount)} tone="danger" />
            <DetailStatTile label={lt('Developer split')} value={formatPercent(policy.responsibilitySplit.developerPercent)} tone="blue" />
            <DetailStatTile label={lt('Reviewer split')} value={formatPercent(policy.responsibilitySplit.reviewerPercent)} tone="blue" />
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            <div className="rounded-[20px] border border-[var(--danger-border)] bg-rose-50/35 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.76)] dark:border-rose-500/18 dark:bg-rose-950/15 dark:shadow-none">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--danger-text)] dark:text-rose-200/80">{lt('Deduction rates')}</p>
                  <p className="mt-1 text-sm text-[var(--muted-strong)]">{lt('Severity-based deduction rules.')}</p>
                </div>
                <Badge variant="outline">{policy.deductionRates.length}</Badge>
              </div>

              <div className="mt-4 space-y-3">
                {policy.deductionRates.map((rate) => (
                  <div key={rate.severity} className="rounded-[16px] border border-[var(--danger-border)] bg-rose-50/88 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] dark:border-rose-500/18 dark:bg-black/18 dark:shadow-none">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-[var(--foreground)]">{lt(rate.severity)}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="danger">{formatPercent(rate.percent)}</Badge>
                        <Badge variant="outline">{formatAmount(rate.amount)}</Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[20px] border border-[var(--success-border)] bg-emerald-50/35 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.76)] dark:border-emerald-500/18 dark:bg-emerald-950/15 dark:shadow-none">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#32a852] dark:text-emerald-200/80">{lt('Bonus rates')}</p>
                  <p className="mt-1 text-sm text-[var(--muted-strong)]">
                    {tr(
                      'Configured percentage rules for bonus triggers.',
                      'Bonus ishga tushishi uchun foiz qoidalari sozlangan.',
                      'Nastroeny protsentnye pravila dlya zapuska bonusov.',
                    )}
                  </p>
                </div>
                <Badge variant="outline">{policy.bonusRates.length}</Badge>
              </div>

              <div className="mt-4 space-y-3">
                {policy.bonusRates.map((rate) => (
                  <div key={rate.key} className="rounded-[16px] border border-[var(--success-border)] bg-emerald-50/88 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] dark:border-emerald-500/18 dark:bg-black/18 dark:shadow-none">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-[var(--foreground)]">{lt(rate.label)}</p>
                      <Badge variant="success">{formatPercent(rate.percent)}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-[1.1fr_1fr]">
            <div className="rounded-[20px] border border-[var(--border)] bg-white p-4 dark:bg-[var(--surface-elevated)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">{lt('Mistake taxonomy')}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {policy.mistakeCategories.map((category) => (
                  <Badge key={category.key} variant="outline">{lt(category.label)}</Badge>
                ))}
              </div>

              <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">{lt('Severities')}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {policy.severities.map((severity) => (
                  <Badge key={severity} variant="outline">{lt(severity)}</Badge>
                ))}
              </div>
            </div>

            <div className="rounded-[20px] border border-[var(--border)] bg-white p-4 dark:bg-[var(--surface-elevated)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">{lt('Decision tree')}</p>
              <div className="mt-4 space-y-3">
                {policy.decisionTree.map((step) => (
                  <div key={`${step.step}-${step.question}`} className="rounded-[16px] border border-[var(--border)] bg-white px-4 py-3 dark:bg-[var(--card)]">
                    <p className="text-xs font-semibold tracking-[0.18em] text-[var(--blue-text)]">
                      {lt('Step')} {step.step}
                    </p>
                    <p className="mt-2 text-sm font-medium text-[var(--foreground)]">{lt(step.question)}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {step.ifYes ? <Badge variant="success">{lt('If yes')}: {lt(step.ifYes)}</Badge> : null}
                      {step.ifNo ? <Badge variant="outline">{lt('If no')}: {lt(step.ifNo)}</Badge> : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </Card>
  )
}
