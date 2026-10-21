import type { IStorage } from "../storage";
import { formatTrialReminder, TRIAL_REMINDER_DAYS } from "../lib/trialReminder";

type SendPush = (userId: string, title: string, body: string, data: Record<string, string>, type: string) => Promise<void>;

const REMINDER_TYPE = "trial_ending";
const DAY_MS = 24 * 60 * 60 * 1000;

/** Daily job: trainers whose trial ends within three days are told once (at most one reminder per 4 days). */
export async function sendTrialReminders(
  storage: IStorage,
  sendPush: SendPush,
  now: Date = new Date(),
): Promise<{ checked: number; sent: number; skipped: number; errors: number }> {
  const stats = { checked: 0, sent: 0, skipped: 0, errors: 0 };
  const trainers = await storage.getTrainersWithTrialEndingBetween(now, new Date(now.getTime() + TRIAL_REMINDER_DAYS * DAY_MS));
  stats.checked = trainers.length;
  for (const trainer of trainers) {
    const message = formatTrialReminder(trainer.trialEndsAt, now);
    if (!message) {
      stats.skipped += 1;
      continue;
    }
    try {
      if (await storage.hasRecentPushOfType(trainer.id, REMINDER_TYPE, new Date(now.getTime() - 4 * DAY_MS))) {
        stats.skipped += 1;
        continue;
      }
      await sendPush(trainer.id, message.title, message.body, { type: REMINDER_TYPE }, REMINDER_TYPE);
      stats.sent += 1;
    } catch (error) {
      console.error("[TRIAL_REMINDERS] Failed for trainer", trainer.id, error);
      stats.errors += 1;
    }
  }
  return stats;
}
