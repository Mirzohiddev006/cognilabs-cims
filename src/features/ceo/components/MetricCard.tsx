import { Card } from '../../../shared/ui/card'

type MetricCardProps = {
  label: string
  value: string
  caption?: string
}

export function MetricCard({ label, value, caption }: MetricCardProps) {
  return (
    <Card className="flex min-h-[120px] flex-col justify-between p-4">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#3b82f6]">{label}</p>
        <p className="mt-3 text-2xl leading-none font-semibold text-white tracking-tight">{value}</p>
      </div>
      {caption ? <p className="text-xs leading-5 text-[var(--muted)]">{caption}</p> : <div />}
    </Card>
  )
}
