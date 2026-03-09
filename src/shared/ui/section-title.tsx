type SectionTitleProps = {
  eyebrow: string
  title: string
  description: string
}

export function SectionTitle({ eyebrow, title, description }: SectionTitleProps) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-strong)]">{description}</p>
    </div>
  )
}
