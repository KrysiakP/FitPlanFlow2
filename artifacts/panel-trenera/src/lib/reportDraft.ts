/** A half-written weekly report survives a closed tab or a phone call: it is kept locally and offered again. */

export const DRAFT_FIELDS = ["weight", "saturation", "chest", "waist", "hips", "arm", "leg", "cardio", "supplements", "mood", "sleepHours", "waterLiters", "thoughts"] as const;
export type DraftField = (typeof DRAFT_FIELDS)[number];
export type ReportDraft = Partial<Record<DraftField, string>>;

// Fields carried over from the previous report do not count as "typed" — a draft made only of them is not worth keeping
const CARRIED = new Set<DraftField>(["chest", "waist", "hips", "arm", "leg", "supplements"]);
export const DRAFT_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

/** The JSON to store, or null when the user has not typed anything of their own yet. */
export function serializeDraft(values: Partial<Record<string, unknown>>, now: number = Date.now()): string | null {
  const kept: ReportDraft = {};
  let typedSomething = false;
  for (const field of DRAFT_FIELDS) {
    const value = values[field];
    if (typeof value !== "string" || value.trim() === "") continue;
    kept[field] = value;
    if (!CARRIED.has(field)) typedSomething = true;
  }
  return typedSomething ? JSON.stringify({ savedAt: now, values: kept }) : null;
}

/** The saved fields, or null for missing, broken or too old data. Unknown keys and non-text values are dropped. */
export function parseDraft(raw: string | null | undefined, now: number = Date.now()): ReportDraft | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { savedAt?: unknown; values?: unknown };
    if (typeof parsed.savedAt !== "number" || now - parsed.savedAt > DRAFT_MAX_AGE_MS || typeof parsed.values !== "object" || parsed.values === null) return null;
    const draft: ReportDraft = {};
    for (const field of DRAFT_FIELDS) {
      const value = (parsed.values as Record<string, unknown>)[field];
      if (typeof value === "string" && value.trim() !== "") draft[field] = value;
    }
    return Object.keys(draft).length > 0 ? draft : null;
  } catch {
    return null;
  }
}
