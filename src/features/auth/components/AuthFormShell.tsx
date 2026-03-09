import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '../../../shared/ui/card'

type FooterLink = {
  label: string
  to: string
}

type AuthFormShellProps = {
  eyebrow: string
  title: string
  description: string
  footerLinks?: FooterLink[]
  children: ReactNode
}

export function AuthFormShell({
  eyebrow,
  title,
  description,
  footerLinks = [],
  children,
}: AuthFormShellProps) {
  return (
    <Card className="border-none bg-transparent p-0 shadow-none">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--accent)]">{eyebrow}</p>
        <h2 className="mt-4 text-4xl font-semibold text-[var(--foreground)]">{title}</h2>
        <p className="mt-4 max-w-xl text-sm leading-6 text-[var(--muted-strong)]">{description}</p>
      </div>

      <div className="mt-8">{children}</div>

      {footerLinks.length > 0 ? (
        <div className="mt-6 flex flex-wrap gap-3 text-sm text-[var(--muted-strong)]">
          {footerLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="rounded-full border border-[var(--border)] bg-white/70 px-4 py-2 transition-colors hover:bg-white"
            >
              {link.label}
            </Link>
          ))}
        </div>
      ) : null}
    </Card>
  )
}
