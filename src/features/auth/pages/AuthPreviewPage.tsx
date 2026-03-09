import { Link } from 'react-router-dom'
import { Button } from '../../../shared/ui/button'
import { Card } from '../../../shared/ui/card'

const authFlows = [
  {
    title: 'Login',
    description: 'POST /auth/login form-url-encoded orqali access va refresh token olish.',
  },
  {
    title: 'Register',
    description: 'POST /auth/register bilan email, role va company code asosida yangi foydalanuvchi yaratish.',
  },
  {
    title: 'Recovery',
    description: 'Forgot password, reset password va verify email flowlari alohida sahifalarga ajratiladi.',
  },
]

export function AuthPreviewPage() {
  return (
    <div className="flex h-full flex-col justify-between gap-8">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-[var(--muted)]">Day 2 prep</p>
        <h2 className="mt-4 max-w-lg text-4xl font-semibold text-[var(--foreground)]">
          Auth moduli uchun route va layout tayyor.
        </h2>
        <p className="mt-4 max-w-xl text-base text-[var(--muted-strong)]">
          Bugun router, service layer va reusable componentlar tayyorlandi. Ertaga form validation va endpoint
          integratsiyasi shu asosda qo'shiladi.
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
          <Link to="/">Back to overview</Link>
        </Button>
        <Button asChild variant="secondary">
          <a href="https://vite.dev/" target="_blank" rel="noreferrer">
            Vite docs
          </a>
        </Button>
      </div>
    </div>
  )
}
