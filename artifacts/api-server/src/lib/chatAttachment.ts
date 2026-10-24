/** A chat message may carry one image: an object uploaded through /api/objects/upload (`/objects/uploads/<uuid>`). */

export const ATTACHMENT_PATH = /^\/objects\/uploads\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const CHAT_BODY_MAX = 5000;

export type ChatPayload = { ok: true; body: string; attachmentUrl: string | null } | { ok: false; message: string };

/** The text may be empty only when an image comes with it. */
export function checkChatPayload(body: unknown, attachmentUrl: unknown): ChatPayload {
  if (body !== undefined && typeof body !== "string") return { ok: false, message: "Treść wiadomości musi być tekstem" };
  if (attachmentUrl !== undefined && attachmentUrl !== null && typeof attachmentUrl !== "string") return { ok: false, message: "Nieprawidłowe zdjęcie" };
  const text = (body ?? "").trim();
  const attachment = typeof attachmentUrl === "string" && attachmentUrl !== "" ? attachmentUrl : null;
  if (text.length > CHAT_BODY_MAX) return { ok: false, message: "Wiadomość może mieć maksymalnie 5000 znaków" };
  if (attachment !== null && !ATTACHMENT_PATH.test(attachment)) return { ok: false, message: "Nieprawidłowe zdjęcie" };
  if (text === "" && attachment === null) return { ok: false, message: "Wiadomość nie może być pusta" };
  return { ok: true, body: text, attachmentUrl: attachment };
}
