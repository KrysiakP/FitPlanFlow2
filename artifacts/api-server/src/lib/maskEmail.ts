/** "jan.kowalski@gmail.com" -> "j***@gmail.com": enough for the owner of the address to recognise it, not enough to learn it. */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  if (at < 1) return "***";
  return `${email[0]}***${email.slice(at)}`;
}
