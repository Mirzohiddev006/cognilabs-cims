import { Link } from 'react-router-dom'
import { Button } from '../../../shared/ui/button'

export function NotFoundPage() {
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="glass-panel max-w-lg rounded-[28px] p-8 text-center">
        <p className="text-sm font-medium uppercase tracking-[0.32em] text-[var(--accent)]">404</p>
        <h1 className="mt-4 text-4xl font-semibold text-[var(--foreground)]">Route topilmadi</h1>
        <p className="mt-4 text-base text-[var(--muted-strong)]">
          Router skeleti tayyor. Bu manzil hali modulga ulanmagan yoki noto'g'ri yo'l ishlatildi.
        </p>
        <Button asChild className="mt-6">
          <Link to="/">Overview ga qaytish</Link>
        </Button>
      </div>
    </div>
  )
}
