type SectionTitleProps = {
  eyebrow: string
  title: string
  description: string
}

export function SectionTitle({ eyebrow, title, description }: SectionTitleProps) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">{eyebrow}</p>
      <h2 className="mt-2 text-lg md:text-xl font-semibold text-white leading-tight">{title}</h2>
      <p className="mt-2 max-w-2xl text-xs md:text-[13px] leading-5 text-[var(--muted)]">{description}</p>
    </div>
  )
}
