/**
 * Expo answers a push request with one "ticket" per message, in the same order. A ticket with the error
 * DeviceNotRegistered means the app was uninstalled or the token expired: that token should never be used again.
 */
export function deadPushTokens(tokens: string[], responseBody: unknown): string[] {
  const tickets = (responseBody as { data?: unknown } | null)?.data;
  if (!Array.isArray(tickets)) return [];
  return tokens.filter((_, index) => {
    const ticket = tickets[index] as { status?: string; details?: { error?: string } } | undefined;
    return ticket?.status === "error" && ticket.details?.error === "DeviceNotRegistered";
  });
}

/** The tap handler in the app routes by `data.type`, so it is always present, even when a caller forgot it. */
export function withPushType(data: Record<string, string> | undefined, type: string | null | undefined): Record<string, string> {
  return type && !data?.type ? { ...data, type } : { ...data };
}
