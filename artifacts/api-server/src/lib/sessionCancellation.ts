/** A client may cancel a booked session on their own until this many hours before it starts. */
export const CANCELLATION_NOTICE_HOURS = 24;

const HOUR_MS = 60 * 60 * 1000;

/** The last moment a client can still cancel by themselves. */
export function cancellableUntil(scheduledAt: Date): Date {
  return new Date(scheduledAt.getTime() - CANCELLATION_NOTICE_HOURS * HOUR_MS);
}

/** Cancelling is allowed up to, and including, the 24th hour before the start. */
export function canClientCancel(scheduledAt: Date, now: Date = new Date()): boolean {
  return now.getTime() <= cancellableUntil(scheduledAt).getTime();
}
