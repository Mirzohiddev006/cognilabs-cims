type SectionTitleProps = {
  eyebrow: string
  title: string
  description: string
}

export function SectionTitle({ eyebrow, title, description }: SectionTitleProps) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-500">{eyebrow}</p>
      <h2 className="mt-3 text-3xl md:text-4xl font-bold text-white leading-tight">{title}</h2>
      <p className="mt-4 max-w-2xl text-base md:text-lg leading-relaxed text-[var(--muted)]">{description}</p>
    </div>
  )
}
