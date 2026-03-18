import { startTransition, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authService } from '../../../shared/api/services/auth.service'
import { Button } from '../../../shared/ui/button'
import { AuthFeedback } from '../components/AuthFeedback'
import { AuthField } from '../components/AuthField'
import { AuthFormShell } from '../components/AuthFormShell'
import { extractFieldErrors, getErrorMessage } from '../lib/formErrors'
import { validateEmailOnly } from '../lib/validators'

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const validationErrors = validateEmailOnly(email)
    setErrors(validationErrors)
    setSubmitError('')

    if (Object.keys(validationErrors).length > 0) {
      return
    }

    setIsSubmitting(true)

    try {
      const response = await authService.forgotPassword(email)
      startTransition(() =>
        navigate(`/auth/reset-password?email=${encodeURIComponent(email)}`, {
          replace: true,
          state: {
            statusMessage: response.message || 'A reset code has been sent. Please enter your new password.',
          },
        }),
      )
    } catch (error) {
      setErrors(extractFieldErrors(error))
      setSubmitError(getErrorMessage(error, 'Failed to send reset code.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthFormShell
      eyebrow="Account Recovery"
      title="Recover your account"
      description="Request a reset code or switch to password reset if you already received one."
      footerLinks={[{ label: 'Back to login', to: '/auth/login' }]}
    >
      <form className="grid gap-5" onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-2 rounded-md border border-[var(--border)] bg-[var(--muted-surface)] p-1">
          <span className="rounded-md bg-[var(--card)] px-3 py-1.5 text-center text-xs font-medium text-[var(--foreground)]">
            Forgot Password
          </span>
          <Link
            to="/auth/reset-password"
            className="rounded-md px-3 py-1.5 text-center text-xs font-medium text-[var(--muted)] transition hover:bg-[var(--accent-soft)] hover:text-[var(--foreground)]"
          >
            Reset Password
          </Link>
        </div>

        <AuthFeedback tone="error" message={submitError} />

        <AuthField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="user@example.com"
          value={email}
          error={errors.email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <Button size="lg" type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? 'Sending...' : 'Send reset code'}
        </Button>
      </form>
    </AuthFormShell>
  )
}
