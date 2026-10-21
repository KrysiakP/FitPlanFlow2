// Which workout of the plan comes next, based on what the client finished last.

export interface PlanWorkout {
  id: string;
  name: string;
  orderIndex?: number | null;
  exercises?: unknown[];
}

export interface FinishedSession {
  workoutId: string;
  completedAt: string;
}

export interface NextWorkout {
  workout: PlanWorkout;
  trainedToday: boolean;
}

/** The workout after the most recently finished one (wrapping around); the first one when nothing was done yet. */
export function nextWorkout(workouts: PlanWorkout[], sessions: FinishedSession[], now: Date = new Date()): NextWorkout | null {
  if (workouts.length === 0) return null;
  const ordered = [...workouts].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));

  const planSessions = sessions.filter((s) => ordered.some((w) => w.id === s.workoutId));
  if (planSessions.length === 0) return { workout: ordered[0], trainedToday: false };

  const last = planSessions.reduce((latest, s) => (new Date(s.completedAt) > new Date(latest.completedAt) ? s : latest));
  const lastIndex = ordered.findIndex((w) => w.id === last.workoutId);
  const lastDate = new Date(last.completedAt);
  const trainedToday = lastDate.toDateString() === now.toDateString();

  return { workout: ordered[(lastIndex + 1) % ordered.length], trainedToday };
}
