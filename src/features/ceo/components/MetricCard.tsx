import { Card } from '../../../shared/ui/card'

type MetricCardProps = {
  label: string
  value: string
  caption?: string
}

export function MetricCard({ label, value, caption }: MetricCardProps) {
  return (
    <Card className="p-6 bg-white/5 backdrop-blur-sm border-white/10">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-500">{label}</p>
      <p className="mt-3 text-3xl font-bold text-white tracking-tight">{value}</p>
      {caption ? <p className="mt-2 text-xs font-medium text-[var(--muted)] leading-relaxed">{caption}</p> : null}
    </Card>
  )
}
