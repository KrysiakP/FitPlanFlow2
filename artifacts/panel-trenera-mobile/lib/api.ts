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

export async function uploadImageToObjectStorage(
  imageUri: string,
  mimeType: string = "image/jpeg"
): Promise<{ objectPath: string; previewUrl: string }> {
  const uploadInfoRes = await apiFetch("/api/objects/upload", { method: "POST" });
  if (!uploadInfoRes.ok) throw new Error(`Nie udało się uzyskać URL uploadu: ${uploadInfoRes.status}`);
  const { uploadURL, objectPath, previewUrl } = await uploadInfoRes.json() as {
    uploadURL: string;
    objectPath: string;
    previewUrl: string;
  };

  const imageRes = await fetch(imageUri);
  const blob = await imageRes.blob();

  const s3Res = await fetch(uploadURL, {
    method: "PUT",
    body: blob,
    headers: { "Content-Type": mimeType },
  });
  if (!s3Res.ok) throw new Error(`Upload do storage nieudany: ${s3Res.status}`);

  return { objectPath, previewUrl };
}

export async function setReportPhoto(reportId: string, objectPath: string): Promise<void> {
  const res = await apiFetch(`/api/weekly-reports/${reportId}/photos`, {
    method: "PUT",
    body: JSON.stringify({ photoUrl: objectPath }),
  });
  if (!res.ok) throw new Error(`Nie udało się zapisać zdjęcia do raportu: ${res.status}`);
}
