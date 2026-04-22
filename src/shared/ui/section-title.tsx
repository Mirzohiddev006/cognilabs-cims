import { translateCurrentLiteral } from '../i18n/translations'
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
  const localizedEyebrow = eyebrow ? translateCurrentLiteral(eyebrow) : null
  const localizedTitle = translateCurrentLiteral(title)
  const localizedDescription = description ? translateCurrentLiteral(description) : null

  return (
    <div className={cn('space-y-1', className)}>
      {localizedEyebrow ? (
        <p className="text-[11px] font-medium uppercase tracking-[0.10em] text-[var(--caption)]">
          {localizedEyebrow}
        </p>
      ) : null}

      <h2
        className={cn(
          'text-[15px] font-semibold text-[var(--foreground)]',
          gradient && 'text-gradient',
        )}
      >
        {localizedTitle}
      </h2>

      {localizedDescription ? (
        <p className="max-w-2xl text-[13px] leading-5 text-[var(--muted)]">
          {localizedDescription}
        </p>
      ) : null}
    </div>
  )
}
