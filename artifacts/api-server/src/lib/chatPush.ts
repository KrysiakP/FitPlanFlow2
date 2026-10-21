/** What a chat message looks like on a lock screen: one line, no more than 100 characters. */
export const CHAT_PREVIEW_MAX = 100;

export function chatPushPreview(body: string): string {
  const oneLine = body.replace(/\s+/g, " ").trim();
  if (oneLine === "") return "Nowa wiadomość";
  return oneLine.length <= CHAT_PREVIEW_MAX ? oneLine : `${oneLine.slice(0, CHAT_PREVIEW_MAX - 1).trimEnd()}…`;
}
