import type { IStorage } from "../storage";
import { formatStudioSummary, formatWeeklySummary, isMondayInWarsaw } from "../lib/weeklySummary";

type SendPush = (userId: string, title: string, body: string, data: Record<string, string>, type: string) => Promise<void>;

const SUMMARY_TYPE = "weekly_summary";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const DEDUPE_MS = 5 * 24 * 60 * 60 * 1000;

/**
 * Monday summary for trainers, sent from the daily scheduled job. Safe to run several times:
 * a trainer gets at most one summary in 5 days. `force` skips the Monday check (tests, manual runs).
 */
export async function sendWeeklySummaries(
  storage: IStorage,
  sendPush: SendPush,
  { now = new Date(), force = false }: { now?: Date; force?: boolean } = {},
): Promise<{ trainers: number; sent: number; skipped: number; errors: number; notMonday?: boolean }> {
  const stats = { trainers: 0, sent: 0, skipped: 0, errors: 0 };
  if (!force && !isMondayInWarsaw(now)) return { ...stats, notMonday: true };

  const weeks = await storage.getTrainerWeeklyStats(new Date(now.getTime() - WEEK_MS));
  stats.trainers = weeks.length;

  for (const week of weeks) {
    const message = formatWeeklySummary(week);
    if (!message) {
      stats.skipped += 1;
      continue;
    }
    try {
      if (await storage.hasRecentPushOfType(week.trainerId, SUMMARY_TYPE, new Date(now.getTime() - DEDUPE_MS))) {
        stats.skipped += 1;
        continue;
      }
      await sendPush(week.trainerId, message.title, message.body, { type: SUMMARY_TYPE }, SUMMARY_TYPE);
      stats.sent += 1;
    } catch (error) {
      console.error("[WEEKLY_SUMMARY] Failed for trainer", week.trainerId, error);
      stats.errors += 1;
    }
  }

  // Studio owners get the same summary for the whole studio
  for (const studio of await storage.getStudioWeeklyStats(new Date(now.getTime() - WEEK_MS))) {
    const message = formatStudioSummary(studio);
    if (!message) continue;
    try {
      if (await storage.hasRecentPushOfType(studio.ownerId, SUMMARY_TYPE, new Date(now.getTime() - DEDUPE_MS))) {
        stats.skipped += 1;
        continue;
      }
      await sendPush(studio.ownerId, message.title, message.body, { type: SUMMARY_TYPE }, SUMMARY_TYPE);
      stats.sent += 1;
    } catch (error) {
      console.error("[WEEKLY_SUMMARY] Failed for studio owner", studio.ownerId, error);
      stats.errors += 1;
    }
  }
  return stats;
}
