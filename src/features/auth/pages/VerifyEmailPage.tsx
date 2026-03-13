import { startTransition, useEffect, useMemo, useState, type FormEvent } from 'react'
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
  const [timeLeft, setTimeLeft] = useState(1800)

  useEffect(() => {
    if (timeLeft <= 0) {
      return
    }

    const timer = window.setInterval(() => {
      setTimeLeft((current) => (current > 0 ? current - 1 : 0))
    }, 1000)

    return () => {
      window.clearInterval(timer)
    }
  }, [timeLeft])

  const isExpired = timeLeft <= 0
  const minutes = String(Math.floor(timeLeft / 60)).padStart(2, '0')
  const seconds = String(timeLeft % 60).padStart(2, '0')

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
      setSubmitError(getErrorMessage(error, 'Email verification failed.'))
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
      setStatusMessage(response.message || 'Verification code has been resent.')
      setTimeLeft(1800)
    } catch (error) {
      setSubmitError(getErrorMessage(error, 'Failed to resend code.'))
    } finally {
      setIsResending(false)
    }
  }

  return (
    <AuthFormShell
      eyebrow="Email Verification"
      title="Verify your email"
      description="We sent a verification code to your email. Enter it below before the timer expires."
      footerLinks={[{ label: 'Login', to: '/auth/login' }]}
    >
      <form className="grid gap-5" onSubmit={handleSubmit}>
        <AuthFeedback tone="success" message={statusMessage} />
        <AuthFeedback tone="error" message={submitError} />

        <div className="flex items-center justify-center gap-2 text-xs text-[var(--muted)]">
          <span>Code expires in</span>
          <span className="rounded-md border border-[var(--border)] bg-[var(--muted-surface)] px-2.5 py-1 font-mono text-[var(--muted-strong)]">
            {isExpired ? 'Expired' : `${minutes}:${seconds}`}
          </span>
        </div>

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
          placeholder="Code from email"
          value={values.code}
          error={errors.code}
          className="min-h-12 text-center font-mono tracking-[0.35em] uppercase"
          onChange={(event) => setValues((current) => ({ ...current, code: event.target.value }))}
        />

        <div className="flex flex-wrap gap-3">
          <Button size="lg" type="submit" disabled={isSubmitting || isExpired} className="flex-1">
            {isSubmitting ? 'Verifying...' : 'Verify email'}
          </Button>
          <Button type="button" variant="secondary" disabled={isResending} onClick={handleResend} className="flex-1">
            {isResending ? 'Resending...' : 'Resend code'}
          </Button>
        </div>

        {isExpired ? (
          <AuthFeedback tone="info" message="Your verification code has expired. Please request a new one." />
        ) : null}
      </form>
    </AuthFormShell>
  )
}
