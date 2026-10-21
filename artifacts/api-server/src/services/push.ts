import { storage } from "../storage";
import { deadPushTokens, withPushType } from "../lib/expoPush";
import { isOptionalNotificationType } from "../lib/notificationPreferences";
import { isQuietNow } from "../lib/quietHours";

/** Records a push in the user's history and delivers it (respecting muted kinds and quiet hours); see docs/ARCHITEKTURA.md. */
async function sendExpoPush(userId: string, tokens: string[], title: string, body: string, data?: Record<string, string>) {
  if (tokens.length === 0) return;
  const messages = tokens.map((to) => ({ to, sound: "default" as const, title, body, data: data ?? {} }));
  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", "accept-encoding": "gzip, deflate" },
      body: JSON.stringify(messages),
    });
    // forget tokens of uninstalled apps so they are not pushed to forever
    const dead = deadPushTokens(tokens, await response.json().catch(() => null));
    await Promise.all(dead.map((token) => storage.deletePushToken(userId, token).catch(() => undefined)));
  } catch (err) {
    console.error("Push send error:", err);
  }
}

export async function sendPushToUserAndRecord(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>,
  notificationType?: string
): Promise<void> {
  // Optional kinds (reminders, summaries) respect the user's choice; quiet hours only hold back the buzz, not the history.
  // A failed lookup (e.g. the table is not migrated yet) must never block the notification itself.
  const optionalType = notificationType ?? data?.type;
  const preferences = await storage.getNotificationPreferences(userId).catch(() => null);
  if (preferences && isOptionalNotificationType(optionalType) && preferences.muted.includes(optionalType!)) return;
  const quiet = !!preferences && isQuietNow(preferences.quietStart, preferences.quietEnd);

  const [tokens] = await Promise.all([
    storage.getPushTokensByUser(userId),
    storage.createPushNotificationHistory({
      userId,
      title,
      body,
      type: notificationType ?? data?.type ?? null,
    }).catch((err: unknown) => console.error("Failed to record push history:", err)),
  ]);
  if (tokens.length > 0 && !quiet) {
    void sendExpoPush(userId, tokens.map((t) => t.token), title, body, withPushType(data, notificationType));
  }
}
