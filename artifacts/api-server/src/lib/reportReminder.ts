/** Sunday in Warsaw time (the cron job may run in UTC). */
export function isSundayInWarsaw(now: Date = new Date()): boolean {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Warsaw", weekday: "short" }).format(now) === "Sun";
}

export const REPORT_REMINDER = {
  title: "Raport tygodniowy",
  body: "Podsumuj swój tydzień dla trenera: waga, pomiary, samopoczucie. To zajmie dwie minuty.",
} as const;
