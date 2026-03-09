import { cn } from '../../../shared/lib/cn'

type AuthFeedbackProps = {
  tone?: 'error' | 'success' | 'info'
  message?: string | null
}

const toneClasses = {
  error: 'border-rose-500/20 bg-rose-500/5 text-rose-500',
  success: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-500',
  info: 'border-blue-500/20 bg-blue-500/5 text-blue-500',
}

export function AuthFeedback({ tone = 'info', message }: AuthFeedbackProps) {
  if (!message) {
    return null
  }

  return (
    <div className={cn('rounded-2xl border px-5 py-4 text-sm font-bold tracking-tight', toneClasses[tone])}>
      {message}
    </div>
  )
}
