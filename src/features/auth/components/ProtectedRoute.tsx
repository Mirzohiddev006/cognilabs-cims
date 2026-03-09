import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

type ProtectedRouteProps = {
  permissionKey?: string
  children?: ReactNode
}

function LoadingState() {
  return (
    <div className="grid min-h-[50vh] place-items-center">
      <div className="glass-panel w-full max-w-md rounded-[28px] p-6 text-center">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--accent)]">Session</p>
        <h2 className="mt-3 text-2xl font-semibold text-[var(--foreground)]">Hisob tekshirilmoqda</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--muted-strong)]">
          Access token, refresh flow va foydalanuvchi ruxsatlari yuklanmoqda.
        </p>
      </div>
    </div>
  )
}

export function ProtectedRoute({ permissionKey, children }: ProtectedRouteProps) {
  const location = useLocation()
  const { hasPermission, isAuthenticated, status } = useAuth()

  if (status === 'loading') {
    return <LoadingState />
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/auth/login"
        replace
        state={{
          from: `${location.pathname}${location.search}${location.hash}`,
          statusMessage: 'Session topilmadi yoki tugagan. Qayta login qiling.',
        }}
      />
    )
  }

  if (permissionKey && !hasPermission(permissionKey)) {
    return <Navigate to="/dashboard-redirect" replace />
  }

  return children ? <>{children}</> : <Outlet />
}
