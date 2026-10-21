// The Monday message to trainers: what happened with their clients over the last 7 days.

export interface TrainerWeek {
  trainerId: string;
  activeClients: number;
  sessions: number; // workouts finished by their clients
  reports: number; // weekly reports received
  overduePayments: number; // unpaid and past due right now
}

function plural(n: number, one: string, few: string, many: string): string {
  const lastTwo = n % 100;
  const last = n % 10;
  if (n === 1) return one;
  return last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14) ? few : many;
}

/** Monday in Warsaw time (the cron job may run in UTC). */
export function isMondayInWarsaw(now: Date = new Date()): boolean {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Warsaw", weekday: "short" }).format(now) === "Mon";
}

export function formatWeeklySummary(week: TrainerWeek): { title: string; body: string } | null {
  if (week.activeClients === 0) return null;

  const parts: string[] = [
    `${week.sessions} ${plural(week.sessions, "trening", "treningi", "treningów")}`,
    `${week.reports} ${plural(week.reports, "nowy raport", "nowe raporty", "nowych raportów")}`,
  ];
  if (week.overduePayments > 0) {
    parts.push(`${week.overduePayments} ${plural(week.overduePayments, "zaległa płatność", "zaległe płatności", "zaległych płatności")}`);
  }

  const quiet = week.sessions === 0 && week.reports === 0;
  return {
    title: "Twój tydzień z podopiecznymi",
    body: quiet
      ? `Cichy tydzień — brak treningów i raportów${week.overduePayments > 0 ? `, ${parts[2]}` : ""}. Zajrzyj do listy „Wymaga uwagi".`
      : `Ostatnie 7 dni: ${parts.join(", ")}.`,
  };
}

export interface StudioWeek {
  ownerId: string;
  gymName: string;
  activeTrainers: number;
  sessions: number;
  reports: number;
  overduePayments: number;
}

/** Same Monday message for the studio owner, summed over the studio's active trainers. */
export function formatStudioSummary(week: StudioWeek): { title: string; body: string } | null {
  if (week.activeTrainers === 0) return null;
  const parts = [
    `${week.sessions} ${plural(week.sessions, "trening", "treningi", "treningów")}`,
    `${week.reports} ${plural(week.reports, "nowy raport", "nowe raporty", "nowych raportów")}`,
  ];
  if (week.overduePayments > 0) {
    parts.push(`${week.overduePayments} ${plural(week.overduePayments, "zaległa płatność", "zaległe płatności", "zaległych płatności")}`);
  }
  return {
    title: `${week.gymName}: tydzień w studiu`,
    body: `Ostatnie 7 dni (${week.activeTrainers} ${plural(week.activeTrainers, "aktywny trener", "aktywnych trenerów", "aktywnych trenerów")}): ${parts.join(", ")}.`,
  };
}
