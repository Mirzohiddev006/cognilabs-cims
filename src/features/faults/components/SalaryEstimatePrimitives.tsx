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
    default: 'border-[var(--border)] bg-white dark:bg-[var(--card)]',
    danger: 'border-rose-500/28 bg-white dark:bg-rose-500/6',
    success: 'border-emerald-500/28 bg-white dark:bg-emerald-500/6',
  } as const

  const valueClassName = {
    default: 'text-[var(--foreground)]',
    danger: 'text-rose-600 dark:text-rose-400',
    success: 'text-emerald-600 dark:text-emerald-400',
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
  theme,
}: {
  label: string
  value: string | number
  tone?: 'default' | 'danger' | 'success' | 'blue'
  theme?: 'light' | 'dark'
}) {
  const toneClassName = theme === 'light'
    ? {
        default: 'border-[var(--border)] bg-white',
        danger: 'border-rose-500/28 bg-rose-50',
        success: 'border-emerald-500/28 bg-emerald-50',
        blue: 'border-[var(--blue-border)] bg-blue-50',
      } as const
    : theme === 'dark'
      ? {
          default: 'border-[var(--border)] bg-[var(--surface-elevated)]',
          danger: 'border-[var(--danger-border)] bg-[var(--danger-dim)]',
          success: 'border-[var(--success-border)] bg-[var(--success-dim)]',
          blue: 'border-[var(--blue-border)] bg-[var(--blue-dim)]',
        } as const
      : {
          default: 'border-[var(--border)] bg-white dark:bg-[var(--surface-elevated)]',
          danger: 'border-rose-500/28 bg-white dark:bg-rose-500/8',
          success: 'border-emerald-500/28 bg-white dark:bg-emerald-500/8',
          blue: 'border-[var(--blue-border)] bg-white dark:bg-[var(--blue-dim)]',
        } as const

  const valueClassName = theme === 'light'
    ? {
        default: 'text-[var(--foreground)]',
        danger: 'text-rose-600',
        success: 'text-emerald-600',
        blue: 'text-[var(--blue-text)]',
      } as const
    : theme === 'dark'
      ? {
          default: 'text-[var(--foreground)]',
          danger: 'text-[var(--danger-text)]',
          success: 'text-[var(--success-text)]',
          blue: 'text-[var(--blue-text)]',
        } as const
      : {
          default: 'text-[var(--foreground)]',
          danger: 'text-rose-600 dark:text-rose-400',
          success: 'text-emerald-600 dark:text-emerald-400',
          blue: 'text-[var(--blue-text)]',
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
