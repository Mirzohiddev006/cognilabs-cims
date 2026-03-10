type SectionTitleProps = {
  eyebrow: string
  title: string
  description: string
}

export function SectionTitle({ eyebrow, title, description }: SectionTitleProps) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">{eyebrow}</p>
      <h2 className="mt-3 text-2xl md:text-[1.75rem] font-semibold text-white leading-tight">{title}</h2>
      <p className="mt-3 max-w-2xl text-sm md:text-[15px] leading-6 text-[var(--muted)]">{description}</p>
    </div>
  )
}
