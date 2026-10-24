/** The weekly report form is filled in step by step on the phone. */

export const REPORT_STEP_TITLES = ["Podstawy", "Pomiary", "Samopoczucie", "Zdjęcie"] as const;

export function clampStep(step: number): number {
  if (!Number.isFinite(step)) return 0;
  return Math.min(Math.max(Math.trunc(step), 0), REPORT_STEP_TITLES.length - 1);
}

/** The first step needs a valid date (YYYY-MM-DD) before going on; the others have only optional fields. */
export function canLeaveStep(step: number, reportDate: string): boolean {
  if (step !== 0) return true;
  return /^\d{4}-\d{2}-\d{2}$/.test(reportDate.trim()) && !Number.isNaN(Date.parse(reportDate.trim()));
}
