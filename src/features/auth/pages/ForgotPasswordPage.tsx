import { startTransition, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
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
            statusMessage: response.message || 'Reset kodi yuborildi. Yangi parolni kiriting.',
          },
        }),
      )
    } catch (error) {
      setErrors(extractFieldErrors(error))
      setSubmitError(getErrorMessage(error, 'Reset kodi yuborilmadi.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthFormShell
      eyebrow="Auth / Forgot"
      title="Parolni tiklash"
      description="Forgot password endpoint email qabul qiladi va reset flow'ni boshlaydi."
      footerLinks={[
        { label: 'Login', to: '/auth/login' },
        { label: 'Reset password', to: '/auth/reset-password' },
      ]}
    >
      <form className="grid gap-5" onSubmit={handleSubmit}>
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

        <Button size="lg" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Jo'natilmoqda..." : 'Send reset code'}
        </Button>
      </form>
    </AuthFormShell>
  )
}
