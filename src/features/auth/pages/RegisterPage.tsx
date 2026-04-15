import { startTransition } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { useLocale } from '../../../app/hooks/useLocale'
import { authService } from '../../../shared/api/services/auth.service'
import { extractFieldErrors, getErrorMessage } from '../../../shared/lib/error'
import { Button } from '../../../shared/ui/button'
import { SelectField } from '../../../shared/ui/select-field'
import { AuthFeedback } from '../components/AuthFeedback'
import { AuthField } from '../components/AuthField'
import { AuthFormShell } from '../components/AuthFormShell'
import { PasswordField } from '../components/PasswordField'
import { registerSchema, type RegisterSchema } from '../lib/schemas'

export function RegisterPage() {
  const { t } = useLocale()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RegisterSchema>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      name: '',
      surname: '',
      password: '',
      company_code: 'oddiy',
      telegram_id: '',
      job_title: '',
      role: 'Customer',
    },
  })

  async function onSubmit(values: RegisterSchema) {
    try {
      await authService.register({
        ...values,
        telegram_id: values.telegram_id?.trim() || undefined,
        job_title: values.job_title?.trim() || undefined,
      })

      startTransition(() =>
        navigate(`/auth/verify-email?email=${encodeURIComponent(values.email)}`, {
          replace: true,
          state: {
            statusMessage: t('auth.register.success', 'Registration successful. Please enter the code sent to your email.'),
          },
        }),
      )
    } catch (error) {
      const fieldErrors = extractFieldErrors(error)

      if (Object.keys(fieldErrors).length > 0) {
        for (const [field, message] of Object.entries(fieldErrors)) {
          setError(field as keyof RegisterSchema, { message })
        }
      } else {
        setError('root', {
          message: getErrorMessage(error, t('auth.register.failed', 'Registration failed.')),
        })
      }
    }
  }

  const roleOptions = [
    { value: 'Customer', label: t('auth.role.customer', 'Customer') },
    { value: 'SalesManager', label: t('auth.role.sales_manager', 'Sales Manager') },
    { value: 'Finance', label: t('auth.role.finance', 'Finance') },
    { value: 'CEO', label: t('auth.role.ceo', 'CEO') },
  ]

  return (
    <AuthFormShell
      eyebrow={t('auth.register.eyebrow', 'Auth / Register')}
      title={t('auth.register.title', 'Create new account')}
      description={t('auth.register.description', 'Register with your email, company code, and role to join the workspace.')}
      footerLinks={[
        { label: t('auth.login_button', 'Login'), to: '/auth/login' },
        { label: t('auth.verify_email', 'Verify email'), to: '/auth/verify-email' },
      ]}
    >
      <form className="grid gap-5" onSubmit={handleSubmit(onSubmit)}>
        {errors.root && <AuthFeedback tone="error" message={errors.root.message ?? ''} />}

        <div className="grid gap-5 md:grid-cols-2">
          <AuthField
            label={t('auth.email', 'Email')}
            name="email"
            type="email"
            autoComplete="email"
            placeholder="user@example.com"
            error={errors.email?.message}
            {...register('email')}
          />
          <AuthField
            label={t('auth.register.company_code', 'Company code')}
            name="company_code"
            placeholder="oddiy"
            error={errors.company_code?.message}
            {...register('company_code')}
          />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <AuthField
            label={t('auth.register.name', 'Name')}
            name="name"
            autoComplete="given-name"
            placeholder="Ibrohim"
            error={errors.name?.message}
            {...register('name')}
          />
          <AuthField
            label={t('auth.register.surname', 'Surname')}
            name="surname"
            autoComplete="family-name"
            placeholder="Ibrohimjonov"
            error={errors.surname?.message}
            {...register('surname')}
          />
        </div>

        <PasswordField
          label={t('auth.password', 'Password')}
          name="password"
          autoComplete="new-password"
          placeholder={t('auth.register.password_placeholder', 'Minimum 6 characters')}
          error={errors.password?.message}
          {...register('password')}
        />

        <div className="grid gap-5 md:grid-cols-3">
          <AuthField
            label={t('auth.register.telegram_id', 'Telegram ID')}
            name="telegram_id"
            placeholder={t('auth.register.telegram_placeholder', '@username or ID')}
            error={errors.telegram_id?.message}
            {...register('telegram_id')}
          />
          <AuthField
            label={t('auth.register.job_title', 'Job title')}
            name="job_title"
            placeholder={t('auth.register.job_title_placeholder', 'Sales Manager')}
            error={errors.job_title?.message}
            {...register('job_title')}
          />

          <label className="grid gap-2">
            <span className="text-xs font-bold text-white tracking-tight">{t('auth.register.role', 'Role')}</span>
            <Controller
              control={control}
              name="role"
              render={({ field }) => (
                <SelectField
                  value={field.value}
                  onValueChange={field.onChange}
                  options={roleOptions}
                  className="min-h-12 rounded-xl px-4"
                />
              )}
            />
            {errors.role && (
              <span className="text-[11px] font-bold uppercase tracking-wider text-red-500">
                {errors.role.message}
              </span>
            )}
          </label>
        </div>

        <Button size="lg" type="submit" disabled={isSubmitting}>
          {isSubmitting ? t('auth.register.processing', 'Processing...') : t('auth.register.button', 'Register')}
        </Button>
      </form>
    </AuthFormShell>
  )
}
