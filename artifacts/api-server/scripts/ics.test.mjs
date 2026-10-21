// node --test scripts/ics.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { buildIcs, escapeIcsText, foldIcsLine, icsDate } from "../src/lib/ics.ts";

test("dates are written in UTC", () => {
  assert.equal(icsDate(new Date("2026-10-21T15:30:05Z")), "20261021T153005Z");
});

test("commas, semicolons, backslashes and newlines are escaped", () => {
  assert.equal(escapeIcsText("Siłownia, sala 2; wejście B\\C\nnotatka"), "Siłownia\\, sala 2\; wejście B\\\\C\\nnotatka");
});

test("long lines are folded at 75 octets without cutting a multi-byte letter", () => {
  const folded = foldIcsLine("SUMMARY:" + "ł".repeat(80));
  for (const line of folded.split("\r\n")) assert.ok(Buffer.byteLength(line, "utf8") <= 75, `too long: ${line.length}`);
  assert.equal(folded.replace(/\r\n /g, ""), "SUMMARY:" + "ł".repeat(80), "unfolding restores the text");
});

test("a calendar has the envelope, the event, its end time and a reminder", () => {
  const ics = buildIcs(
    [{ uid: "abc", start: new Date("2026-10-21T15:00:00Z"), durationMinutes: 45, title: "Trening z Anną", location: "Klub Fit, sala 1" }],
    new Date("2026-10-20T08:00:00Z"),
  );
  assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\n") && ics.endsWith("END:VCALENDAR\r\n"));
  assert.ok(ics.includes("UID:abc@paneltrenera.pl"));
  assert.ok(ics.includes("DTSTART:20261021T150000Z") && ics.includes("DTEND:20261021T154500Z"));
  assert.ok(ics.includes("LOCATION:Klub Fit\\, sala 1"));
  assert.ok(ics.includes("BEGIN:VALARM"));
  assert.ok(!ics.includes("\n") || ics.split("\n").every((line) => line === "" || line.endsWith("\r")), "CRLF line endings only");
});

test("no sessions still gives a valid, empty calendar", () => {
  const ics = buildIcs([]);
  assert.ok(ics.includes("BEGIN:VCALENDAR") && !ics.includes("BEGIN:VEVENT"));
});
