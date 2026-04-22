import type { ReactNode } from 'react'
import { translateCurrentLiteral } from '../i18n/translations'
import { cn } from '../lib/cn'

type PageHeaderTone = 'neutral' | 'blue' | 'success' | 'warning' | 'danger' | 'violet'

export type PageHeaderMetaItem = {
  label: string
  value: string
  hint?: string
  tone?: PageHeaderTone
}

type PageHeaderProps = {
  eyebrow?: string
  title: string
  description?: string
  meta?: PageHeaderMetaItem[]
  actions?: ReactNode
  className?: string
}

const metaToneClassNames: Record<PageHeaderTone, string> = {
  neutral: 'meta-neutral',
  blue:    'meta-blue',
  success: 'meta-success',
  warning: 'meta-warning',
  danger:  'meta-danger',
  violet:  'meta-violet',
}

export function PageHeader({
  title,
  eyebrow,
  description,
  meta = [],
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('page-enter', className)}>
      {/* Title row */}
      <div className="flex flex-col gap-4 pb-6 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="page-header-label mb-1 text-[11px] font-medium uppercase tracking-[0.10em] text-[var(--caption)]">
              {translateCurrentLiteral(eyebrow)}
            </p>
          ) : null}
          <h1 className="page-header-title text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-[28px]">
            {translateCurrentLiteral(title)}
          </h1>
          {description ? (
            <p className="page-header-hint mt-2 max-w-2xl text-[14px] leading-6 text-[var(--muted)]">
              {translateCurrentLiteral(description)}
            </p>
          ) : null}
        </div>

        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        ) : null}
      </div>

      {/* Meta pills */}
      {meta.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {meta.map((item) => (
            <div
              key={`${item.label}-${item.value}`}
              className={cn(
                'rounded-[var(--radius-lg)] border px-4 py-3',
                metaToneClassNames[item.tone ?? 'neutral'],
              )}
            >
              <p className="text-[11px] font-medium uppercase tracking-[0.10em] opacity-70">
                {translateCurrentLiteral(item.label)}
              </p>
              <p className="mt-1.5 text-[15px] font-semibold">
                {item.value}
              </p>
              {item.hint ? (
                <p className="page-header-hint mt-1 text-[11px] leading-4 opacity-70">
                  {translateCurrentLiteral(item.hint)}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
