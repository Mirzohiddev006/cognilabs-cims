import { request } from '../http'
import type { CurrentUser, SuccessResponse, TokenResponse, UserRole } from '../types'

export type RegisterPayload = {
  email: string
  name: string
  surname: string
  password: string
  company_code: string
  telegram_id?: string
  role: UserRole
  job_title?: string
}

export type VerifyEmailPayload = {
  email: string
  code: string
}

export type LoginPayload = {
  username: string
  password: string
  scope?: string
  client_id?: string
  client_secret?: string
}

export type ResetPasswordPayload = {
  email: string
  code: string
  new_password: string
}

export const authService = {
  register(payload: RegisterPayload) {
    return request<SuccessResponse>({
      path: '/auth/register',
      method: 'POST',
      body: payload,
      auth: false,
    })
  },

  verifyEmail(payload: VerifyEmailPayload) {
    return request<TokenResponse>({
      path: '/auth/verify-email',
      method: 'POST',
      body: payload,
      auth: false,
    })
  },

  resendVerification(email: string) {
    return request<SuccessResponse>({
      path: '/auth/resend-verification',
      method: 'POST',
      body: { email },
      auth: false,
    })
  },

  login(payload: LoginPayload) {
    const body = new URLSearchParams({
      username: payload.username,
      password: payload.password,
      grant_type: 'password',
      scope: payload.scope ?? '',
      client_id: payload.client_id ?? '',
      client_secret: payload.client_secret ?? '',
    })

    return request<TokenResponse>({
      path: '/auth/login',
      method: 'POST',
      body: body.toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      auth: false,
    })
  },

  forgotPassword(email: string) {
    return request<SuccessResponse>({
      path: '/auth/forgot-password',
      method: 'POST',
      body: { email },
      auth: false,
    })
  },

  resetPassword(payload: ResetPasswordPayload) {
    return request<SuccessResponse>({
      path: '/auth/reset-password',
      method: 'POST',
      body: payload,
      auth: false,
    })
  },

  me() {
    return request<CurrentUser>({
      path: '/auth/me',
    })
  },

  refresh(refreshToken: string) {
    return request<TokenResponse>({
      path: '/auth/refresh',
      method: 'POST',
      body: { refresh_token: refreshToken },
      auth: false,
    })
  },

  logout(refreshToken: string) {
    return request<SuccessResponse>({
      path: '/auth/logout',
      method: 'POST',
      body: { refresh_token: refreshToken },
    })
  },

  logoutAll() {
    return request<SuccessResponse>({
      path: '/auth/logout-all',
      method: 'POST',
    })
  },

  dashboardRedirect() {
    return request<{ redirect_url: string }>({
      path: '/auth/dashboard-redirect',
    })
  },
}
