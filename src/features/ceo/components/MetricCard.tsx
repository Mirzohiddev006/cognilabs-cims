import { Card } from '../../../shared/ui/card'

type MetricCardProps = {
  label: string
  value: string
  caption?: string
}

export function MetricCard({ label, value, caption }: MetricCardProps) {
  return (
    <Card className="flex min-h-[140px] flex-col justify-between p-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#3b82f6]">{label}</p>
        <p className="mt-5 text-[2.125rem] leading-none font-semibold text-white tracking-tight">{value}</p>
      </div>
      {caption ? <p className="text-sm leading-6 text-[var(--muted)]">{caption}</p> : <div />}
    </Card>
  )
}
