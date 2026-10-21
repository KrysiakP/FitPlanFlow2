// The morning message to trainers: what is on the calendar today and what waits for a look.

export interface TrainerDay {
  trainerId: string;
  sessions: number; // booked sessions still ahead today
  firstAt: Date | null; // the earliest of them
  unreadReports: number; // reports from active clients the trainer has not opened
}

function plural(n: number, one: string, few: string, many: string): string {
  const lastTwo = n % 100;
  const last = n % 10;
  if (n === 1) return one;
  return last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14) ? few : many;
}

/** Hours and minutes of a moment on the Warsaw clock, e.g. "07:30". */
function warsawTime(value: Date): string {
  return new Intl.DateTimeFormat("pl-PL", { timeZone: "Europe/Warsaw", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(value);
}

/** The first moment of the next calendar day in Warsaw, so "today" means the Warsaw day whatever the server clock says. */
export function endOfWarsawDay(now: Date = new Date()): Date {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Warsaw", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" })
      .formatToParts(now)
      .map((part) => [part.type, part.value]),
  );
  const wallClockAsUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
  const offsetMs = wallClockAsUtc - Math.floor(now.getTime() / 1000) * 1000;
  return new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day) + 1) - offsetMs);
}

/** Null when there is nothing worth a push (an empty calendar and no unread reports). */
export function formatDailySummary(day: TrainerDay): { title: string; body: string } | null {
  if (day.sessions === 0 && day.unreadReports === 0) return null;
  const parts: string[] = [];
  if (day.sessions > 0) {
    const first = day.firstAt ? `, pierwszy o ${warsawTime(day.firstAt)}` : "";
    parts.push(`${day.sessions} ${plural(day.sessions, "sesja", "sesje", "sesji")} w kalendarzu${first}`);
  }
  if (day.unreadReports > 0) {
    parts.push(`${day.unreadReports} ${plural(day.unreadReports, "nieotwarty raport", "nieotwarte raporty", "nieotwartych raportów")}`);
  }
  return { title: "Twój dzień", body: `Dziś: ${parts.join(", ")}.` };
}
