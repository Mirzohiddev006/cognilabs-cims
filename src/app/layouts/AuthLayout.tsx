import { Link, Outlet, useLocation } from 'react-router-dom'
import { useLocale } from '../hooks/useLocale'
import { translateCurrentLiteral } from '../../shared/i18n/translations'

const routeCopy = {
  '/auth/login': {
    title: 'Welcome to Cognilabs CIMS',
    description: 'A unified platform for managing teams, projects, customers, and operations.',
  },
  '/auth/forgot-password': {
    title: 'Forgot your password?',
    description: "Enter your email address and we'll send you a link to reset your password.",
  },
  '/auth/reset-password': {
    title: 'Set a new password',
    description: "Choose a strong password and you'll be back in your workspace right away.",
  },
  '/auth/verify-email': {
    title: 'Verify your email',
    description: 'Check your inbox and click the link to activate your account.',
  },
} as const

const features = [
  { icon: '📋', label: 'Project management', description: 'Boards, columns, and cards' },
  { icon: '👥', label: 'Team tracking', description: 'Attendance and performance' },
  { icon: '📊', label: 'CRM dashboard', description: 'Customers and leads' },
  { icon: '🔐', label: 'Role-based access', description: 'Granular permissions' },
]

export function AuthLayout() {
  useLocale()
  const location = useLocation()
  const copy = routeCopy[location.pathname as keyof typeof routeCopy] ?? routeCopy['/auth/login']
  const isLoginRoute = location.pathname === '/auth/login'
  const routeKey = `${location.pathname}${location.search}`
  const tl = (value: string) => translateCurrentLiteral(value)

  return (
    <div className="auth-portal">
      <div className="auth-stage">
        {/* Visual panel */}
        <section className="auth-visual-panel order-2 lg:order-1">
          <div key={`visual-${routeKey}`} className="auth-route-pane relative z-10 flex h-full flex-col justify-between gap-10">
            {/* Brand */}
            <div className="flex items-center gap-2">
              <div className="grid h-7 w-7 place-items-center rounded-[var(--radius-md)] bg-[#37352f] text-white">
                <span className="text-[11px] font-bold">CI</span>
              </div>
              <span className="text-[14px] font-semibold text-[#37352f]">Cognilabs CIMS</span>
            </div>

            {/* Copy */}
            <div>
              <h1 className="text-[28px] font-bold leading-tight text-[#37352f]">
                {tl(copy.title)}
              </h1>
              <p className="mt-3 text-[14px] leading-6 text-[#787774]">
                {tl(copy.description)}
              </p>

              {/* Feature list */}
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {features.map((f) => (
                  <div
                    key={f.label}
                    className="rounded-[var(--radius-lg)] border border-[rgba(55,53,47,0.10)] bg-[rgba(255,255,255,0.72)] px-4 py-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[16px]">{f.icon}</span>
                      <p className="text-[13px] font-semibold text-[#37352f]">{tl(f.label)}</p>
                    </div>
                    <p className="mt-0.5 text-[12px] text-[#787774]">{tl(f.description)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer note */}
            <p className="text-[12px] text-[#9b9a97]">
              © {new Date().getFullYear()} Cognilabs. All rights reserved.
            </p>
          </div>
        </section>

        {/* Form panel */}
        <section className="auth-form-panel order-1 lg:order-2">
          <div className="auth-form-wrap">
            <div key={`form-${routeKey}`} className="auth-route-pane">
              {!isLoginRoute ? (
                <div className="mb-6">
                  <Link
                    to="/auth/login"
                    className="inline-flex items-center gap-1.5 text-[13px] text-[var(--muted)] transition hover:text-[var(--foreground)]"
                  >
                    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                      <path d="M10 12L6 8l4-4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {tl('Back to login')}
                  </Link>
                </div>
              ) : null}

              <Outlet />
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
