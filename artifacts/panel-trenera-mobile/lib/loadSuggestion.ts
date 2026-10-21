// Double progression: when the planned rep range was reached at the last weight, add weight; otherwise aim at the range.
// Pure (no React Native imports), so it can be unit-tested with node.

export interface SuggestionInput {
  plannedReps: string | number | null | undefined; // "10" or "8-10"
  lastReps: number | null | undefined;
  lastLoad: string | number | null | undefined; // "80", "80 kg", "82,5"
}

const parseNumber = (value: string | number | null | undefined): number | null => {
  const n = parseFloat(String(value ?? "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** "8-10" -> { low: 8, high: 10 }; "10" -> { low: 10, high: 10 }; anything else -> null */
export function parseRepRange(value: string | number | null | undefined): { low: number; high: number } | null {
  const text = String(value ?? "").trim();
  const range = /^(\d+)\s*[-–]\s*(\d+)$/.exec(text);
  if (range) {
    const [low, high] = [Number(range[1]), Number(range[2])].sort((a, b) => a - b);
    return { low, high };
  }
  const single = /^(\d+)$/.exec(text);
  return single ? { low: Number(single[1]), high: Number(single[1]) } : null;
}

const formatKg = (value: number) => `${String(Math.round(value * 10) / 10).replace(".", ",")} kg`;

/** The smallest sensible plate step: 2.5 kg, 5 kg for heavy lifts. */
export const loadStep = (load: number) => (load >= 100 ? 5 : 2.5);

export function suggestLoad({ plannedReps, lastReps, lastLoad }: SuggestionInput): string | null {
  const load = parseNumber(lastLoad);
  const range = parseRepRange(plannedReps);
  if (load === null || !range || !lastReps || lastReps < 1) return null;
  if (lastReps >= range.high) return `Ostatnio ${formatKg(load)} × ${lastReps}: spróbuj ${formatKg(load + loadStep(load))}`;
  if (lastReps < range.low) return `Ostatnio ${formatKg(load)} × ${lastReps}: zostań przy tym ciężarze i dobij do ${range.low} powtórzeń`;
  return `Ostatnio ${formatKg(load)} × ${lastReps}: spróbuj o jedno powtórzenie więcej`;
}
