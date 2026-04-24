import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import * as SecureStore from "expo-secure-store";
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
  sessionCookie: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const COOKIE_KEY = "pt_session_cookie";
const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

async function getStoredCookie(): Promise<string | null> {
  if (Platform.OS === "web") {
    return localStorage.getItem(COOKIE_KEY);
  }
  return SecureStore.getItemAsync(COOKIE_KEY);
}

async function storeCookie(cookie: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.setItem(COOKIE_KEY, cookie);
    return;
  }
  await SecureStore.setItemAsync(COOKIE_KEY, cookie);
}

async function clearCookie(): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.removeItem(COOKIE_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(COOKIE_KEY);
}

export async function apiFetch(
  path: string,
  options: RequestInit = {},
  cookie?: string | null
): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (cookie) {
    headers["Cookie"] = cookie;
  }
  return fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: Platform.OS === "web" ? "include" : "omit",
  });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionCookie, setSessionCookie] = useState<string | null>(null);

  const fetchUser = useCallback(async (cookie: string | null) => {
    if (!cookie && Platform.OS !== "web") {
      setUser(null);
      return;
    }
    try {
      const res = await apiFetch("/api/auth/user", {}, cookie);
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        setUser(null);
        setSessionCookie(null);
        await clearCookie();
      }
    } catch {
      setUser(null);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    await fetchUser(sessionCookie);
  }, [sessionCookie, fetchUser]);

  useEffect(() => {
    (async () => {
      const cookie = await getStoredCookie();
      setSessionCookie(cookie);
      await fetchUser(cookie);
      setIsLoading(false);
    })();
  }, [fetchUser]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Nieprawidłowe dane logowania");
    }
    let cookie: string | null = null;
    if (Platform.OS !== "web") {
      const setCookieHeader = res.headers.get("set-cookie");
      if (setCookieHeader) {
        cookie = setCookieHeader.split(";")[0];
        await storeCookie(cookie);
        setSessionCookie(cookie);
      }
    }
    const data = await res.json();
    setUser(data.user ?? data);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" }, sessionCookie);
    } catch { /* ignore */ }
    setUser(null);
    setSessionCookie(null);
    await clearCookie();
  }, [sessionCookie]);

  return (
    <AuthContext.Provider value={{ user, isLoading, sessionCookie, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
