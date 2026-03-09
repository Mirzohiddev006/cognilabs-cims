import { startTransition, useMemo, useState, type FormEvent } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { authService } from '../../../shared/api/services/auth.service'
import { Button } from '../../../shared/ui/button'
import { AuthFeedback } from '../components/AuthFeedback'
import { AuthField } from '../components/AuthField'
import { AuthFormShell } from '../components/AuthFormShell'
import { useAuth } from '../hooks/useAuth'
import { extractFieldErrors, getErrorMessage } from '../lib/formErrors'
import { validateVerification } from '../lib/validators'

export function VerifyEmailPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { acceptTokens } = useAuth()
  const [searchParams] = useSearchParams()
  const initialMessage = useMemo(() => {
    const state = location.state as { statusMessage?: string } | null
    return state?.statusMessage ?? ''
  }, [location.state])

  const [values, setValues] = useState({
    email: searchParams.get('email') ?? '',
    code: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState('')
  const [statusMessage, setStatusMessage] = useState(initialMessage)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResending, setIsResending] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const validationErrors = validateVerification(values)
    setErrors(validationErrors)
    setSubmitError('')

    if (Object.keys(validationErrors).length > 0) {
      return
    }

    setIsSubmitting(true)

    try {
      const response = await authService.verifyEmail(values)
      await acceptTokens(response)
      startTransition(() => navigate('/', { replace: true }))
    } catch (error) {
      setErrors(extractFieldErrors(error))
      setSubmitError(getErrorMessage(error, 'Email tasdiqlanmadi.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleResend() {
    const validationErrors = validateVerification({
      email: values.email,
      code: 'dummy',
    })

    if (validationErrors.email) {
      setErrors({ email: validationErrors.email })
      return
    }

    setIsResending(true)
    setSubmitError('')

    try {
      const response = await authService.resendVerification(values.email)
      setStatusMessage(response.message || 'Tasdiqlash kodi qayta yuborildi.')
    } catch (error) {
      setSubmitError(getErrorMessage(error, 'Kod qayta yuborilmadi.'))
    } finally {
      setIsResending(false)
    }
  }

  return (
    <AuthFormShell
      eyebrow="Auth / Verify"
      title="Emailni tasdiqlash"
      description="Verify email endpoint kodi va email qiymatini qabul qiladi. Muvaffaqiyatli javobdan keyin access token saqlanadi."
      footerLinks={[
        { label: 'Login', to: '/auth/login' },
        { label: 'Register', to: '/auth/register' },
      ]}
    >
      <form className="grid gap-5" onSubmit={handleSubmit}>
        <AuthFeedback tone="success" message={statusMessage} />
        <AuthFeedback tone="error" message={submitError} />

        <AuthField
          label="Email"
          name="email"
          type="email"
          placeholder="user@example.com"
          value={values.email}
          error={errors.email}
          onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))}
        />

        <AuthField
          label="Verification code"
          name="code"
          placeholder="Emailga kelgan kod"
          value={values.code}
          error={errors.code}
          onChange={(event) => setValues((current) => ({ ...current, code: event.target.value }))}
        />

        <div className="flex flex-wrap gap-3">
          <Button size="lg" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Tasdiqlanmoqda...' : 'Verify email'}
          </Button>
          <Button type="button" variant="secondary" disabled={isResending} onClick={handleResend}>
            {isResending ? 'Yuborilmoqda...' : 'Resend code'}
          </Button>
        </div>
      </form>
    </AuthFormShell>
  )
}
