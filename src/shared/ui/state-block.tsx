import type { ReactNode } from 'react'
import { Button } from './button'
import { Card } from './card'

type StateBlockProps = {
  eyebrow: string
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  tone?: 'loading' | 'empty' | 'error'
  children?: ReactNode
}

const toneStyles = {
  loading: 'bg-white/5 border-white/10',
  empty: 'bg-white/5 border-white/10',
  error: 'bg-rose-500/5 border-rose-500/20',
}

export function StateBlock({
  eyebrow,
  title,
  description,
  actionLabel,
  onAction,
  tone = 'empty',
  children,
}: StateBlockProps) {
  return (
    <Card className={`p-10 text-center flex flex-col items-center backdrop-blur-sm ${toneStyles[tone]}`}>
      <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-blue-500">{eyebrow}</p>
      <h3 className="mt-4 text-3xl font-bold text-white tracking-tight">{title}</h3>
      <p className="mt-4 max-w-md text-sm font-medium leading-relaxed text-zinc-500">{description}</p>
      {children ? <div className="mt-5">{children}</div> : null}
      {actionLabel && onAction ? (
        <div className="mt-6">
          <Button variant="secondary" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      ) : null}
    </Card>
  )
}

export function LoadingStateBlock(props: Omit<StateBlockProps, 'tone'>) {
  return <StateBlock {...props} tone="loading" />
}

export function EmptyStateBlock(props: Omit<StateBlockProps, 'tone'>) {
  return <StateBlock {...props} tone="empty" />
}

export function ErrorStateBlock(props: Omit<StateBlockProps, 'tone'>) {
  return <StateBlock {...props} tone="error" />
}
