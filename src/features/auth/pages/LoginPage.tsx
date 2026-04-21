import { startTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useLocale } from '../../../app/hooks/useLocale'
import { authService } from '../../../shared/api/services/auth.service'
import { Button } from '../../../shared/ui/button'
import { extractFieldErrors, getErrorMessage } from '../../../shared/lib/error'
import { AuthFeedback } from '../components/AuthFeedback'
import { AuthField } from '../components/AuthField'
import { AuthFormShell } from '../components/AuthFormShell'
import { PasswordField } from '../components/PasswordField'
import { useAuth } from '../hooks/useAuth'
import { loginSchema, type LoginSchema } from '../lib/schemas'

export function LoginPage() {
  const { t } = useLocale()
  const navigate = useNavigate()
  const location = useLocation()
  const { acceptTokens } = useAuth()

  const initialMessage = (location.state as { statusMessage?: string } | null)?.statusMessage ?? ''

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  })

  async function onSubmit(values: LoginSchema) {
    try {
      const response = await authService.login(values)
      await acceptTokens(response)
      startTransition(() => navigate('/', { replace: true }))
    } catch (error) {
      const fieldErrors = extractFieldErrors(error)

      if (Object.keys(fieldErrors).length > 0) {
        for (const [field, message] of Object.entries(fieldErrors)) {
          setError(field as keyof LoginSchema, { message })
        }
      } else {
        setError('root', {
          message: getErrorMessage(error, t('auth.login_failed', 'Login failed. Check your email or password and try again.')),
        })
      }
    }
  }

  return (
    <AuthFormShell
      eyebrow={t('auth.login.eyebrow', 'Login')}
      title={t('auth.login.title', 'Login to your account')}
      description={t('auth.login.description', 'Enter your email below to login to your account.')}
      footerLinks={[]}
    >
      <form className="grid gap-5" onSubmit={handleSubmit(onSubmit)}>
        {initialMessage && <AuthFeedback tone="success" message={initialMessage} />}
        {errors.root && <AuthFeedback tone="error" message={errors.root.message ?? ''} />}

        <AuthField
          label={t('auth.email', 'Email')}
          type="email"
          autoComplete="email"
          placeholder="user@example.com"
          error={errors.username?.message}
          className="min-h-11"
          {...register('username')}
        />

        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-bold text-[var(--foreground)] tracking-tight">
              {t('auth.password', 'Password')}
            </span>
            <Link
              className="text-xs text-[var(--muted)] transition hover:text-[var(--foreground)]"
              to="/auth/forgot-password"
            >
              {t('auth.forgot_password', 'Forgot password?')}
            </Link>
          </div>

          <PasswordField
            label=""
            autoComplete="current-password"
            placeholder={t('auth.password.enter', 'Enter your password')}
            error={errors.password?.message}
            className="min-h-11"
            {...register('password')}
          />
        </div>

        <Button size="lg" type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? t('auth.signing_in', 'Signing in...') : t('auth.login_button', 'Login')}
        </Button>

        <div className="text-center text-xs text-[var(--muted)]">
          {t('auth.verify_prompt', 'Email not verified?')}{' '}
          <Link
            className="underline underline-offset-4 transition hover:text-[var(--foreground)]"
            to="/auth/verify-email"
          >
            {t('auth.verify_email', 'Verify email')}
          </Link>
        </div>
      </form>
    </AuthFormShell>
  )
}
