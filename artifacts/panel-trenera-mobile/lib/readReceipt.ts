/** Read receipt shown under the last message of the user's own that the other side has already opened. */

export interface ReceiptMessage {
  id: string;
  senderId: string;
  createdAt: string | Date;
  readAt?: string | Date | null;
}

/** The newest own message with a `readAt`; earlier ones are implied read, so only this one gets a mark. */
export function lastReadOwnMessageId(messages: ReceiptMessage[] | undefined, ownId: string | undefined): string | null {
  if (!messages || !ownId) return null;
  let newest: ReceiptMessage | null = null;
  for (const message of messages) {
    if (message.senderId !== ownId || !message.readAt) continue;
    if (!newest || new Date(message.createdAt).getTime() >= new Date(newest.createdAt).getTime()) newest = message;
  }
  return newest?.id ?? null;
}
