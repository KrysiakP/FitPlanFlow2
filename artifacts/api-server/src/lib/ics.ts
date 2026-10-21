/** Minimal iCalendar (RFC 5545) writer for training sessions, so they can be added to Google/Apple/Outlook calendars. */

export interface IcsEvent {
  uid: string;
  start: Date;
  durationMinutes: number;
  title: string;
  location?: string | null;
  description?: string | null;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** 20261021T153000Z */
export function icsDate(date: Date): string {
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
}

export function escapeIcsText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Lines longer than 75 octets are folded with CRLF + space, as the format requires. */
export function foldIcsLine(line: string): string {
  const chunks: string[] = [];
  let current = "";
  let size = 0;
  for (const char of line) {
    const bytes = Buffer.byteLength(char, "utf8");
    if (size + bytes > (chunks.length === 0 ? 75 : 74)) {
      chunks.push(current);
      current = "";
      size = 0;
    }
    current += char;
    size += bytes;
  }
  chunks.push(current);
  return chunks.join("\r\n ");
}

export function buildIcs(events: IcsEvent[], now: Date = new Date()): string {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Panel Trenera//Sesje//PL", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:Panel Trenera"];
  for (const event of events) {
    const end = new Date(event.start.getTime() + event.durationMinutes * 60000);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.uid}@paneltrenera.pl`,
      `DTSTAMP:${icsDate(now)}`,
      `DTSTART:${icsDate(event.start)}`,
      `DTEND:${icsDate(end)}`,
      `SUMMARY:${escapeIcsText(event.title)}`,
    );
    if (event.location) lines.push(`LOCATION:${escapeIcsText(event.location)}`);
    if (event.description) lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
    lines.push("BEGIN:VALARM", "TRIGGER:-PT1H", "ACTION:DISPLAY", "DESCRIPTION:Trening za godzinę", "END:VALARM", "END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldIcsLine).join("\r\n") + "\r\n";
}
