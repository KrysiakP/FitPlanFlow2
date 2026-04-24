import { apiFetch } from "@/context/AuthContext";

export async function apiGet<T>(path: string, token?: string | null): Promise<T> {
  const res = await apiFetch(path, {}, token);
  if (!res.ok) throw new Error(`API ${path} error: ${res.status}`);
  return res.json();
}

export async function apiPost<T>(path: string, body: unknown, token?: string | null): Promise<T> {
  const res = await apiFetch(path, { method: "POST", body: JSON.stringify(body) }, token);
  if (!res.ok) throw new Error(`API ${path} error: ${res.status}`);
  return res.json();
}

export async function apiPatch<T>(path: string, body: unknown, token?: string | null): Promise<T> {
  const res = await apiFetch(path, { method: "PATCH", body: JSON.stringify(body) }, token);
  if (!res.ok) throw new Error(`API ${path} error: ${res.status}`);
  return res.json();
}
