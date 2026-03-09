import type { RegisterPayload } from '../../../shared/api/services/auth.service'
import type { FieldErrors } from './formErrors'

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function requireValue(value: string, message: string) {
  return value.trim() ? '' : message
}

function validateEmail(email: string) {
  if (!email.trim()) {
    return 'Email majburiy.'
  }

  if (!emailRegex.test(email.trim())) {
    return "Email formati noto'g'ri."
  }

  return ''
}

function validatePassword(password: string) {
  if (!password.trim()) {
    return 'Parol majburiy.'
  }

  if (password.length < 6) {
    return "Parol kamida 6 ta belgidan iborat bo'lsin."
  }

  return ''
}

export function validateLogin(values: { username: string; password: string }) {
  const errors: FieldErrors = {}

  const emailError = validateEmail(values.username)
  const passwordError = validatePassword(values.password)

  if (emailError) {
    errors.username = emailError
  }

  if (passwordError) {
    errors.password = passwordError
  }

  return errors
}

export function validateRegister(values: RegisterPayload) {
  const errors: FieldErrors = {}

  const emailError = validateEmail(values.email)
  const nameError = requireValue(values.name, 'Ism majburiy.')
  const surnameError = requireValue(values.surname, 'Familiya majburiy.')
  const passwordError = validatePassword(values.password)
  const companyCodeError = requireValue(values.company_code, 'Company code majburiy.')

  if (emailError) {
    errors.email = emailError
  }

  if (nameError) {
    errors.name = nameError
  }

  if (surnameError) {
    errors.surname = surnameError
  }

  if (passwordError) {
    errors.password = passwordError
  }

  if (companyCodeError) {
    errors.company_code = companyCodeError
  }

  return errors
}

export function validateVerification(values: { email: string; code: string }) {
  const errors: FieldErrors = {}

  const emailError = validateEmail(values.email)
  const codeError = requireValue(values.code, 'Tasdiqlash kodi majburiy.')

  if (emailError) {
    errors.email = emailError
  }

  if (codeError) {
    errors.code = codeError
  }

  return errors
}

export function validateEmailOnly(email: string) {
  const emailError = validateEmail(email)
  const errors: FieldErrors = {}

  if (emailError) {
    errors.email = emailError
  }

  return errors
}

export function validateResetPassword(values: {
  email: string
  code: string
  new_password: string
  confirm_password: string
}) {
  const errors: FieldErrors = {}

  const emailError = validateEmail(values.email)
  const codeError = requireValue(values.code, 'Reset kodi majburiy.')
  const passwordError = validatePassword(values.new_password)

  if (emailError) {
    errors.email = emailError
  }

  if (codeError) {
    errors.code = codeError
  }

  if (passwordError) {
    errors.new_password = passwordError
  }

  if (!values.confirm_password.trim()) {
    errors.confirm_password = "Parol tasdig'i majburiy."
  } else if (values.confirm_password !== values.new_password) {
    errors.confirm_password = 'Parollar mos emas.'
  }

  return errors
}
