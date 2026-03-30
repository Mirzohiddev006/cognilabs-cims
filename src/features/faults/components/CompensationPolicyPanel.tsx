import { Badge } from '../../../shared/ui/badge'
import { Card } from '../../../shared/ui/card'
import { translateCurrentLiteral } from '../../../shared/i18n/translations'
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
  const lt = translateCurrentLiteral

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
    <Card className={className ? `rounded-[24px] border-[var(--border)] bg-white p-6 dark:border-white/10 dark:bg-[var(--card)] ${className}` : 'rounded-[24px] border-[var(--border)] bg-white p-6 dark:border-white/10 dark:bg-[var(--card)]'}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
            {lt('Compensation policy')}
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-[var(--foreground)]">
            {lt('Configured salary rules')}
          </h2>
          <p className="mt-2 text-sm text-[var(--muted-strong)]">
            {lt('Read-only policy values returned by the compensation policy API.')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {policy.employeeName ? <Badge variant="outline">{policy.employeeName}</Badge> : null}
          <Badge variant="secondary">{policy.deductionRates.length} {lt('deduction rates')}</Badge>
          <Badge variant="secondary">{policy.bonusRates.length} {lt('bonus rules')}</Badge>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <DetailStatTile label={lt('Salary base')} value={formatAmount(policy.salaryBase)} />
        <DetailStatTile label={lt('Deduction cap %')} value={formatPercent(policy.monthlyDeductionCapPercent)} tone="danger" />
        <DetailStatTile label={lt('Cap amount')} value={formatAmount(policy.monthlyDeductionCapAmount)} tone="danger" />
        <DetailStatTile label={lt('Developer split')} value={formatPercent(policy.responsibilitySplit.developerPercent)} tone="blue" />
        <DetailStatTile label={lt('Reviewer split')} value={formatPercent(policy.responsibilitySplit.reviewerPercent)} tone="blue" />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <div className="rounded-[20px] border border-rose-500/18 bg-white p-4 dark:bg-rose-950/15">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-rose-500 dark:text-rose-200/70">{lt('Deduction rates')}</p>
              <p className="mt-1 text-sm text-[var(--muted-strong)]">{lt('Severity-based deduction rules.')}</p>
            </div>
            <Badge variant="outline">{policy.deductionRates.length}</Badge>
          </div>

          <div className="mt-4 space-y-3">
            {policy.deductionRates.map((rate) => (
              <div key={rate.severity} className="rounded-[16px] border border-rose-500/18 bg-rose-50/70 px-4 py-3 dark:bg-black/18">
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

        <div className="rounded-[20px] border border-emerald-500/18 bg-white p-4 dark:bg-emerald-950/15">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-600 dark:text-emerald-200/70">{lt('Bonus rates')}</p>
              <p className="mt-1 text-sm text-[var(--muted-strong)]">{lt('Configured percentage rules for bonus triggers.')}</p>
            </div>
            <Badge variant="outline">{policy.bonusRates.length}</Badge>
          </div>

          <div className="mt-4 space-y-3">
            {policy.bonusRates.map((rate) => (
              <div key={rate.key} className="rounded-[16px] border border-emerald-500/18 bg-emerald-50/70 px-4 py-3 dark:bg-black/18">
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
    </Card>
  )
}
