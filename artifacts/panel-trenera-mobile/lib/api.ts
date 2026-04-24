import { apiFetch } from "@/context/AuthContext";

export async function apiGet<T>(path: string, cookie?: string | null): Promise<T> {
  const res = await apiFetch(path, {}, cookie);
  if (!res.ok) throw new Error(`API ${path} error: ${res.status}`);
  return res.json();
}

export async function apiPost<T>(path: string, body: unknown, cookie?: string | null): Promise<T> {
  const res = await apiFetch(path, { method: "POST", body: JSON.stringify(body) }, cookie);
  if (!res.ok) throw new Error(`API ${path} error: ${res.status}`);
  return res.json();
}

export async function apiPatch<T>(path: string, body: unknown, cookie?: string | null): Promise<T> {
  const res = await apiFetch(path, { method: "PATCH", body: JSON.stringify(body) }, cookie);
  if (!res.ok) throw new Error(`API ${path} error: ${res.status}`);
  return res.json();
}
