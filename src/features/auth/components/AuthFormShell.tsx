import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

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
    <div>
      <div className="mb-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.10em] text-[var(--caption)]">{eyebrow}</p>
        <h2 className="mt-1.5 text-[22px] font-bold tracking-tight text-[var(--foreground)]">{title}</h2>
        <p className="mt-1.5 text-[13px] leading-5 text-[var(--muted)]">{description}</p>
      </div>

      {children}

      {footerLinks.length > 0 ? (
        <div className="mt-5 flex flex-wrap gap-3 border-t border-[var(--border-solid)] pt-4">
          {footerLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-[13px] text-[var(--muted)] transition hover:text-[var(--foreground)]"
            >
              {link.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  )
}
