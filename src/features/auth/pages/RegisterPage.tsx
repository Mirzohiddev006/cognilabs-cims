import { startTransition, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import type { RegisterPayload } from '../../../shared/api/services/auth.service'
import { authService } from '../../../shared/api/services/auth.service'
import { Button } from '../../../shared/ui/button'
import { AuthFeedback } from '../components/AuthFeedback'
import { AuthField } from '../components/AuthField'
import { AuthFormShell } from '../components/AuthFormShell'
import { PasswordField } from '../components/PasswordField'
import { extractFieldErrors, getErrorMessage } from '../lib/formErrors'
import { validateRegister } from '../lib/validators'

const initialValues: RegisterPayload = {
  email: '',
  name: '',
  surname: '',
  password: '',
  company_code: 'oddiy',
  telegram_id: '',
  role: 'Customer',
}

const roleOptions = ['Customer', 'SalesManager', 'Finance', 'CEO']

export function RegisterPage() {
  const navigate = useNavigate()
  const [values, setValues] = useState<RegisterPayload>(initialValues)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const validationErrors = validateRegister(values)
    setErrors(validationErrors)
    setSubmitError('')

    if (Object.keys(validationErrors).length > 0) {
      return
    }

    setIsSubmitting(true)

    try {
      await authService.register({
        ...values,
        telegram_id: values.telegram_id?.trim() || undefined,
      })

      startTransition(() =>
        navigate(`/auth/verify-email?email=${encodeURIComponent(values.email)}`, {
          replace: true,
          state: {
            statusMessage: "Ro'yxatdan o'tish muvaffaqiyatli. Emailga yuborilgan kodni kiriting.",
          },
        }),
      )
    } catch (error) {
      setErrors(extractFieldErrors(error))
      setSubmitError(getErrorMessage(error, "Ro'yxatdan o'tish bajarilmadi."))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthFormShell
      eyebrow="Auth / Register"
      title="Yangi account ochish"
      description="Register endpoint email, company code va role bilan bog'landi. Keyin verify email sahifasiga o'tadi."
      footerLinks={[
        { label: 'Login', to: '/auth/login' },
        { label: 'Verify email', to: '/auth/verify-email' },
      ]}
    >
      <form className="grid gap-5" onSubmit={handleSubmit}>
        <AuthFeedback tone="error" message={submitError} />

        <div className="grid gap-5 md:grid-cols-2">
          <AuthField
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="user@example.com"
            value={values.email}
            error={errors.email}
            onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))}
          />
          <AuthField
            label="Company code"
            name="company_code"
            placeholder="oddiy"
            value={values.company_code}
            error={errors.company_code}
            onChange={(event) => setValues((current) => ({ ...current, company_code: event.target.value }))}
          />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <AuthField
            label="Name"
            name="name"
            autoComplete="given-name"
            placeholder="Ibrohim"
            value={values.name}
            error={errors.name}
            onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
          />
          <AuthField
            label="Surname"
            name="surname"
            autoComplete="family-name"
            placeholder="Ibrohimjonov"
            value={values.surname}
            error={errors.surname}
            onChange={(event) => setValues((current) => ({ ...current, surname: event.target.value }))}
          />
        </div>

        <PasswordField
          label="Password"
          name="password"
          autoComplete="new-password"
          placeholder="Kamida 6 ta belgi"
          value={values.password}
          error={errors.password}
          onChange={(event) => setValues((current) => ({ ...current, password: event.target.value }))}
        />

        <div className="grid gap-5 md:grid-cols-2">
          <AuthField
            label="Telegram ID"
            name="telegram_id"
            placeholder="@username yoki id"
            value={values.telegram_id}
            error={errors.telegram_id}
            onChange={(event) => setValues((current) => ({ ...current, telegram_id: event.target.value }))}
          />

          <label className="grid gap-2">
            <span className="text-sm font-medium text-[var(--foreground)]">Role</span>
            <select
              name="role"
              value={values.role}
              onChange={(event) => setValues((current) => ({ ...current, role: event.target.value }))}
              className="min-h-12 rounded-2xl border border-[var(--border)] bg-white/80 px-4 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
            >
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>
        </div>

        <Button size="lg" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Jo'natilmoqda..." : 'Register'}
        </Button>
      </form>
    </AuthFormShell>
  )
}
