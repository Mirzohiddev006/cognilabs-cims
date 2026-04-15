import { z } from 'zod'

const emailSchema = z
  .string()
  .min(1, 'Email majburiy')
  .email('Email formati noto\'g\'ri')

const passwordSchema = z
  .string()
  .min(1, 'Parol majburiy')
  .min(6, 'Parol kamida 6 ta belgi bo\'lishi kerak')

export const loginSchema = z.object({
  username: emailSchema,
  password: passwordSchema,
})

export type LoginSchema = z.infer<typeof loginSchema>

export const registerSchema = z.object({
  email: emailSchema,
  name: z.string().min(1, 'Ism majburiy'),
  surname: z.string().min(1, 'Familiya majburiy'),
  password: passwordSchema,
  company_code: z.string().min(1, 'Kompaniya kodi majburiy'),
  telegram_id: z.string().optional(),
  job_title: z.string().optional(),
  role: z.string().min(1, 'Rol majburiy'),
})

export type RegisterSchema = z.infer<typeof registerSchema>

export const verifyEmailSchema = z.object({
  email: emailSchema,
  code: z.string().min(1, 'Tasdiqlash kodi majburiy'),
})

export type VerifyEmailSchema = z.infer<typeof verifyEmailSchema>

export const forgotPasswordSchema = z.object({
  email: emailSchema,
})

export type ForgotPasswordSchema = z.infer<typeof forgotPasswordSchema>

export const resetPasswordSchema = z
  .object({
    email: emailSchema,
    code: z.string().min(1, 'Reset kodi majburiy'),
    new_password: passwordSchema,
    confirm_password: z.string().min(1, 'Parolni tasdiqlash majburiy'),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'Parollar mos kelmaydi',
    path: ['confirm_password'],
  })

export type ResetPasswordSchema = z.infer<typeof resetPasswordSchema>
