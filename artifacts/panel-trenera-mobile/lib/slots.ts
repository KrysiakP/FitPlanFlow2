// Free slots of the trainer, grouped by day for the booking card. Pure, so it can be unit-tested with node.

export interface Slot {
  startsAt: string; // ISO, UTC
  durationMinutes: number;
}

export interface SlotDay {
  key: string; // YYYY-MM-DD, Warsaw
  label: string; // e.g. "poniedziałek, 26 października"
  slots: Slot[];
}

const TZ = "Europe/Warsaw";

export const slotDayKey = (iso: string) => new Date(iso).toLocaleDateString("sv-SE", { timeZone: TZ });
export const slotDayLabel = (iso: string) => new Date(iso).toLocaleDateString("pl-PL", { weekday: "long", day: "numeric", month: "long", timeZone: TZ });
export const slotTimeLabel = (iso: string) => new Date(iso).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit", timeZone: TZ });

/** Slots grouped by Warsaw day in time order; only the first `maxDays` days that have any. */
export function groupSlotsByDay(slots: Slot[], maxDays = 7): SlotDay[] {
  const sorted = [...slots].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const days = new Map<string, SlotDay>();
  for (const slot of sorted) {
    const key = slotDayKey(slot.startsAt);
    const day = days.get(key) ?? { key, label: slotDayLabel(slot.startsAt), slots: [] };
    day.slots.push(slot);
    days.set(key, day);
  }
  return [...days.values()].slice(0, maxDays);
}
