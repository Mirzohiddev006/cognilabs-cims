import type { ReactNode } from 'react'
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
  blue:    'border-blue-500/20 bg-blue-600/10 text-blue-50',
  success: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-50',
  warning: 'border-amber-500/20 bg-amber-500/10 text-amber-50',
  danger:  'border-rose-500/20 bg-rose-500/10 text-rose-50',
  violet:  'border-violet-500/20 bg-violet-500/10 text-violet-50',
}

export function PageHeader({
  title,
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
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.22),transparent_72%)]" />
        <div className="pointer-events-none absolute -left-12 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 top-6 h-28 w-28 rounded-full bg-cyan-400/8 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <h1 className="page-header-title text-2xl font-semibold tracking-tight sm:text-[2rem]">
                {title}
              </h1>
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
                  <p className="page-header-label text-[10px] font-semibold uppercase tracking-[0.22em]">
                    {item.label}
                  </p>
                  <p className="mt-2 text-base font-semibold tracking-tight text-current">
                    {item.value}
                  </p>
                  {item.hint ? (
                    <p className="page-header-hint mt-1.5 text-[11px] leading-5">
                      {item.hint}
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
