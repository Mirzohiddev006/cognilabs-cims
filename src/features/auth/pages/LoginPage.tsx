import { startTransition, useMemo, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { authService } from '../../../shared/api/services/auth.service'
import { Button } from '../../../shared/ui/button'
import { AuthFeedback } from '../components/AuthFeedback'
import { AuthField } from '../components/AuthField'
import { AuthFormShell } from '../components/AuthFormShell'
import { PasswordField } from '../components/PasswordField'
import { useAuth } from '../hooks/useAuth'
import { extractFieldErrors, getErrorMessage } from '../lib/formErrors'
import { validateLogin } from '../lib/validators'

type LoginValues = {
  username: string
  password: string
}

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { acceptTokens } = useAuth()
  const initialMessage = useMemo(() => {
    const state = location.state as { statusMessage?: string } | null
    return state?.statusMessage ?? ''
  }, [location.state])

  const [values, setValues] = useState<LoginValues>({
    username: '',
    password: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [statusMessage, setStatusMessage] = useState(initialMessage)
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const validationErrors = validateLogin(values)
    setErrors(validationErrors)
    setSubmitError('')
    setStatusMessage('')

    if (Object.keys(validationErrors).length > 0) {
      return
    }

    setIsSubmitting(true)

    try {
      const response = await authService.login(values)
      await acceptTokens(response)
      startTransition(() => navigate('/', { replace: true }))
    } catch (error) {
      setErrors(extractFieldErrors(error))
      setSubmitError(getErrorMessage(error, "Login bajarilmadi. Email yoki parolni tekshirib qayta urinib ko'ring."))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthFormShell
      eyebrow="Auth / Login"
      title="Tizimga kirish"
      description="Access va refresh token olish uchun login endpoint bilan bog'langan forma."
      footerLinks={[
        { label: 'Register', to: '/auth/register' },
        { label: 'Forgot password', to: '/auth/forgot-password' },
      ]}
    >
      <form className="grid gap-5" onSubmit={handleSubmit}>
        <AuthFeedback tone="success" message={statusMessage} />
        <AuthFeedback tone="error" message={submitError} />

        <AuthField
          label="Email"
          name="username"
          type="email"
          autoComplete="email"
          placeholder="user@example.com"
          value={values.username}
          error={errors.username}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              username: event.target.value,
            }))
          }
        />

        <PasswordField
          label="Password"
          name="password"
          autoComplete="current-password"
          placeholder="Parolingizni kiriting"
          value={values.password}
          error={errors.password}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              password: event.target.value,
            }))
          }
        />

        <Button size="lg" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Kirilmoqda...' : 'Login'}
        </Button>

        <p className="text-sm text-[var(--muted-strong)]">
          Email tasdiqlanmagan bo'lsa, <Link className="text-[var(--accent)]" to="/auth/verify-email">verify email</Link>{' '}
          sahifasidan kodni yuborib tasdiqlang.
        </p>
      </form>
    </AuthFormShell>
  )
}
