/**
 * Important notices (a booked or cancelled session, a new plan) also reach people who have no app on a phone:
 * when the user has no push token, the notice is sent by e-mail. Users can switch it off in notification settings.
 */

export const EMAIL_FALLBACK_OPT_OUT = "email_fallback";

const EMAIL_FALLBACK_TYPES = new Set(["session_booked", "session_cancelled", "session_reminder", "plan_assigned", "invitation_accepted"]);

export interface EmailFallbackInput {
  type: string | null | undefined;
  pushTokenCount: number;
  muted: string[];
  emailVerified: boolean;
  hasEmail: boolean;
}

export function shouldEmailFallback({ type, pushTokenCount, muted, emailVerified, hasEmail }: EmailFallbackInput): boolean {
  if (!type || !EMAIL_FALLBACK_TYPES.has(type)) return false;
  if (pushTokenCount > 0) return false; // the phone gets it
  if (muted.includes(type) || muted.includes(EMAIL_FALLBACK_OPT_OUT)) return false;
  return hasEmail && emailVerified;
}
