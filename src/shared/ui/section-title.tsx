import { cn } from '../lib/cn'

type SectionTitleProps = {
  eyebrow?: string
  title: string
  description?: string
  gradient?: boolean
  className?: string
}

export function SectionTitle({
  eyebrow,
  title,
  description,
  gradient = false,
  className,
}: SectionTitleProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {eyebrow ? (
        <div className="flex items-center gap-2">
          <span className="inline-block h-1 w-1 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.7)]" />
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--caption)]">
            {eyebrow}
          </p>
        </div>
      ) : null}

      <h2
        className={cn(
          'text-lg font-semibold leading-snug tracking-tight',
          gradient ? 'text-gradient' : 'text-white',
        )}
      >
        {title}
      </h2>

      {description ? (
        <p className="max-w-2xl text-[12px] leading-5 text-[var(--muted)]">
          {description}
        </p>
      ) : null}
    </div>
  )
}
