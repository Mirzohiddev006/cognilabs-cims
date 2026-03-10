import type { AuthResponse, User as AuthUser } from "@/types/auth";

export interface CreateUserPayload {
  email: string;
  name: string;
  surname: string;
  role: string;
  password: string;
  telegram_id?: string;
  company_code?: string;
  default_salary?: number;
  is_active?: boolean;
}

export interface User extends AuthUser {
  created_at?: string;
  updated_at?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface RefreshTokenResponse {
  access_token: string;
}

export type { AuthResponse };
