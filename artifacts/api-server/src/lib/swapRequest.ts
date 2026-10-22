/** Input rules for exercise swap requests: what the client writes and what the trainer answers. */

export const REASON_MIN = 3;
export const REASON_MAX = 300;
export const NAME_MIN = 2;
export const NAME_MAX = 255;
export const NOTE_MAX = 300;

const clean = (value: unknown): string | null => (typeof value === "string" ? value.replace(/\s+/g, " ").trim() : null);

/** The client's reason ("kolano boli", "zajęta maszyna"), 3-300 characters on one line; null when it does not qualify. */
export function validateReason(value: unknown): string | null {
  const text = clean(value);
  return text !== null && text.length >= REASON_MIN && text.length <= REASON_MAX ? text : null;
}

export function validateReplacement(value: unknown): string | null {
  const text = clean(value);
  return text !== null && text.length >= NAME_MIN && text.length <= NAME_MAX ? text : null;
}

/** The optional note of the trainer: empty is fine (null), too long is not (undefined = invalid). */
export function validateNote(value: unknown): string | null | undefined {
  if (value === undefined || value === null || value === "") return null;
  const text = clean(value);
  if (text === null) return undefined;
  if (text === "") return null;
  return text.length <= NOTE_MAX ? text : undefined;
}

export type SwapDecision = "approve" | "reject";

export function isDecision(value: unknown): value is SwapDecision {
  return value === "approve" || value === "reject";
}
