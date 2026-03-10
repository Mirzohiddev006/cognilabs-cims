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
    <Card className="auth-login-shell overflow-hidden border-[var(--border)] bg-[var(--card)] p-0 shadow-sm">
      <div className="border-b border-[var(--border)] px-6 py-6 sm:px-7">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--muted)]">{eyebrow}</p>
          <h2 className="text-2xl font-semibold text-white tracking-tight">{title}</h2>
          <p className="max-w-xl text-sm leading-6 text-[var(--muted)]">{description}</p>
        </div>
      </div>

      <div className="px-6 py-6 sm:px-7">{children}</div>

      {footerLinks.length > 0 ? (
        <div className="border-t border-[var(--border)] px-6 py-4 sm:px-7">
          <div className="flex flex-wrap gap-3">
          {footerLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-xs font-medium text-[var(--muted)] transition hover:text-white"
            >
              {link.label}
            </Link>
          ))}
          </div>
        </div>
      ) : null}
    </Card>
  )
}
