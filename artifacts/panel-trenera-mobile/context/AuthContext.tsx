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
  login: (email: string, password: string) => Promise<void>;
  register: (firstName: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Persisted flag so we can show biometric login when a session likely exists.
// The native HTTP cookie store (NSHTTPCookieStorage / Android CookieManager)
// manages the actual session cookie automatically when credentials:"include" is used.
export const HAS_SESSION_KEY = "pt_has_session";
const ONBOARDING_DONE_KEY = "pt_onboarding_done";

export async function markOnboardingDone(): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.setItem(ONBOARDING_DONE_KEY, "true");
    return;
  }
  await SecureStore.setItemAsync(ONBOARDING_DONE_KEY, "true");
}

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

export async function hasStoredSession(): Promise<boolean> {
  if (Platform.OS === "web") return !!localStorage.getItem(HAS_SESSION_KEY);
  const val = await SecureStore.getItemAsync(HAS_SESSION_KEY);
  return val === "true";
}

async function setStoredSession(value: boolean): Promise<void> {
  if (Platform.OS === "web") {
    value ? localStorage.setItem(HAS_SESSION_KEY, "true") : localStorage.removeItem(HAS_SESSION_KEY);
    return;
  }
  if (value) {
    await SecureStore.setItemAsync(HAS_SESSION_KEY, "true");
  } else {
    await SecureStore.deleteItemAsync(HAS_SESSION_KEY);
  }
}

// All API requests use credentials:"include" so the native HTTP client and
// browser cookie store can manage the session cookie automatically.
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  return fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });
}

async function registerPushToken(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== "granted") {
      const { status: requested } = await Notifications.requestPermissionsAsync();
      status = requested;
    }
    if (status !== "granted") return;
    const pushToken = await Notifications.getExpoPushTokenAsync();
    await apiFetch("/api/push-tokens", {
      method: "POST",
      body: JSON.stringify({ token: pushToken.data, platform: Platform.OS }),
    });
  } catch {
    // push tokens are optional — fail silently
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const res = await apiFetch("/api/auth/user");
      if (res.ok) {
        const data: User = await res.json();
        setUser(data);
      } else {
        setUser(null);
        await setStoredSession(false);
      }
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await refreshUser();
      setIsLoading(false);
    })();
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiFetch("/api/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { message?: string };
      throw new Error(err.message ?? "Nieprawidłowe dane logowania");
    }
    const data: User = await res.json();
    setUser(data);
    await setStoredSession(true);
    void registerPushToken();
  }, []);

  const register = useCallback(async (firstName: string, email: string, password: string) => {
    const res = await apiFetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ firstName, email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { message?: string };
      throw new Error(err.message ?? "Nie udało się zarejestrować konta");
    }
    const data: User = await res.json();
    setUser(data);
    await setStoredSession(true);
    void registerPushToken();
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiFetch("/api/logout", { method: "POST" });
    } catch { /* ignore */ }
    setUser(null);
    await setStoredSession(false);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
