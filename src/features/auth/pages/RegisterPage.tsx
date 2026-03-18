import { startTransition, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import type { RegisterPayload } from '../../../shared/api/services/auth.service'
import { authService } from '../../../shared/api/services/auth.service'
import { Button } from '../../../shared/ui/button'
import { SelectField } from '../../../shared/ui/select-field'
import { AuthFeedback } from '../components/AuthFeedback'
import { AuthField } from '../components/AuthField'
import { AuthFormShell } from '../components/AuthFormShell'
import { PasswordField } from '../components/PasswordField'
import { extractFieldErrors, getErrorMessage } from '../lib/formErrors'
import { validateRegister } from '../lib/validators'

const initialValues: RegisterPayload = {
  email: '',
  name: '',
  surname: '',
  password: '',
  company_code: 'oddiy',
  telegram_id: '',
  job_title: '',
  role: 'Customer',
}

const roleOptions = ['Customer', 'SalesManager', 'Finance', 'CEO']

export function RegisterPage() {
  const navigate = useNavigate()
  const [values, setValues] = useState<RegisterPayload>(initialValues)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const validationErrors = validateRegister(values)
    setErrors(validationErrors)
    setSubmitError('')

    if (Object.keys(validationErrors).length > 0) {
      return
    }

    setIsSubmitting(true)

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
            statusMessage: 'Registration successful. Please enter the code sent to your email.',
          },
        }),
      )
    } catch (error) {
      setErrors(extractFieldErrors(error))
      setSubmitError(getErrorMessage(error, 'Registration failed.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthFormShell
      eyebrow="Auth / Register"
      title="Create new account"
      description="Register with your email, company code, and role to join the workspace."
      footerLinks={[
        { label: 'Login', to: '/auth/login' },
        { label: 'Verify email', to: '/auth/verify-email' },
      ]}
    >
      <form className="grid gap-5" onSubmit={handleSubmit}>
        <AuthFeedback tone="error" message={submitError} />

        <div className="grid gap-5 md:grid-cols-2">
          <AuthField
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="user@example.com"
            value={values.email}
            error={errors.email}
            onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))}
          />
          <AuthField
            label="Company code"
            name="company_code"
            placeholder="oddiy"
            value={values.company_code}
            error={errors.company_code}
            onChange={(event) => setValues((current) => ({ ...current, company_code: event.target.value }))}
          />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <AuthField
            label="Name"
            name="name"
            autoComplete="given-name"
            placeholder="Ibrohim"
            value={values.name}
            error={errors.name}
            onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
          />
          <AuthField
            label="Surname"
            name="surname"
            autoComplete="family-name"
            placeholder="Ibrohimjonov"
            value={values.surname}
            error={errors.surname}
            onChange={(event) => setValues((current) => ({ ...current, surname: event.target.value }))}
          />
        </div>

        <PasswordField
          label="Password"
          name="password"
          autoComplete="new-password"
          placeholder="Minimum 6 characters"
          value={values.password}
          error={errors.password}
          onChange={(event) => setValues((current) => ({ ...current, password: event.target.value }))}
        />

        <div className="grid gap-5 md:grid-cols-3">
          <AuthField
            label="Telegram ID"
            name="telegram_id"
            placeholder="@username or ID"
            value={values.telegram_id}
            error={errors.telegram_id}
            onChange={(event) => setValues((current) => ({ ...current, telegram_id: event.target.value }))}
          />
          <AuthField
            label="Job title"
            name="job_title"
            placeholder="Sales Manager"
            value={values.job_title ?? ''}
            error={errors.job_title}
            onChange={(event) => setValues((current) => ({ ...current, job_title: event.target.value }))}
          />

          <label className="grid gap-2">
            <span className="text-xs font-bold text-white tracking-tight">Role</span>
            <SelectField
              value={values.role}
              onValueChange={(value) => setValues((current) => ({ ...current, role: value }))}
              options={roleOptions.map((role) => ({ value: role, label: role }))}
              className="min-h-12 rounded-xl px-4"
            />
          </label>
        </div>

        <Button size="lg" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Processing...' : 'Register'}
        </Button>
      </form>
    </AuthFormShell>
  )
}
