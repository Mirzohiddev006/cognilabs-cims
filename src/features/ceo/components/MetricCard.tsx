import { Card } from '../../../shared/ui/card'

type MetricCardProps = {
  label: string
  value: string
  caption?: string
}

export function MetricCard({ label, value, caption }: MetricCardProps) {
  return (
    <Card className="p-6 border-white/5 bg-[#0a0a0a] hover:bg-[#0f0f0f] transition-colors">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium text-zinc-500">{label}</p>
        <div className="flex items-center gap-1 rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-zinc-400">
          <span className="h-1 w-1 rounded-full bg-blue-500"></span>
          +0
        </div>
      </div>
      <p className="mt-3 text-4xl font-bold text-white">{value}</p>
      <div className="mt-4 flex items-center justify-between text-[11px] font-medium text-zinc-500">
        <span>{caption || 'Historical data'}</span>
        <span className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          Detail
        </span>
      </div>
    </Card>
  )
}
