/** A trainer's reminder is due on a calendar day (Warsaw time); the push goes out in the morning job of that day or later. */

export const MAX_REMINDER_TEXT = 200;

export function warsawDayKey(value: Date | string): string {
  return new Date(value).toLocaleDateString("sv-SE", { timeZone: "Europe/Warsaw" }); // YYYY-MM-DD
}

/** End of the given Warsaw calendar day, so "due today" is included when the job runs at any hour of that day. */
export function endOfWarsawDay(now: Date): Date {
  const day = warsawDayKey(now);
  // 23:59:59 on that day, expressed as an instant: try both UTC offsets Warsaw uses and keep the one that stays on the same day
  for (const offset of ["+02:00", "+01:00"]) {
    const candidate = new Date(`${day}T23:59:59${offset}`);
    if (warsawDayKey(candidate) === day && warsawDayKey(new Date(candidate.getTime() + 1000)) !== day) return candidate;
  }
  return new Date(`${day}T23:59:59+01:00`);
}

export function sanitizeReminderText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.replace(/\s+/g, " ").trim().slice(0, MAX_REMINDER_TEXT).trim();
  return text.length > 0 ? text : null;
}

export function formatReminderPush(text: string, clientFirstName: string, clientLastName: string): { title: string; body: string } {
  return { title: "Przypomnienie o podopiecznym", body: `${`${clientFirstName} ${clientLastName}`.trim()}: ${text}` };
}
