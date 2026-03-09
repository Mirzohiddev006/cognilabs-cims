import { startTransition, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '../../../shared/ui/card'
import { useAuth } from '../hooks/useAuth'

export function DashboardRedirectPage() {
  const navigate = useNavigate()
  const { resolveDashboardPath, status } = useAuth()

  useEffect(() => {
    if (status !== 'authenticated') {
      return
    }

    async function redirectToDashboard() {
      const destination = await resolveDashboardPath()
      startTransition(() => navigate(destination, { replace: true }))
    }

    void redirectToDashboard()
  }, [navigate, resolveDashboardPath, status])

  return (
    <div className="grid min-h-[55vh] place-items-center">
      <Card className="max-w-xl p-8 text-center">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--accent)]">Redirect</p>
        <h1 className="mt-4 text-3xl font-semibold text-[var(--foreground)]">Dashboard yo'naltirilmoqda</h1>
        <p className="mt-4 text-sm leading-6 text-[var(--muted-strong)]">
          API `auth/dashboard-redirect` javobiga ko'ra foydalanuvchi o'ziga mos bo'limga yuboriladi.
        </p>
      </Card>
    </div>
  )
}
