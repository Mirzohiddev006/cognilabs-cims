export type PermissionMap = Record<string, boolean>;

export interface User {
  id: string;
  email: string;
  name: string;
  surname: string;
  company_code?: string | null;
  telegram_id?: string | null;
  role: string;
  is_active?: boolean;
  default_salary?: number | null;
  permissions?: PermissionMap;
}

export interface AuthTokens {
  access_token: string;
  refresh_token?: string | null;
  token_type?: string;
  expires_in?: number;
}

export interface AuthResponse extends AuthTokens {
  user?: User;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  name: string;
  surname: string;
  company_code: string;
  telegram_id?: string;
  role: string;
}

export interface EmailVerificationPayload {
  email: string;
  code: string;
}
