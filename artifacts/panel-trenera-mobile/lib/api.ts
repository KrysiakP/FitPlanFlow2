import { apiFetch } from "@/context/AuthContext";

export async function apiGet<T>(path: string): Promise<T> {
  const res = await apiFetch(path);
  if (!res.ok) throw new Error(`API ${path} error: ${res.status}`);
  return res.json();
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await apiFetch(path, { method: "POST", body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`API ${path} error: ${res.status}`);
  return res.json();
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const res = await apiFetch(path, { method: "PUT", body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`API ${path} error: ${res.status}`);
  return res.json();
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await apiFetch(path, { method: "PATCH", body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`API ${path} error: ${res.status}`);
  return res.json();
}

export async function apiDelete<T = void>(path: string): Promise<T> {
  const res = await apiFetch(path, { method: "DELETE" });
  if (!res.ok) throw new Error(`API ${path} error: ${res.status}`);
  if (res.status === 204) return undefined as T;
  return res.json();
}
