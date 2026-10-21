/** Trainers get a heads-up before the free trial ends, so access never stops by surprise. */

const DAY_MS = 24 * 60 * 60 * 1000;

export const TRIAL_REMINDER_DAYS = 3;

export function daysLeft(endsAt: Date | string, now: Date = new Date()): number {
  // a few minutes of slack, so "exactly two days" computed a moment later is not reported as three
  const ms = new Date(endsAt).getTime() - now.getTime() - 5 * 60 * 1000;
  return Math.max(0, Math.ceil(ms / DAY_MS));
}

export function formatTrialReminder(endsAt: Date | string, now: Date = new Date()): { title: string; body: string } | null {
  const days = daysLeft(endsAt, now);
  if (days < 1 || days > TRIAL_REMINDER_DAYS) return null;
  const when = days === 1 ? "jutro" : `za ${days} dni`;
  return {
    title: "Okres próbny kończy się",
    body: `Darmowy okres próbny kończy się ${when}. Wybierz plan na paneltrenera.pl, żeby nie stracić dostępu do podopiecznych.`,
  };
}
