import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../shared/ui/button'
import { Card } from '../../../shared/ui/card'

export function AuthPreviewPage() {
  const { t } = useTranslation()
  const authFlows = [
    {
      title: t('auth.login.eyebrow'),
      description: t('ceo.auth_preview.flow.login_description'),
    },
    {
      title: t('auth.register.button'),
      description: t('ceo.auth_preview.flow.register_description'),
    },
    {
      title: t('auth.recovery.eyebrow'),
      description: t('ceo.auth_preview.flow.recovery_description'),
    },
  ]

  return (
    <div className="flex h-full flex-col justify-between gap-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.28em] text-[var(--muted)]">{t('ceo.auth_preview.eyebrow')}</p>
        <h2 className="mt-3 max-w-lg text-2xl font-semibold text-[var(--foreground)]">
          {t('ceo.auth_preview.title')}
        </h2>
        <p className="mt-3 max-w-xl text-sm text-[var(--muted-strong)]">
          {t('ceo.auth_preview.description')}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {authFlows.map((item) => (
          <Card key={item.title} className="h-full p-5">
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-[var(--accent)]">{item.title}</p>
            <p className="mt-4 text-sm leading-6 text-[var(--muted-strong)]">{item.description}</p>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/">{t('ceo.auth_preview.back')}</Link>
        </Button>
        <Button asChild variant="secondary">
          <a href="https://vite.dev/" target="_blank" rel="noreferrer">
            {t('ceo.auth_preview.docs')}
          </a>
        </Button>
      </div>
    </div>
  )
}
