import { cn } from '../../../shared/lib/cn'

type AuthFeedbackProps = {
  tone?: 'error' | 'success' | 'info'
  message?: string | null
}

const toneClasses = {
  error: 'border-red-200 bg-red-50 text-red-700',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  info: 'border-amber-200 bg-amber-50 text-amber-800',
}

export function AuthFeedback({ tone = 'info', message }: AuthFeedbackProps) {
  if (!message) {
    return null
  }

  return (
    <div className={cn('rounded-2xl border px-4 py-3 text-sm', toneClasses[tone])}>
      {message}
    </div>
  )
}
