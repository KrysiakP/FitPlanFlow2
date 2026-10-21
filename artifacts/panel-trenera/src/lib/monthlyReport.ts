/** The month at a glance, built from what the client has already logged: workouts, body changes, strength. */

export interface MonthReport {
  reportDate: string | Date;
  weight?: string | null;
  chest?: string | null;
  waist?: string | null;
  hips?: string | null;
  arm?: string | null;
  leg?: string | null;
}

export interface MonthSession {
  completedAt: string | Date;
  durationSeconds?: number | null;
  rpe?: number | null;
}

export interface MonthStrengthHistory {
  exercise: string;
  points: { date: string; estimatedOneRepMax: number }[];
}

export interface BodyChange {
  label: string;
  unit: string;
  from: number;
  to: number;
  change: number;
}

export interface StrengthChange {
  exercise: string;
  from: number;
  to: number;
  change: number;
}

export interface MonthlySummary {
  month: string; // YYYY-MM
  workouts: number;
  trainingMinutes: number;
  averageRpe: number | null;
  reportsSent: number;
  body: BodyChange[];
  strength: StrengthChange[];
}

const BODY_FIELDS: { key: Exclude<keyof MonthReport, "reportDate">; label: string; unit: string }[] = [
  { key: "weight", label: "Waga", unit: "kg" },
  { key: "chest", label: "Klatka", unit: "cm" },
  { key: "waist", label: "Talia", unit: "cm" },
  { key: "hips", label: "Biodra", unit: "cm" },
  { key: "arm", label: "Ramię", unit: "cm" },
  { key: "leg", label: "Udo", unit: "cm" },
];

const round1 = (value: number) => Math.round(value * 10) / 10;

/** The Warsaw calendar month of a moment, as YYYY-MM. */
export function monthKey(value: string | Date): string {
  return new Date(value).toLocaleDateString("sv-SE", { timeZone: "Europe/Warsaw" }).slice(0, 7);
}

function parseNumber(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = parseFloat(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/** Months (newest first) in which the client did anything worth summarising. */
export function monthsWithData(reports: MonthReport[], sessions: MonthSession[]): string[] {
  const months = new Set<string>();
  for (const report of reports) months.add(monthKey(report.reportDate));
  for (const session of sessions) months.add(monthKey(session.completedAt));
  return [...months].sort().reverse();
}

export function buildMonthlySummary(month: string, reports: MonthReport[], sessions: MonthSession[], strength: MonthStrengthHistory[]): MonthlySummary {
  const monthSessions = sessions.filter((session) => monthKey(session.completedAt) === month);
  const monthReports = reports
    .filter((report) => monthKey(report.reportDate) === month)
    .sort((a, b) => new Date(a.reportDate).getTime() - new Date(b.reportDate).getTime());

  const seconds = monthSessions.reduce((sum, session) => sum + (session.durationSeconds ?? 0), 0);
  const rated = monthSessions.filter((session) => typeof session.rpe === "number") as (MonthSession & { rpe: number })[];

  // A body value changed in the month only if it was measured at least twice in it
  const body: BodyChange[] = [];
  for (const field of BODY_FIELDS) {
    const values = monthReports.map((report) => parseNumber(report[field.key])).filter((value): value is number => value !== null);
    if (values.length < 2) continue;
    const from = values[0];
    const to = values[values.length - 1];
    body.push({ label: field.label, unit: field.unit, from, to, change: round1(to - from) });
  }

  const strengthChanges: StrengthChange[] = [];
  for (const history of strength) {
    const inMonth = history.points.filter((point) => point.date.startsWith(month)).sort((a, b) => a.date.localeCompare(b.date));
    if (inMonth.length < 2) continue;
    const from = inMonth[0].estimatedOneRepMax;
    const to = inMonth[inMonth.length - 1].estimatedOneRepMax;
    strengthChanges.push({ exercise: history.exercise, from, to, change: round1(to - from) });
  }
  strengthChanges.sort((a, b) => b.change - a.change);

  return {
    month,
    workouts: monthSessions.length,
    trainingMinutes: Math.round(seconds / 60),
    averageRpe: rated.length > 0 ? round1(rated.reduce((sum, session) => sum + session.rpe, 0) / rated.length) : null,
    reportsSent: monthReports.length,
    body,
    strength: strengthChanges,
  };
}
