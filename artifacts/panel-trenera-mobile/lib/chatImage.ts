/** What may be sent as an image in the chat (the server stores it as `/objects/uploads/<uuid>`). */

export const CHAT_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"];

/** A Polish error message, or null when the picked image may be sent. A missing size or type is let through (the picker does not always know it). */
export function chatImageProblem(asset: { mimeType?: string | null; fileSize?: number | null }): string | null {
  if (asset.mimeType && !ALLOWED.includes(asset.mimeType.toLowerCase())) return "Wybierz zdjęcie w formacie JPG, PNG, WebP, GIF lub HEIC.";
  if (typeof asset.fileSize === "number" && asset.fileSize > CHAT_IMAGE_MAX_BYTES) return "Zdjęcie może mieć najwyżej 10 MB.";
  return null;
}

/** The address an image of a message is loaded from: our own objects need the server address (and a token), local files are used as they are. */
export function chatImageSource(attachmentUrl: string, baseUrl: string): { uri: string; needsAuth: boolean } {
  return attachmentUrl.startsWith("/objects/") ? { uri: `${baseUrl}${attachmentUrl}`, needsAuth: true } : { uri: attachmentUrl, needsAuth: false };
}
