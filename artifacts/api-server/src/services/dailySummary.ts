import type { IStorage } from "../storage";
import { endOfWarsawDay, formatDailySummary } from "../lib/dailySummary";

type SendPush = (userId: string, title: string, body: string, data: Record<string, string>, type: string) => Promise<void>;

const SUMMARY_TYPE = "daily_summary";
const DEDUPE_MS = 18 * 60 * 60 * 1000;

/** The morning message for trainers, sent from the daily scheduled job; at most one per trainer per 18 hours. */
export async function sendDailySummaries(
  storage: IStorage,
  sendPush: SendPush,
  now: Date = new Date(),
): Promise<{ trainers: number; sent: number; skipped: number; errors: number }> {
  const stats = { trainers: 0, sent: 0, skipped: 0, errors: 0 };
  const days = await storage.getTrainerDays(now, endOfWarsawDay(now));
  stats.trainers = days.length;

  for (const day of days) {
    const message = formatDailySummary(day);
    if (!message) {
      stats.skipped += 1;
      continue;
    }
    try {
      if (await storage.hasRecentPushOfType(day.trainerId, SUMMARY_TYPE, new Date(now.getTime() - DEDUPE_MS))) {
        stats.skipped += 1;
        continue;
      }
      await sendPush(day.trainerId, message.title, message.body, { type: SUMMARY_TYPE }, SUMMARY_TYPE);
      stats.sent += 1;
    } catch (error) {
      console.error("[DAILY_SUMMARY] Failed for trainer", day.trainerId, error);
      stats.errors += 1;
    }
  }
  return stats;
}
