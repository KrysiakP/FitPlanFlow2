import type { IStorage } from "../storage";
import { isSundayInWarsaw, REPORT_REMINDER } from "../lib/reportReminder";

type SendPush = (userId: string, title: string, body: string, data: Record<string, string>, type: string) => Promise<void>;

const REMINDER_TYPE = "report_reminder";
const DAY_MS = 24 * 60 * 60 * 1000;
const NO_REPORT_FOR_MS = 6 * DAY_MS;
const DEDUPE_MS = 5 * DAY_MS;

/**
 * Sunday nudge for clients of an active trainer who have not sent a weekly report for 6 days, sent from the daily
 * scheduled job. Safe to run several times: one reminder per client in 5 days. `force` skips the Sunday check (tests).
 */
export async function sendReportReminders(
  storage: IStorage,
  sendPush: SendPush,
  { now = new Date(), force = false }: { now?: Date; force?: boolean } = {},
): Promise<{ checked: number; sent: number; skipped: number; errors: number; notSunday?: boolean }> {
  const stats = { checked: 0, sent: 0, skipped: 0, errors: 0 };
  if (!force && !isSundayInWarsaw(now)) return { ...stats, notSunday: true };

  const clientIds = await storage.getClientIdsWithoutRecentReport(new Date(now.getTime() - NO_REPORT_FOR_MS));
  stats.checked = clientIds.length;

  for (const clientId of clientIds) {
    try {
      if (await storage.hasRecentPushOfType(clientId, REMINDER_TYPE, new Date(now.getTime() - DEDUPE_MS))) {
        stats.skipped += 1;
        continue;
      }
      await sendPush(clientId, REPORT_REMINDER.title, REPORT_REMINDER.body, { type: REMINDER_TYPE }, REMINDER_TYPE);
      stats.sent += 1;
    } catch (error) {
      console.error("[REPORT_REMINDERS] Failed for client", clientId, error);
      stats.errors += 1;
    }
  }
  return stats;
}
