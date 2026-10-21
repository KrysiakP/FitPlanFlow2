import { estimateOneRepMax, parseLoadKg } from "./personalRecord.ts"; // explicit extension so the unit test can run the file with plain node

export interface HistoryRow {
  name: string;
  load: string | null;
  reps: number;
  loggedAt: Date | string;
}

export interface ExerciseHistoryPoint {
  date: string; // YYYY-MM-DD (Europe/Warsaw day)
  estimatedOneRepMax: number;
  bestLoad: number;
  sets: { load: number; reps: number }[]; // every weighted set of the day, in the order they were done
}

export interface ExerciseHistory {
  exercise: string;
  points: ExerciseHistoryPoint[];
  best: number;
  latest: number;
  change: number | null; // latest vs first point, kg
}

const round1 = (value: number) => Math.round(value * 10) / 10;

function dayKey(value: Date | string): string {
  // sv-SE gives an ISO-like YYYY-MM-DD in the requested timezone
  return new Date(value).toLocaleDateString("sv-SE", { timeZone: "Europe/Warsaw" });
}

/**
 * Per exercise (matched by name, ignoring case) and per day, the best estimated one-rep max of weighted sets.
 * Exercises are ordered by how many days they were trained; each keeps its latest `maxPoints` days.
 */
export function buildExerciseHistory(rows: HistoryRow[], { maxExercises = 8, maxPoints = 12 } = {}): ExerciseHistory[] {
  const byExercise = new Map<string, { label: string; days: Map<string, ExerciseHistoryPoint> }>();

  for (const row of rows) {
    const kg = parseLoadKg(row.load);
    if (kg === null || !(row.reps > 0)) continue;
    const key = row.name.trim().toLowerCase();
    if (!key) continue;
    const entry = byExercise.get(key) ?? { label: row.name.trim(), days: new Map() };
    byExercise.set(key, entry);

    const day = dayKey(row.loggedAt);
    const estimate = estimateOneRepMax(kg, row.reps);
    const existing = entry.days.get(day);
    const sets = [...(existing?.sets ?? []), { load: kg, reps: row.reps }];
    if (!existing || estimate > existing.estimatedOneRepMax) {
      entry.days.set(day, {
        date: day,
        estimatedOneRepMax: round1(estimate),
        bestLoad: Math.max(kg, existing?.bestLoad ?? 0),
        sets,
      });
    } else {
      existing.bestLoad = Math.max(existing.bestLoad, kg);
      existing.sets = sets;
    }
  }

  return [...byExercise.values()]
    .map(({ label, days }) => {
      const points = [...days.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-maxPoints);
      const best = Math.max(...points.map((p) => p.estimatedOneRepMax));
      const latest = points[points.length - 1].estimatedOneRepMax;
      return {
        exercise: label,
        points,
        best,
        latest,
        change: points.length > 1 ? round1(latest - points[0].estimatedOneRepMax) : null,
      };
    })
    .sort((a, b) => b.points.length - a.points.length || a.exercise.localeCompare(b.exercise, "pl"))
    .slice(0, maxExercises);
}
