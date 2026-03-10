import axios, {
  AxiosHeaders,
  type InternalAxiosRequestConfig,
} from "axios";
import useAuthStore, {
  getAuthToken,
  getRefreshToken,
} from "@/stores/useAuthStore";

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_API_BASE ?? "/backend";

const api = axios.create({
  baseURL: API_URL,
  timeout: 30_000,
});

const refreshClient = axios.create({
  baseURL: API_URL,
  timeout: 30_000,
});

const isAuthRoute = (url?: string) =>
  Boolean(
    url &&
      ["/auth/login", "/auth/register", "/auth/verify-email", "/auth/refresh"]
        .some((route) => url.includes(route)),
  );

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers = config.headers ?? new AxiosHeaders();
    if (config.headers instanceof AxiosHeaders) {
      config.headers.set("Authorization", `Bearer ${token}`);
    } else {
      (config.headers as Record<string, string>).Authorization =
        `Bearer ${token}`;
    }
  }
  return config;
});

let refreshing: Promise<string | null> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as RetryableRequestConfig | undefined;

    if (
      !original ||
      original._retry ||
      error.response?.status !== 401 ||
      isAuthRoute(original.url)
    ) {
      return Promise.reject(error);
    }

    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      useAuthStore.getState().logout();
      return Promise.reject(error);
    }

    original._retry = true;

    try {
      if (!refreshing) {
        refreshing = refreshClient
          .post("/auth/refresh", { refresh_token: refreshToken })
          .then((response) => {
            const newAccessToken = response.data?.access_token as
              | string
              | undefined;
            const newRefreshToken = response.data?.refresh_token as
              | string
              | undefined;

            if (!newAccessToken) {
              throw new Error("Refresh token flow returned no access token");
            }

            useAuthStore
              .getState()
              .setTokens(newAccessToken, newRefreshToken ?? refreshToken);

            return newAccessToken;
          })
          .finally(() => {
            refreshing = null;
          });
      }

      const newToken = await refreshing;
      if (!newToken) {
        useAuthStore.getState().logout();
        return Promise.reject(error);
      }

      original.headers = original.headers ?? new AxiosHeaders();
      if (original.headers instanceof AxiosHeaders) {
        original.headers.set("Authorization", `Bearer ${newToken}`);
      } else {
        (original.headers as Record<string, string>).Authorization =
          `Bearer ${newToken}`;
      }

      return api(original);
    } catch (refreshError) {
      useAuthStore.getState().logout();
      return Promise.reject(refreshError);
    }
  },
);

export default api;
