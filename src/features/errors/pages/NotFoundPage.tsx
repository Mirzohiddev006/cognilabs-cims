import { Link } from 'react-router-dom'
import { useLocale } from '../../../app/hooks/useLocale'
import { Button } from '../../../shared/ui/button'

export function NotFoundPage() {
  const { t } = useLocale()

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-black/40 p-12 text-center backdrop-blur-sm">
        <p className="text-[11px] font-bold uppercase tracking-[0.4em] text-blue-500">{t('errors.not_found.code', 'Error 404')}</p>
        <h1 className="mt-6 text-4xl font-bold text-white tracking-tight">{t('errors.not_found.title', 'Page not found')}</h1>
        <p className="mt-6 text-sm font-medium leading-relaxed text-zinc-500">
          {t('errors.not_found.description', 'The requested route is not available. Please check the URL or navigate back to the dashboard.')}
        </p>
        <Button asChild className="mt-10">
          <Link to="/">{t('errors.not_found.back', 'Back to Dashboard')}</Link>
        </Button>
      </div>
    </div>
  )
}
