import { Link, Outlet, useLocation } from 'react-router-dom'

const routeCopy = {
  '/auth/login': {
    eyebrow: 'Cognilabs CIMS',
    title: 'Secure access for your operations team.',
    description:
      'A focused login surface with animated depth, session-safe entry, and no extra register clutter in the header.',
    badge: 'Live access portal',
  },
  '/auth/forgot-password': {
    eyebrow: 'Recovery Flow',
    title: 'Recover credentials without leaving the secure zone.',
    description:
      'Password recovery stays inside the same protected auth surface so users can reset access without distraction.',
    badge: 'Reset support',
  },
  '/auth/reset-password': {
    eyebrow: 'Recovery Flow',
    title: 'Set a new password and get back into the workspace.',
    description:
      'Verification and password update are kept in one controlled flow with the same visual shell and security hints.',
    badge: 'Password reset',
  },
  '/auth/verify-email': {
    eyebrow: 'Verification Flow',
    title: 'Activate the account and move straight into the app.',
    description:
      'Email verification is presented in the same immersive auth environment, without tabs competing for attention.',
    badge: 'Email check',
  },
} as const

const previewStats = [
  { label: 'Session control', value: 'Realtime token guard' },
  { label: 'Permission model', value: 'Role-based access' },
  { label: 'Recovery', value: 'Verify and reset ready' },
  { label: 'Environment', value: 'Single workspace entry' },
]

export function AuthLayout() {
  const location = useLocation()
  const copy = routeCopy[location.pathname as keyof typeof routeCopy] ?? routeCopy['/auth/login']
  const isLoginRoute = location.pathname === '/auth/login'
  const routeAnimationKey = `${location.pathname}${location.search}`

  return (
    <div className="auth-portal">
      <div className="auth-portal__glow auth-portal__glow--primary" />
      <div className="auth-portal__glow auth-portal__glow--secondary" />

      <div className="auth-stage">
        <section className="auth-visual-panel order-2 lg:order-1">
          <div key={`visual-${routeAnimationKey}`} className="auth-route-pane auth-route-pane--visual">
            <div className="relative z-10 max-w-xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-cyan-300/80">{copy.eyebrow}</p>
              <h1 className="mt-5 max-w-xl text-4xl font-semibold leading-tight text-[var(--foreground)] md:text-5xl">{copy.title}</h1>
              <p className="mt-5 max-w-lg text-base leading-7 text-[var(--muted)]">{copy.description}</p>
            </div>

            <div className="auth-preview-card">
              <div className="auth-preview-card__grid" />

              <div className="relative z-10 space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-300/75">{copy.badge}</p>
                    <h2 className="mt-3 max-w-sm text-2xl font-semibold leading-tight text-[var(--foreground)] md:text-3xl">
                      Permissions, sessions, and recovery stay inside one motion-driven surface.
                    </h2>
                  </div>
                  <span className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
                    Online
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {previewStats.map((item) => (
                    <div key={item.label} className="rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur-sm">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">{item.label}</p>
                      <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="auth-form-panel order-1 lg:order-2">
          <div className="auth-form-wrap">
            <div key={`form-${routeAnimationKey}`} className="auth-route-pane auth-route-pane--form">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                    {isLoginRoute ? 'Direct access' : 'Support flow'}
                  </p>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--muted)]">
                    {isLoginRoute
                      ? 'Use your work credentials to continue into the platform.'
                      : 'The extra header buttons are removed, but recovery and verification remain available here.'}
                  </p>
                </div>

                {!isLoginRoute ? (
                  <Link
                    to="/auth/login"
                    className="rounded-full border border-[var(--border)] bg-[var(--muted-surface)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--foreground)] transition hover:bg-[var(--accent-soft)]"
                  >
                    Back to login
                  </Link>
                ) : null}
              </div>

              <Outlet />
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
