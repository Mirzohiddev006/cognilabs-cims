import api from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-error";
import useAuthStore, { getRefreshToken } from "@/stores/useAuthStore";
import type {
  AuthResponse,
  EmailVerificationPayload,
  LoginPayload,
  RegisterPayload,
  User,
} from "@/types/auth";

export interface SuccessResponse {
  success: boolean;
  message: string;
}

export async function registerUser(
  payload: RegisterPayload,
): Promise<SuccessResponse> {
  const { data } = await api.post<SuccessResponse>("/auth/register", payload);
  return data;
}

export async function loginUser({
  email,
  password,
}: LoginPayload): Promise<AuthResponse> {
  const formData = new URLSearchParams();
  formData.append("grant_type", "password");
  formData.append("username", email);
  formData.append("password", password);
  formData.append("scope", "");
  formData.append("client_id", "");
  formData.append("client_secret", "");

  const response = await api.post<AuthResponse>(
    "/auth/login",
    formData.toString(),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    },
  );

  return response.data;
}

export async function fetchCurrentUser(): Promise<User> {
  const { data } = await api.get<User>("/auth/me");
  return data;
}

export async function verifyOtp(
  email: string,
  code: string,
): Promise<AuthResponse> {
  const payload: EmailVerificationPayload = { email, code };
  const { data } = await api.post<AuthResponse>("/auth/verify-email", payload);
  return data;
}

export async function resendVerificationCode(
  email: string,
): Promise<SuccessResponse> {
  const { data } = await api.post<SuccessResponse>(
    "/auth/resend-verification",
    {
      email,
    },
  );
  return data;
}

export async function requestPasswordReset(
  email: string,
): Promise<SuccessResponse> {
  const { data } = await api.post<SuccessResponse>("/auth/forgot-password", {
    email,
  });
  return data;
}

export async function resetPassword(payload: {
  email: string;
  code: string;
  new_password: string;
}): Promise<SuccessResponse> {
  const { data } = await api.post<SuccessResponse>(
    "/auth/reset-password",
    payload,
  );
  return data;
}

export async function logoutUser() {
  const refreshToken = getRefreshToken();

  try {
    if (refreshToken) {
      await api.post<SuccessResponse>("/auth/logout", {
        refresh_token: refreshToken,
      });
    }
  } catch (error) {
    return {
      success: false,
      message: getApiErrorMessage(error, "Logout failed"),
    };
  } finally {
    useAuthStore.getState().logout();
  }

  return { success: true, message: "Logged out" };
}

export async function logoutAllSessions(): Promise<SuccessResponse> {
  const { data } = await api.post<SuccessResponse>("/auth/logout-all");
  useAuthStore.getState().logout();
  return data;
}

export async function fetchDashboardRedirectUrl(): Promise<string> {
  const { data } = await api.get<{ redirect_url: string }>(
    "/auth/dashboard-redirect",
  );
  return data.redirect_url;
}
