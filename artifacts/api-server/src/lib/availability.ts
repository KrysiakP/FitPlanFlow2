/**
 * A trainer's weekly availability and the free slots it yields. Everything is in Warsaw time: a window "Monday 17:00-20:00"
 * means the same wall-clock hours in winter and summer.
 */

export interface AvailabilityWindow {
  dayOfWeek: number; // 1 = Monday ... 7 = Sunday
  startMinute: number; // minutes after midnight, Warsaw
  endMinute: number;
  slotMinutes: number;
}

export interface BookedSession {
  scheduledAt: Date | string;
  durationMinutes: number;
}

export interface FreeSlot {
  startsAt: string; // ISO, UTC
  durationMinutes: number;
}

const TZ = "Europe/Warsaw";
const MINUTE_MS = 60_000;

function warsawParts(date: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day), hour: Number(parts.hour), minute: Number(parts.minute) };
}

/** Warsaw's offset from UTC at a moment, in ms (+1 h in winter, +2 h in summer). */
function warsawOffsetMs(at: Date): number {
  const p = warsawParts(at);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - Math.floor(at.getTime() / MINUTE_MS) * MINUTE_MS;
}

/** The UTC moment at which the Warsaw wall clock shows the given date and minute of the day. */
export function warsawToUtc(year: number, month: number, day: number, minuteOfDay: number): Date {
  const naive = Date.UTC(year, month - 1, day, 0, minuteOfDay);
  let result = naive - warsawOffsetMs(new Date(naive));
  result = naive - warsawOffsetMs(new Date(result)); // the offset at the corrected moment, for days with a clock change
  return new Date(result);
}

/** Monday = 1 ... Sunday = 7, for a calendar date. */
function isoWeekday(year: number, month: number, day: number): number {
  const js = new Date(Date.UTC(year, month - 1, day)).getUTCDay(); // 0 = Sunday
  return js === 0 ? 7 : js;
}

export function validateWindows(input: unknown): AvailabilityWindow[] | null {
  if (!Array.isArray(input) || input.length > 40) return null;
  const windows: AvailabilityWindow[] = [];
  for (const row of input) {
    if (typeof row !== "object" || row === null) return null;
    const { dayOfWeek, startMinute, endMinute, slotMinutes } = row as Record<string, unknown>;
    if (![dayOfWeek, startMinute, endMinute, slotMinutes].every((value) => typeof value === "number" && Number.isInteger(value))) return null;
    const [day, start, end, slot] = [dayOfWeek, startMinute, endMinute, slotMinutes] as number[];
    if (day < 1 || day > 7) return null;
    if (start < 0 || end > 24 * 60 || end <= start) return null;
    if (slot < 15 || slot > 240 || end - start < slot) return null;
    windows.push({ dayOfWeek: day, startMinute: start, endMinute: end, slotMinutes: slot });
  }
  return windows;
}

/**
 * Free slots in the next `days` days (starting with today in Warsaw): every slot of every window that is later than
 * `now + minNoticeHours` and does not overlap a booked session.
 */
export function freeSlots(windows: AvailabilityWindow[], booked: BookedSession[], now: Date, days = 14, minNoticeHours = 2): FreeSlot[] {
  const earliest = now.getTime() + minNoticeHours * 60 * MINUTE_MS;
  const busy = booked.map((session) => {
    const start = new Date(session.scheduledAt).getTime();
    return { start, end: start + session.durationMinutes * MINUTE_MS };
  });
  const today = warsawParts(now);
  const slots: FreeSlot[] = [];

  for (let offset = 0; offset < days; offset += 1) {
    const date = new Date(Date.UTC(today.year, today.month - 1, today.day + offset));
    const [year, month, day] = [date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()];
    const weekday = isoWeekday(year, month, day);
    for (const window of windows.filter((item) => item.dayOfWeek === weekday)) {
      for (let minute = window.startMinute; minute + window.slotMinutes <= window.endMinute; minute += window.slotMinutes) {
        const start = warsawToUtc(year, month, day, minute).getTime();
        const end = start + window.slotMinutes * MINUTE_MS;
        if (start < earliest) continue;
        if (busy.some((session) => start < session.end && end > session.start)) continue;
        slots.push({ startsAt: new Date(start).toISOString(), durationMinutes: window.slotMinutes });
      }
    }
  }
  return slots.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}
