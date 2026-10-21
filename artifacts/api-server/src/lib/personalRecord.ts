// Personal record detection for logged sets.
// A set is a record when its estimated one-rep max (Epley) beats every earlier set of the same exercise.

export interface LoggedSet {
  load?: string | null;
  reps: number;
}

export interface PersonalRecordResult {
  isRecord: boolean;
  estimatedOneRepMax: number | null;
  previousBest: number | null;
}

const BODYWEIGHT_WORDS = /(bodyweight|body weight|\bbw\b|masa ciała|ciężar ciała)/i;

/** "62,5 kg" -> 62.5, "100" -> 100, "bodyweight" or "" -> null */
export function parseLoadKg(load: string | null | undefined): number | null {
  if (!load) return null;
  if (BODYWEIGHT_WORDS.test(load)) return null;
  const match = String(load).match(/(\d+(?:[.,]\d+)?)/);
  if (!match) return null;
  const kg = parseFloat(match[1].replace(",", "."));
  return Number.isFinite(kg) && kg > 0 ? kg : null;
}

/** Epley formula; sets above 30 reps are too imprecise to compare, so they are capped. */
export function estimateOneRepMax(kg: number, reps: number): number {
  if (!(kg > 0) || !(reps > 0)) return 0;
  if (reps === 1) return kg;
  return kg * (1 + Math.min(reps, 30) / 30);
}

const round1 = (value: number) => Math.round(value * 10) / 10;

export function evaluatePersonalRecord(previous: LoggedSet[], current: LoggedSet): PersonalRecordResult {
  const kg = parseLoadKg(current.load);
  if (kg === null) return { isRecord: false, estimatedOneRepMax: null, previousBest: null };
  const estimate = estimateOneRepMax(kg, current.reps);

  let best = 0;
  for (const set of previous) {
    const previousKg = parseLoadKg(set.load);
    if (previousKg !== null) best = Math.max(best, estimateOneRepMax(previousKg, set.reps));
  }

  // The very first logged set of an exercise is a starting point, not a record
  const hasHistory = best > 0;
  return {
    isRecord: hasHistory && estimate > best + 0.01,
    estimatedOneRepMax: round1(estimate),
    previousBest: hasHistory ? round1(best) : null,
  };
}
