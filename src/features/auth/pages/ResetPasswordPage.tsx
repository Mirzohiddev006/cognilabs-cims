import { startTransition, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useLocale } from '../../../app/hooks/useLocale'
import { authService } from '../../../shared/api/services/auth.service'
import { extractFieldErrors, getErrorMessage } from '../../../shared/lib/error'
import { Button } from '../../../shared/ui/button'
import { AuthFeedback } from '../components/AuthFeedback'
import { AuthField } from '../components/AuthField'
import { AuthFormShell } from '../components/AuthFormShell'
import { PasswordField } from '../components/PasswordField'
import { resetPasswordSchema, type ResetPasswordSchema } from '../lib/schemas'

export function ResetPasswordPage() {
  const { t } = useLocale()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [statusMessage, setStatusMessage] = useState(() => {
    const state = location.state as { statusMessage?: string } | null
    return state?.statusMessage ?? ''
  })
  const initialEmail = useMemo(() => searchParams.get('email') ?? '', [searchParams])

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordSchema>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: initialEmail,
      code: '',
      new_password: '',
      confirm_password: '',
    },
  })

  async function onSubmit(values: ResetPasswordSchema) {
    setStatusMessage('')

    try {
      const response = await authService.resetPassword({
        email: values.email,
        code: values.code,
        new_password: values.new_password,
      })

      startTransition(() =>
        navigate('/auth/login', {
          replace: true,
          state: {
            statusMessage: response.message || t('auth.reset.success', 'Password successfully updated. You can now log in.'),
          },
        }),
      )
    } catch (error) {
      const fieldErrors = extractFieldErrors(error)

      if (Object.keys(fieldErrors).length > 0) {
        for (const [field, message] of Object.entries(fieldErrors)) {
          setError(field as keyof ResetPasswordSchema, { message })
        }
      } else {
        setError('root', {
          message: getErrorMessage(error, t('auth.reset.failed', 'Failed to update password.')),
        })
      }
    }
  }

  return (
    <AuthFormShell
      eyebrow={t('auth.recovery.eyebrow', 'Account Recovery')}
      title={t('auth.reset.title', 'Reset your password')}
      description={t('auth.reset.description', 'Enter the verification code from your email and set a new password.')}
      footerLinks={[{ label: t('auth.back_to_login', 'Back to login'), to: '/auth/login' }]}
    >
      <form className="grid gap-5" onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-2 gap-2 rounded-md border border-[var(--border)] bg-[var(--muted-surface)] p-1">
          <Link
            to="/auth/forgot-password"
            className="rounded-md px-3 py-1.5 text-center text-xs font-medium text-[var(--muted)] transition hover:bg-[var(--accent-soft)] hover:text-[var(--foreground)]"
          >
            {t('auth.forgot_password_tab', 'Forgot Password')}
          </Link>
          <span className="rounded-md bg-[var(--card)] px-3 py-1.5 text-center text-xs font-medium text-[var(--foreground)]">
            {t('auth.reset_password_tab', 'Reset Password')}
          </span>
        </div>

        {statusMessage && <AuthFeedback tone="info" message={statusMessage} />}
        {errors.root && <AuthFeedback tone="error" message={errors.root.message ?? ''} />}

        <AuthField
          label={t('auth.email', 'Email')}
          name="email"
          type="email"
          placeholder="user@example.com"
          error={errors.email?.message}
          {...register('email')}
        />

        <AuthField
          label={t('auth.reset.code', 'Reset code')}
          name="code"
          placeholder={t('auth.reset.code_placeholder', 'Code from email')}
          error={errors.code?.message}
          {...register('code')}
        />

        <div className="grid gap-5 md:grid-cols-2">
          <PasswordField
            label={t('auth.reset.new_password', 'New password')}
            name="new_password"
            autoComplete="new-password"
            placeholder={t('auth.reset.new_password_placeholder', 'New password')}
            error={errors.new_password?.message}
            {...register('new_password')}
          />
          <PasswordField
            label={t('auth.reset.confirm_password', 'Confirm password')}
            name="confirm_password"
            autoComplete="new-password"
            placeholder={t('auth.reset.confirm_password_placeholder', 'Confirm password')}
            error={errors.confirm_password?.message}
            {...register('confirm_password')}
          />
        </div>

        <Button size="lg" type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? t('auth.reset.updating', 'Updating...') : t('auth.reset.button', 'Reset password')}
        </Button>
      </form>
    </AuthFormShell>
  )
}
