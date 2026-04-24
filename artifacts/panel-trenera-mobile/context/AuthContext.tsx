import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import * as SecureStore from "expo-secure-store";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "trainer" | "client" | null;
  profileImageUrl?: string | null;
  subscriptionStatus?: string | null;
  subscriptionTier?: string | null;
  trialEndsAt?: string | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  bearerToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = "pt_mobile_token";
const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

async function getStoredToken(): Promise<string | null> {
  if (Platform.OS === "web") return localStorage.getItem(TOKEN_KEY);
  return SecureStore.getItemAsync(TOKEN_KEY);
}

async function storeToken(token: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.setItem(TOKEN_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

async function clearToken(): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.removeItem(TOKEN_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function apiFetch(
  path: string,
  options: RequestInit = {},
  token?: string | null
): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: "omit",
  });
}

async function registerPushToken(token: string | null): Promise<void> {
  if (Platform.OS === "web" || !token) return;
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== "granted") {
      const { status: requested } = await Notifications.requestPermissionsAsync();
      status = requested;
    }
    if (status !== "granted") return;
    const pushToken = await Notifications.getExpoPushTokenAsync();
    await apiFetch(
      "/api/push-tokens",
      { method: "POST", body: JSON.stringify({ token: pushToken.data, platform: Platform.OS }) },
      token
    );
  } catch {
    // push tokens are optional — fail silently
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [bearerToken, setBearerToken] = useState<string | null>(null);

  const fetchUser = useCallback(async (token: string | null) => {
    if (!token) {
      setUser(null);
      return;
    }
    try {
      const res = await apiFetch("/api/auth/user", {}, token);
      if (res.ok) {
        const data: User = await res.json();
        setUser(data);
      } else {
        setUser(null);
        setBearerToken(null);
        await clearToken();
      }
    } catch {
      setUser(null);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const token = await getStoredToken();
    await fetchUser(token);
  }, [fetchUser]);

  useEffect(() => {
    void (async () => {
      const token = await getStoredToken();
      setBearerToken(token);
      await fetchUser(token);
      setIsLoading(false);
    })();
  }, [fetchUser]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiFetch("/api/auth/mobile-login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { message?: string };
      throw new Error(err.message ?? "Nieprawidłowe dane logowania");
    }
    const data = await res.json() as { token: string; user: User };
    await storeToken(data.token);
    setBearerToken(data.token);
    setUser(data.user);
    void registerPushToken(data.token);
  }, []);

  const logout = useCallback(async () => {
    try {
      if (bearerToken) {
        await apiFetch("/api/auth/mobile-logout", { method: "POST" }, bearerToken);
      }
    } catch { /* ignore */ }
    setUser(null);
    setBearerToken(null);
    await clearToken();
  }, [bearerToken]);

  return (
    <AuthContext.Provider value={{ user, isLoading, bearerToken, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
