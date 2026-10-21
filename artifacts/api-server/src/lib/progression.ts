/**
 * Progression proposals for the trainer: when the client did every planned set at the top weight with all the planned
 * repetitions in their latest session, the next weight is one plate step higher. Only a proposal; the trainer decides.
 */

export interface PlannedExercise {
  sets: number;
  reps: number;
  load: string | null | undefined; // the plan's load, e.g. "60", "60 kg", "62,5"
}

export interface LoggedSet {
  load: string | null | undefined;
  reps: number;
}

export interface ProgressionProposal {
  from: number; // the weight the client actually lifted
  to: number;
  planLoad: number | null; // the load currently written in the plan
  reason: string;
}

const parseKg = (value: string | number | null | undefined): number | null => {
  const parsed = parseFloat(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

/** 2.5 kg for most lifts, 5 kg from 100 kg up. */
export const progressionStep = (load: number) => (load >= 100 ? 5 : 2.5);

const formatKg = (value: number) => `${String(Math.round(value * 10) / 10).replace(".", ",")} kg`;

/** `latestSessionSets` are the weighted, non-warm-up sets of the client's most recent training day for this exercise. */
export function proposeProgression(planned: PlannedExercise, latestSessionSets: LoggedSet[]): ProgressionProposal | null {
  if (!(planned.sets >= 1) || !(planned.reps >= 1)) return null;
  const weighted = latestSessionSets
    .map((set) => ({ kg: parseKg(set.load), reps: set.reps }))
    .filter((set): set is { kg: number; reps: number } => set.kg !== null && set.reps > 0);
  if (weighted.length === 0) return null;

  const top = Math.max(...weighted.map((set) => set.kg));
  const atTop = weighted.filter((set) => set.kg === top);
  if (atTop.length < planned.sets) return null; // not all planned sets were done at the top weight
  if (atTop.some((set) => set.reps < planned.reps)) return null; // fell short of the planned repetitions

  const to = top + progressionStep(top);
  const planLoad = parseKg(planned.load);
  if (planLoad !== null && planLoad >= to) return null; // the plan already asks for at least that much
  return {
    from: top,
    to,
    planLoad,
    reason: `${atTop.length}×${planned.reps} z ${formatKg(top)} wykonane w całości`,
  };
}
