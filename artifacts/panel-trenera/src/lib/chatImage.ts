/** An image sent in the chat: what is allowed, and the three steps that put it in the object storage. */

export const CHAT_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"];

/** A Polish error message, or null when the file may be sent. */
export function chatImageProblem(file: { type: string; size: number }): string | null {
  if (!ALLOWED.includes(file.type.toLowerCase())) return "Wybierz zdjęcie w formacie JPG, PNG, WebP, GIF lub HEIC.";
  if (file.size <= 0) return "Ten plik jest pusty.";
  if (file.size > CHAT_IMAGE_MAX_BYTES) return "Zdjęcie może mieć najwyżej 10 MB.";
  return null;
}

export interface UploadedChatImage {
  objectPath: string;
  previewUrl: string | null;
}

/** Asks for an upload address, puts the file there and returns the path the message refers to. */
export async function uploadChatImage(file: File, fetchFn: typeof fetch = fetch): Promise<UploadedChatImage> {
  const problem = chatImageProblem(file);
  if (problem) throw new Error(problem);
  const start = await fetchFn("/api/objects/upload", { method: "POST", headers: { "Content-Type": "application/json" } });
  if (!start.ok) throw new Error("Nie udało się przygotować przesyłania zdjęcia.");
  const { uploadURL, objectPath, previewUrl } = (await start.json()) as { uploadURL: string; objectPath: string; previewUrl?: string | null };
  const put = await fetchFn(uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
  if (!put.ok) throw new Error("Nie udało się przesłać zdjęcia. Spróbuj ponownie.");
  return { objectPath, previewUrl: previewUrl ?? null };
}
