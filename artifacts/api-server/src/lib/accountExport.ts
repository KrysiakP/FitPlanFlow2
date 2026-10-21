/**
 * Data portability (GDPR art. 20): the signed-in user can download what the app stores about them.
 * Only an allowlist of account fields is exported, so password hashes, one-time tokens and Stripe ids never leave the server.
 */

const ACCOUNT_FIELDS = [
  "id",
  "email",
  "firstName",
  "lastName",
  "profileImageUrl",
  "role",
  "emailVerified",
  "subscriptionStatus",
  "subscriptionTier",
  "trialEndsAt",
  "createdAt",
] as const;

export function exportableAccount(user: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const field of ACCOUNT_FIELDS) result[field] = user[field] ?? null;
  return result;
}

export interface AccountExport {
  exportedAt: string;
  account: Record<string, unknown>;
  [section: string]: unknown;
}

export function buildAccountExport(user: Record<string, unknown>, sections: Record<string, unknown>, now: Date = new Date()): AccountExport {
  return { exportedAt: now.toISOString(), account: exportableAccount(user), ...sections };
}

export function exportFileName(now: Date = new Date()): string {
  return `panel-trenera-moje-dane-${now.toISOString().slice(0, 10)}.json`;
}
