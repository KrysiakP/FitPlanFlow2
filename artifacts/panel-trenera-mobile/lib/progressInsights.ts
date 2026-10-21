// Pure helpers behind the progress screen (no React Native imports, so they can be unit-tested with node)

export interface InsightSession {
  completedAt: string;
}

export type BodyMetric = "weight" | "waist" | "chest" | "hips" | "arm" | "leg";

export interface InsightReport {
  reportDate: string;
  weight?: string | null;
  waist?: string | null;
  chest?: string | null;
  hips?: string | null;
  arm?: string | null;
  leg?: string | null;
}

export const BODY_METRICS: { key: BodyMetric; label: string; unit: string }[] = [
  { key: "weight", label: "Waga", unit: "kg" },
  { key: "waist", label: "Talia", unit: "cm" },
  { key: "chest", label: "Klatka", unit: "cm" },
  { key: "hips", label: "Biodra", unit: "cm" },
  { key: "arm", label: "Ramię", unit: "cm" },
  { key: "leg", label: "Udo", unit: "cm" },
];

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - day);
  return d;
}

/** Number of weeks in a row (ending this week, or last week if this one is still empty) with at least one workout. */
export function weeklyStreak(sessions: InsightSession[], now: Date = new Date()): number {
  const weeks = new Set(sessions.map((s) => startOfWeek(new Date(s.completedAt)).getTime()));
  const cursor = startOfWeek(now);
  if (!weeks.has(cursor.getTime())) cursor.setDate(cursor.getDate() - 7);
  let streak = 0;
  while (weeks.has(cursor.getTime())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 7);
  }
  return streak;
}

export function workoutsThisWeek(sessions: InsightSession[], now: Date = new Date()): number {
  const from = startOfWeek(now).getTime();
  return sessions.filter((s) => new Date(s.completedAt).getTime() >= from).length;
}

/** One body measurement over time, oldest first, last `limit` days; commas and units are tolerated ("75,5 kg"). */
export function metricSeries(reports: InsightReport[], metric: BodyMetric, limit = 8): { date: Date; value: number }[] {
  return reports
    .map((r) => ({ date: new Date(r.reportDate), value: parseFloat(String(r[metric] ?? "").replace(",", ".")) }))
    .filter((p) => Number.isFinite(p.value) && p.value > 0 && !Number.isNaN(p.date.getTime()))
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    // one point per calendar day: when several reports share a day, the last one wins
    .reduce<{ date: Date; value: number }[]>((points, point) => {
      const previous = points[points.length - 1];
      if (previous && previous.date.toDateString() === point.date.toDateString()) points[points.length - 1] = point;
      else points.push(point);
      return points;
    }, [])
    .slice(-limit);
}

/** Weight entries in the same shape as before (kg instead of a generic value). */
export function weightSeries(reports: InsightReport[], limit = 8): { date: Date; kg: number }[] {
  return metricSeries(reports, "weight", limit).map((p) => ({ date: p.date, kg: p.value }));
}

export function weekWord(n: number): string {
  if (n === 1) return "tydzień";
  const lastTwo = n % 100;
  const last = n % 10;
  return last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14) ? "tygodnie" : "tygodni";
}
