import type { IStorage } from "../storage";
import { formatReviewRequest, REVIEW_REQUEST_AFTER_DAYS, REVIEW_REQUEST_WINDOW_DAYS } from "../lib/reviewRequest";

type SendPush = (userId: string, title: string, body: string, data: Record<string, string>, type: string) => Promise<void>;

const REQUEST_TYPE = "review_request";
const DAY_MS = 24 * 60 * 60 * 1000;

/** Daily job: clients whose collaboration is a month old are asked once for a review (never again within a year). */
export async function sendReviewRequests(
  storage: IStorage,
  sendPush: SendPush,
  now: Date = new Date(),
): Promise<{ checked: number; sent: number; skipped: number; errors: number }> {
  const stats = { checked: 0, sent: 0, skipped: 0, errors: 0 };
  const newest = new Date(now.getTime() - REVIEW_REQUEST_AFTER_DAYS * DAY_MS);
  const oldest = new Date(newest.getTime() - REVIEW_REQUEST_WINDOW_DAYS * DAY_MS);
  const candidates = await storage.getReviewRequestCandidates(oldest, newest);
  stats.checked = candidates.length;

  for (const candidate of candidates) {
    try {
      if (await storage.hasRecentPushOfType(candidate.clientId, REQUEST_TYPE, new Date(now.getTime() - 365 * DAY_MS))) {
        stats.skipped += 1;
        continue;
      }
      const message = formatReviewRequest(candidate.trainerFirstName);
      await sendPush(candidate.clientId, message.title, message.body, { type: REQUEST_TYPE, trainerId: candidate.trainerId }, REQUEST_TYPE);
      stats.sent += 1;
    } catch (error) {
      console.error("[REVIEW_REQUESTS] Failed for client", candidate.clientId, error);
      stats.errors += 1;
    }
  }
  return stats;
}
