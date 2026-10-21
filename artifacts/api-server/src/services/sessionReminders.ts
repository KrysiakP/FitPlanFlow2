import type { IStorage } from "../storage";

/**
 * Session reminders: tells clients about training sessions that start within the next 24 hours.
 *
 * Runs from the same scheduled job as the payment notifications. It can be triggered several times a day
 * without sending duplicates: a reminder with the same text is never sent twice to one client within 36 hours.
 */

type SendPush = (userId: string, title: string, body: string, data: Record<string, string>, type: string) => Promise<void>;

const REMINDER_TYPE = "session_reminder";
const WINDOW_MS = 24 * 60 * 60 * 1000;
const DEDUPE_MS = 36 * 60 * 60 * 1000;

function formatTime(value: Date | string): string {
  return new Date(value).toLocaleString("pl-PL", {
    timeZone: "Europe/Warsaw",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export async function sendSessionReminders(
  storage: IStorage,
  sendPush: SendPush,
  now: Date = new Date(),
): Promise<{ checked: number; sent: number; skipped: number; errors: number }> {
  const stats = { checked: 0, sent: 0, skipped: 0, errors: 0 };
  const sessions = await storage.getScheduledSessionsBetween(now, new Date(now.getTime() + WINDOW_MS));
  stats.checked = sessions.length;

  for (const session of sessions) {
    if (!session.clientId) continue;
    const body = `Przypominamy o treningu: ${formatTime(session.scheduledAt)}${session.location ? `, ${session.location}` : ""}.`;
    try {
      const alreadySent = await storage.hasPushNotification(session.clientId, REMINDER_TYPE, body, new Date(now.getTime() - DEDUPE_MS));
      if (alreadySent) {
        stats.skipped += 1;
        continue;
      }
      await sendPush(session.clientId, "Trening już wkrótce", body, { type: REMINDER_TYPE, sessionId: session.id }, REMINDER_TYPE);
      stats.sent += 1;
    } catch (error) {
      console.error("[SESSION_REMINDERS] Failed for session", session.id, error);
      stats.errors += 1;
    }
  }
  return stats;
}
