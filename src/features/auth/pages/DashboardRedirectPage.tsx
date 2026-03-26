import { startTransition, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLocale } from '../../../app/hooks/useLocale'
import { Card } from '../../../shared/ui/card'
import { useAuth } from '../hooks/useAuth'

export function DashboardRedirectPage() {
  const { t } = useLocale()
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
      <Card className="max-w-xl p-10 text-center border-none bg-transparent">
        <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-blue-500">{t('auth.redirect.eyebrow', 'Redirecting')}</p>
        <h1 className="mt-6 text-3xl font-bold text-white tracking-tight">{t('auth.redirect.title', 'Accessing Dashboard')}</h1>
        <p className="mt-6 text-sm font-medium leading-relaxed text-zinc-500">
          {t('auth.redirect.description', 'We are determining the best entry point for your account role. One moment...')}
        </p>
      </Card>
    </div>
  )
}
