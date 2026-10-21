export const MAX_LABELS = 5;
export const MAX_LABEL_LENGTH = 24;

/** Trimmed, single-spaced, at most 24 characters, no case-insensitive duplicates, at most five; anything else is dropped. */
export function sanitizeLabels(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const labels: string[] = [];
  for (const value of input) {
    if (typeof value !== "string") continue;
    const label = value.replace(/\s+/g, " ").trim().slice(0, MAX_LABEL_LENGTH).trim();
    const key = label.toLowerCase();
    if (!label || seen.has(key)) continue;
    seen.add(key);
    labels.push(label);
    if (labels.length === MAX_LABELS) break;
  }
  return labels;
}
