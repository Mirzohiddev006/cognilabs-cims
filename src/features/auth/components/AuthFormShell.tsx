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
      <div className="space-y-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-blue-500">{eyebrow}</p>
        <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">{title}</h2>
        <p className="max-w-xl text-sm font-medium leading-relaxed text-zinc-500">{description}</p>
      </div>

      <div className="mt-10">{children}</div>

      {footerLinks.length > 0 ? (
        <div className="mt-8 flex flex-wrap gap-3">
          {footerLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-xs font-bold uppercase tracking-wider text-zinc-500 transition hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </div>
      ) : null}
    </Card>
  )
}
