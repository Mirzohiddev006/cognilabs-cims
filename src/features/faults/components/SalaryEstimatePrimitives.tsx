import { cn } from '../../../shared/lib/cn'
import { Badge } from '../../../shared/ui/badge'

export function SummaryMetricCard({
  label,
  value,
  tone = 'default',
  badge,
}: {
  label: string
  value: string | number
  tone?: 'default' | 'danger' | 'success'
  badge?: string
}) {
  const toneClassName = {
    default: 'border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))]',
    danger: 'border-rose-500/35 bg-[linear-gradient(180deg,rgba(60,12,16,0.7),rgba(25,9,11,0.96))]',
    success: 'border-emerald-500/35 bg-[linear-gradient(180deg,rgba(8,50,35,0.7),rgba(6,23,17,0.96))]',
  } as const

  const valueClassName = {
    default: 'text-white',
    danger: 'text-rose-400',
    success: 'text-emerald-400',
  } as const

  return (
    <div className={cn('card-base min-h-[110px] rounded-[22px] px-6 py-5', toneClassName[tone])}>
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-[var(--muted-strong)]">{label}</p>
        {badge ? (
          <Badge variant={tone === 'danger' ? 'danger' : tone === 'success' ? 'success' : 'outline'}>
            {badge}
          </Badge>
        ) : null}
      </div>
      <p className={cn('mt-5 text-2xl font-semibold tracking-tight sm:text-[2rem]', valueClassName[tone])}>
        {value}
      </p>
    </div>
  )
}

export function DetailStatTile({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: string | number
  tone?: 'default' | 'danger' | 'success'
}) {
  const toneClassName = {
    default: 'border-white/10 bg-white/[0.025]',
    danger: 'border-rose-500/35 bg-rose-500/8',
    success: 'border-emerald-500/35 bg-emerald-500/8',
  } as const

  const valueClassName = {
    default: 'text-white',
    danger: 'text-rose-400',
    success: 'text-emerald-400',
  } as const

  return (
    <div className={cn('rounded-[16px] border px-4 py-3', toneClassName[tone])}>
      <p className="text-xs text-[var(--muted-strong)]">{label}</p>
      <p className={cn('mt-2 text-[1.05rem] font-semibold tracking-tight', valueClassName[tone])}>
        {value}
      </p>
    </div>
  )
}

export function RefreshIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 3v4h-4" />
      <path d="M2 13v-4h4" />
      <path d="M3.7 6.1A5 5 0 0 1 12 4.5L14 7" />
      <path d="M12.3 9.9A5 5 0 0 1 4 11.5L2 9" />
    </svg>
  )
}
