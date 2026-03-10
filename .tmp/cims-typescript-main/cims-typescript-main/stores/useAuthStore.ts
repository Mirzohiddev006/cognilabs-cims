import { create } from "zustand";
import type { User } from "@/types/auth";
import api from "@/lib/api";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  loading: boolean;
  error: string | null;
  setUser: (u: User | null) => void;
  setToken: (token: string | null) => void;
  setRefreshToken: (token: string | null) => void;
  setTokens: (accessToken: string | null, refreshToken?: string | null) => void;
  setLoading: (v: boolean) => void;
  logout: () => void;
  fetchUser: () => Promise<User | null>;
}

const ACCESS_TOKEN_KEY = "token";
const REFRESH_TOKEN_KEY = "refreshToken";

const useAuthStore = create<AuthState>((set, get) => {
  // Init token only once (client-side only)
  let initialAccessToken: string | null = null;
  let initialRefreshToken: string | null = null;
  if (typeof window !== "undefined") {
    initialAccessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    initialRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  // Stable functions
  const setUser = (user: User | null) => {
    set({ user });
  };

  const setToken = (accessToken: string | null) => {
    set({ accessToken });
    if (typeof window !== "undefined") {
      if (accessToken) {
        localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      } else {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
      }
    }
  };

  const setRefreshToken = (refreshToken: string | null) => {
    set({ refreshToken });
    if (typeof window !== "undefined") {
      if (refreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      } else {
        localStorage.removeItem(REFRESH_TOKEN_KEY);
      }
    }
  };

  const setTokens = (
    accessToken: string | null,
    refreshToken?: string | null,
  ) => {
    setToken(accessToken);
    if (refreshToken !== undefined) {
      setRefreshToken(refreshToken);
    }
  };

  const setLoading = (loading: boolean) => {
    set({ loading });
  };

  const logout = () => {
    set({ user: null, accessToken: null, refreshToken: null, error: null });
    if (typeof window !== "undefined") {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  };

  const fetchUser = async () => {
    set({ loading: true, error: null });
    try {
      const res = await api.get("/auth/me"); // token auto-injected
      set({ user: res.data });
      return res.data;
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Failed to fetch current user";
      set({ error: message });
      if (
        typeof e === "object" &&
        e !== null &&
        "response" in e &&
        typeof e.response === "object" &&
        e.response !== null &&
        "status" in e.response &&
        e.response.status === 401
      ) {
        get().logout();
      }
      return null;
    } finally {
      set({ loading: false });
    }
  };

  return {
    user: null,
    accessToken: initialAccessToken,
    refreshToken: initialRefreshToken,
    loading: false,
    error: null,
    setUser,
    setToken,
    setRefreshToken,
    setTokens,
    setLoading,
    logout,
    fetchUser,
  };
});

export function getAuthToken() {
  return useAuthStore.getState().accessToken;
}

export function getRefreshToken() {
  return useAuthStore.getState().refreshToken;
}

export default useAuthStore;
