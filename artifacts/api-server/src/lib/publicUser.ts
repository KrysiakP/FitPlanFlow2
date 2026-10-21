/** Removes everything that must never leave the server from a user record before it is sent as JSON. */
const SECRET_FIELDS = [
  "password",
  "emailVerificationToken",
  "emailVerificationTokenExpiresAt",
  "passwordResetToken",
  "passwordResetTokenExpiresAt",
  "totpSecret",
  "totpBackupCodes",
] as const;

export function stripSecrets<T extends Record<string, any>>(user: T): Omit<T, (typeof SECRET_FIELDS)[number]> {
  const copy: Record<string, any> = { ...user };
  for (const field of SECRET_FIELDS) delete copy[field];
  return copy as Omit<T, (typeof SECRET_FIELDS)[number]>;
}
