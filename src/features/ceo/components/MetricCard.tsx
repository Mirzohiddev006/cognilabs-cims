import { Card } from '../../../shared/ui/card'

type MetricCardProps = {
  label: string
  value: string
  caption?: string
}

export function MetricCard({ label, value, caption }: MetricCardProps) {
  return (
    <Card className="p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-[var(--foreground)]">{value}</p>
      {caption ? <p className="mt-2 text-sm text-[var(--muted-strong)]">{caption}</p> : null}
    </Card>
  )
}
