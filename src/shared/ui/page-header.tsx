import type { ReactNode } from 'react'
import { translateCurrentLiteral } from '../i18n/translations'
import { cn } from '../lib/cn'
import { Card } from './card'

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
  blue: 'meta-blue',
  success: 'meta-success',
  warning: 'meta-warning',
  danger: 'meta-danger',
  violet: 'meta-violet',
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
    <Card
      variant="glass"
      noPadding
      className={cn('page-header-card page-enter overflow-hidden rounded-[28px]', className)}
    >
      <div className="relative overflow-hidden px-5 py-6 sm:px-7 sm:py-7">
        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              {eyebrow ? (
                <p className="page-header-label ui-eyebrow text-[10px] font-semibold uppercase tracking-[0.22em]">
                  {translateCurrentLiteral(eyebrow)}
                </p>
              ) : null}
              <h1 className="page-header-title ui-display-heading text-2xl font-semibold tracking-tight sm:text-[2rem]">
                {translateCurrentLiteral(title)}
              </h1>
              {description ? (
                <p className="page-header-hint mt-3 max-w-2xl text-sm leading-6">
                  {translateCurrentLiteral(description)}
                </p>
              ) : null}
            </div>

            {actions ? (
              <div className="flex flex-wrap items-center gap-2 xl:max-w-105 xl:justify-end">
                {actions}
              </div>
            ) : null}
          </div>

          {meta.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {meta.map((item) => (
                <div
                  key={`${item.label}-${item.value}`}
                  className={cn(
                    'rounded-[22px] border px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-sm',
                    metaToneClassNames[item.tone ?? 'neutral'],
                  )}
                >
                  <p className="page-header-label ui-eyebrow text-[10px] font-semibold uppercase tracking-[0.22em]">
                    {translateCurrentLiteral(item.label)}
                  </p>
                  <p className="mt-2 text-base font-semibold tracking-tight text-current">
                    {item.value}
                  </p>
                  {item.hint ? (
                    <p className="page-header-hint mt-1.5 text-[11px] leading-5">
                      {translateCurrentLiteral(item.hint)}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  )
}
