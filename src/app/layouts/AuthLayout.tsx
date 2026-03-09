import { NavLink, Outlet } from 'react-router-dom'
import { authNavigation } from '../../features/auth/config/authNavigation'
import { cn } from '../../shared/lib/cn'

export function AuthLayout() {
  return (
    <div className="grid min-h-screen place-items-center px-4 py-10">
      <div className="glass-panel relative w-full max-w-5xl overflow-hidden rounded-2xl">
        <div className="grid min-h-[680px] gap-0 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="grid-overlay relative hidden overflow-hidden border-r border-[var(--border)] bg-black px-10 py-12 text-white lg:block">
            <div className="relative z-10 flex h-full flex-col justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-500">
                  Cognilabs CIMS
                </p>
                <h1 className="mt-6 max-w-md text-5xl font-bold leading-tight tracking-tight">
                  Enterprise Software <span className="text-blue-500">Workspace</span>
                </h1>
                <p className="mt-6 max-w-md text-lg text-slate-400 leading-relaxed">
                  The unified platform for managing your business operations with speed and precision.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Security First</p>
                <p className="mt-2 text-xl font-bold text-white">Encrypted & Reliable authentication system</p>
              </div>
            </div>
          </section>
          <section className="bg-[var(--surface-strong)] p-6 sm:p-10">
            <div className="mb-10 flex flex-wrap gap-3">
              {authNavigation.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'rounded-full px-5 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-300',
                      isActive
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-700/30'
                        : 'border border-[var(--border)] bg-white/5 text-[var(--muted)] hover:bg-white/10 hover:text-white',
                    )
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
