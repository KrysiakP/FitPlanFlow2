/** Progress towards a body-weight goal ("76 kg do wakacji"), judged against a straight line from start to deadline. */

export interface GoalInput {
  startKg: number;
  targetKg: number;
  currentKg: number;
  targetDate: Date | string | null;
  startedAt: Date | string;
}

export type GoalStatus = "reached" | "on_track" | "behind" | "no_deadline" | "overdue";

export interface GoalProgress {
  percent: number; // 0..100 of the distance from start to target already covered
  remainingKg: number;
  daysLeft: number | null;
  status: GoalStatus;
}

const DAY = 24 * 3600 * 1000;
const round1 = (value: number) => Math.round(value * 10) / 10;

export function goalProgress(goal: GoalInput, now: Date = new Date()): GoalProgress {
  const total = goal.targetKg - goal.startKg;
  const covered = goal.currentKg - goal.startKg;
  const direction = Math.sign(total);
  // distance covered in the right direction, as a share of the whole way; moving the wrong way counts as zero
  const fraction = total === 0 ? 1 : Math.min(1, Math.max(0, covered / total));
  const reached = direction === 0 || (direction < 0 ? goal.currentKg <= goal.targetKg : goal.currentKg >= goal.targetKg);
  const remainingKg = reached ? 0 : round1(Math.abs(goal.targetKg - goal.currentKg));
  const percent = Math.round((reached ? 1 : fraction) * 100);

  if (reached) return { percent: 100, remainingKg: 0, daysLeft: goal.targetDate ? Math.max(0, Math.ceil((new Date(goal.targetDate).getTime() - now.getTime()) / DAY)) : null, status: "reached" };
  if (!goal.targetDate) return { percent, remainingKg, daysLeft: null, status: "no_deadline" };

  const end = new Date(goal.targetDate).getTime();
  const start = new Date(goal.startedAt).getTime();
  const daysLeft = Math.ceil((end - now.getTime()) / DAY);
  if (daysLeft < 0) return { percent, remainingKg, daysLeft: 0, status: "overdue" };

  // expected share of the way by now on a straight line; a little slack so a normal week-to-week wobble is not "behind"
  const span = Math.max(DAY, end - start);
  const expected = Math.min(1, Math.max(0, (now.getTime() - start) / span));
  return { percent, remainingKg, daysLeft, status: fraction + 0.1 >= expected ? "on_track" : "behind" };
}
