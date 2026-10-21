import type { IStorage } from "../storage";
import { endOfWarsawDay, formatReminderPush } from "../lib/clientReminder";

type SendPush = (userId: string, title: string, body: string, data: Record<string, string>, type: string) => Promise<void>;

/** Daily job: every reminder that is due today (or was missed) is pushed to its trainer exactly once. */
export async function sendClientReminders(
  storage: IStorage,
  sendPush: SendPush,
  now: Date = new Date(),
): Promise<{ due: number; sent: number; errors: number }> {
  const stats = { due: 0, sent: 0, errors: 0 };
  const due = await storage.getDueUnnotifiedReminders(endOfWarsawDay(now));
  stats.due = due.length;
  for (const reminder of due) {
    try {
      const message = formatReminderPush(reminder.text, reminder.clientFirstName, reminder.clientLastName);
      await sendPush(reminder.trainerId, message.title, message.body, { type: "client_reminder", clientId: reminder.clientId }, "client_reminder");
      await storage.markReminderNotified(reminder.id); // marked only after the push went out, so a failure is retried tomorrow
      stats.sent += 1;
    } catch (error) {
      console.error("[CLIENT_REMINDERS] Failed for reminder", reminder.id, error);
      stats.errors += 1;
    }
  }
  return stats;
}
