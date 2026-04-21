import { startTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { useLocale } from '../../../app/hooks/useLocale'
import { authService } from '../../../shared/api/services/auth.service'
import { extractFieldErrors, getErrorMessage } from '../../../shared/lib/error'
import { Button } from '../../../shared/ui/button'
import { AuthFeedback } from '../components/AuthFeedback'
import { AuthField } from '../components/AuthField'
import { AuthFormShell } from '../components/AuthFormShell'
import { forgotPasswordSchema, type ForgotPasswordSchema } from '../lib/schemas'

export function ForgotPasswordPage() {
  const { t } = useLocale()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordSchema>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  async function onSubmit(values: ForgotPasswordSchema) {
    try {
      const response = await authService.forgotPassword(values.email)
      startTransition(() =>
        navigate(`/auth/reset-password?email=${encodeURIComponent(values.email)}`, {
          replace: true,
          state: {
            statusMessage: response.message || t('auth.reset_code_sent', 'A reset code has been sent. Please enter your new password.'),
          },
        }),
      )
    } catch (error) {
      const fieldErrors = extractFieldErrors(error)

      if (Object.keys(fieldErrors).length > 0) {
        for (const [field, message] of Object.entries(fieldErrors)) {
          setError(field as keyof ForgotPasswordSchema, { message })
        }
      } else {
        setError('root', {
          message: getErrorMessage(error, t('auth.send_reset_failed', 'Failed to send reset code.')),
        })
      }
    }
  }

  return (
    <AuthFormShell
      eyebrow={t('auth.recovery.eyebrow', 'Account Recovery')}
      title={t('auth.recovery.title', 'Recover your account')}
      description={t('auth.recovery.description', 'Request a reset code or switch to password reset if you already received one.')}
      footerLinks={[{ label: t('auth.back_to_login', 'Back to login'), to: '/auth/login' }]}
    >
      <form className="grid gap-5" onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-2 gap-2 rounded-md border border-[var(--border)] bg-[var(--muted-surface)] p-1">
          <span className="rounded-md bg-[var(--card)] px-3 py-1.5 text-center text-xs font-medium text-[var(--foreground)]">
            {t('auth.forgot_password_tab', 'Forgot Password')}
          </span>
          <Link
            to="/auth/reset-password"
            className="rounded-md px-3 py-1.5 text-center text-xs font-medium text-[var(--muted)] transition hover:bg-[var(--accent-soft)] hover:text-[var(--foreground)]"
          >
            {t('auth.reset_password_tab', 'Reset Password')}
          </Link>
        </div>

        {errors.root && <AuthFeedback tone="error" message={errors.root.message ?? ''} />}

        <AuthField
          label={t('auth.email', 'Email')}
          type="email"
          autoComplete="email"
          placeholder="user@example.com"
          error={errors.email?.message}
          {...register('email')}
        />

        <Button size="lg" type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? t('auth.sending', 'Sending...') : t('auth.send_reset_code', 'Send reset code')}
        </Button>
      </form>
    </AuthFormShell>
  )
}
