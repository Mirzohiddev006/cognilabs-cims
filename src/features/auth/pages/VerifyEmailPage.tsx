import { startTransition, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useLocale } from '../../../app/hooks/useLocale'
import { authService } from '../../../shared/api/services/auth.service'
import { extractFieldErrors, getErrorMessage } from '../../../shared/lib/error'
import { Button } from '../../../shared/ui/button'
import { AuthFeedback } from '../components/AuthFeedback'
import { AuthField } from '../components/AuthField'
import { AuthFormShell } from '../components/AuthFormShell'
import { useAuth } from '../hooks/useAuth'
import { verifyEmailSchema, type VerifyEmailSchema } from '../lib/schemas'

export function VerifyEmailPage() {
  const { t } = useLocale()
  const navigate = useNavigate()
  const location = useLocation()
  const { acceptTokens } = useAuth()
  const [searchParams] = useSearchParams()
  const [statusMessage, setStatusMessage] = useState(() => {
    const state = location.state as { statusMessage?: string } | null
    return state?.statusMessage ?? ''
  })
  const [isResending, setIsResending] = useState(false)
  const [timeLeft, setTimeLeft] = useState(1800)
  const initialEmail = useMemo(() => searchParams.get('email') ?? '', [searchParams])

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

  const {
    register,
    handleSubmit,
    setError,
    getValues,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<VerifyEmailSchema>({
    resolver: zodResolver(verifyEmailSchema),
    defaultValues: {
      email: initialEmail,
      code: '',
    },
  })

  async function onSubmit(values: VerifyEmailSchema) {
    try {
      const response = await authService.verifyEmail(values)
      await acceptTokens(response)
      startTransition(() => navigate('/', { replace: true }))
    } catch (error) {
      const fieldErrors = extractFieldErrors(error)

      if (Object.keys(fieldErrors).length > 0) {
        for (const [field, message] of Object.entries(fieldErrors)) {
          setError(field as keyof VerifyEmailSchema, { message })
        }
      } else {
        setError('root', {
          message: getErrorMessage(error, t('auth.verify.failed', 'Email verification failed.')),
        })
      }
    }
  }

  async function handleResend() {
    const isEmailValid = await trigger('email')

    if (!isEmailValid) {
      return
    }

    setIsResending(true)
    setStatusMessage('')

    try {
      const response = await authService.resendVerification(getValues('email'))
      setStatusMessage(response.message || t('auth.verify.resent', 'Verification code has been resent.'))
      setTimeLeft(1800)
    } catch (error) {
      setError('root', {
        message: getErrorMessage(error, t('auth.verify.resend_failed', 'Failed to resend code.')),
      })
    } finally {
      setIsResending(false)
    }
  }

  return (
    <AuthFormShell
      eyebrow={t('auth.verify.eyebrow', 'Email Verification')}
      title={t('auth.verify.title', 'Verify your email')}
      description={t('auth.verify.description', 'We sent a verification code to your email. Enter it below before the timer expires.')}
      footerLinks={[{ label: t('auth.verify.login_link', 'Login'), to: '/auth/login' }]}
    >
      <form className="grid gap-5" onSubmit={handleSubmit(onSubmit)}>
        {statusMessage && <AuthFeedback tone="success" message={statusMessage} />}
        {errors.root && <AuthFeedback tone="error" message={errors.root.message ?? ''} />}

        <div className="flex items-center justify-center gap-2 text-xs text-[var(--muted)]">
          <span>{t('auth.verify.expires_in', 'Code expires in')}</span>
          <span className="rounded-md border border-[var(--border)] bg-[var(--muted-surface)] px-2.5 py-1 font-mono text-[var(--muted-strong)]">
            {isExpired ? t('auth.verify.expired', 'Expired') : `${minutes}:${seconds}`}
          </span>
        </div>

        <AuthField
          label={t('auth.email', 'Email')}
          type="email"
          placeholder="user@example.com"
          error={errors.email?.message}
          {...register('email')}
        />

        <AuthField
          label={t('auth.verify.code_label', 'Verification code')}
          placeholder={t('auth.reset.code_placeholder', 'Code from email')}
          error={errors.code?.message}
          className="min-h-12 text-center font-mono tracking-[0.35em] uppercase"
          {...register('code')}
        />

        <div className="flex flex-wrap gap-3">
          <Button size="lg" type="submit" disabled={isSubmitting || isExpired} className="flex-1">
            {isSubmitting ? t('auth.verify.verifying', 'Verifying...') : t('auth.verify.button', 'Verify email')}
          </Button>
          <Button type="button" variant="secondary" disabled={isResending} onClick={handleResend} className="flex-1">
            {isResending ? t('auth.verify.resending', 'Resending...') : t('auth.verify.resend', 'Resend code')}
          </Button>
        </div>

        {isExpired && (
          <AuthFeedback tone="info" message={t('auth.verify.expired_message', 'Your verification code has expired. Please request a new one.')} />
        )}
      </form>
    </AuthFormShell>
  )
}
