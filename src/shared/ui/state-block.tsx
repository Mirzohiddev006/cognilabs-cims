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
  loading: 'bg-[var(--card)]',
  empty: 'bg-[var(--card)]',
  error: 'bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(254,242,242,1))]',
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
    <Card className={`p-6 ${toneStyles[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">{eyebrow}</p>
      <h3 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--muted-strong)]">{description}</p>
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
