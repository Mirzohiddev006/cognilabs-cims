import { NavLink, Outlet } from 'react-router-dom'
import { authNavigation } from '../../features/auth/config/authNavigation'

export function AuthLayout() {
  return (
    <div className="grid min-h-screen place-items-center px-4 py-10">
      <div className="glass-panel relative w-full max-w-5xl overflow-hidden rounded-2xl">
        <div className="grid min-h-[680px] gap-0 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="grid-overlay relative hidden overflow-hidden border-r border-[var(--border)] bg-[linear-gradient(180deg,#111827,#020617)] px-10 py-12 text-white lg:block">
            <div className="relative z-10 flex h-full flex-col justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.22em] text-slate-300">
                  Cognilabs CIMS
                </p>
                <h1 className="mt-6 max-w-md text-5xl font-semibold leading-tight">
                  Account access flow tayyor.
                </h1>
                <p className="mt-6 max-w-md text-base text-slate-300">
                  Login, register, verify email, forgot password va reset password sahifalari shu layout ichida
                  yagona UX tizimi bilan ishlaydi.
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/10 p-6">
                <p className="text-sm text-slate-300">Available flows</p>
                <p className="mt-2 text-2xl font-medium">Login, onboarding, verification, recovery</p>
              </div>
            </div>
          </section>
          <section className="bg-[var(--surface-strong)] p-6 sm:p-10">
            <div className="mb-8 flex flex-wrap gap-2">
              {authNavigation.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    [
                      'rounded-md px-4 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-[var(--accent)] text-white'
                        : 'border border-[var(--border)] bg-white text-[var(--muted-strong)] hover:bg-[var(--accent-soft)]',
                    ].join(' ')
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
            <Outlet />
          </section>
        </div>
      </div>
    </div>
  )
}
