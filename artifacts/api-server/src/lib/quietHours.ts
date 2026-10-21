/** Quiet hours: pushes are still recorded in the history, but the phone is not buzzed. Minutes after midnight, Europe/Warsaw. */

export const QUIET_PRESETS = [
  { start: 22 * 60, end: 7 * 60, label: "22:00–07:00" },
  { start: 21 * 60, end: 8 * 60, label: "21:00–08:00" },
  { start: 23 * 60, end: 6 * 60, label: "23:00–06:00" },
] as const;

export function warsawMinutes(now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Warsaw", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}

/** True when `now` falls in [start, end); a window that crosses midnight (22:00–07:00) is handled. */
export function isQuietNow(start: number | null | undefined, end: number | null | undefined, now: Date = new Date()): boolean {
  if (start == null || end == null || start === end) return false;
  const minutes = warsawMinutes(now);
  return start < end ? minutes >= start && minutes < end : minutes >= start || minutes < end;
}

/** Only the preset windows are accepted, so the stored values stay meaningful. */
export function sanitizeQuietHours(input: unknown): { start: number; end: number } | null | undefined {
  if (input === null) return null; // switch off
  if (typeof input !== "object" || input === undefined) return undefined; // not provided
  const { start, end } = input as { start?: unknown; end?: unknown };
  const preset = QUIET_PRESETS.find((candidate) => candidate.start === start && candidate.end === end);
  return preset ? { start: preset.start, end: preset.end } : undefined;
}
