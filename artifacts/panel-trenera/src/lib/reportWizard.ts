/** The weekly report on a phone is filled in step by step; the fields of each step and where an error sends the client back to. */

export interface WizardStep {
  title: string;
  fields: readonly string[];
}

export const REPORT_STEPS: readonly WizardStep[] = [
  { title: "Podstawy", fields: ["reportDate", "weight", "saturation"] },
  { title: "Pomiary", fields: ["chest", "waist", "hips", "arm", "leg"] },
  { title: "Samopoczucie", fields: ["cardio", "supplements", "sleepHours", "waterLiters", "mood", "thoughts"] },
  { title: "Zdjęcie", fields: ["photoUrl"] },
];

export function clampStep(step: number, steps: readonly WizardStep[] = REPORT_STEPS): number {
  if (!Number.isFinite(step)) return 0;
  return Math.min(Math.max(Math.trunc(step), 0), steps.length - 1);
}

/** The first step (in order) that contains one of the fields with an error, or null when none does. */
export function firstStepWithError(errorFields: readonly string[], steps: readonly WizardStep[] = REPORT_STEPS): number | null {
  const index = steps.findIndex((step) => step.fields.some((field) => errorFields.includes(field)));
  return index === -1 ? null : index;
}

/** Tailwind classes that hide a step on a phone only; from `md` up the whole form is shown at once. */
export function stepClass(current: number, index: number): string {
  return current === index ? "" : "hidden md:block";
}
