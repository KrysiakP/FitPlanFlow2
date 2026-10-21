// node --test scripts/daily-summary.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { endOfWarsawDay, formatDailySummary } from "../src/lib/dailySummary.ts";

test("nothing on the calendar and no unread reports means no message", () => {
  assert.equal(formatDailySummary({ trainerId: "t", sessions: 0, firstAt: null, unreadReports: 0 }), null);
});

test("sessions are listed with the time of the first one on the Warsaw clock", () => {
  const message = formatDailySummary({ trainerId: "t", sessions: 3, firstAt: new Date("2026-10-21T05:30:00Z"), unreadReports: 0 });
  assert.equal(message?.title, "Twój dzień");
  assert.equal(message?.body, "Dziś: 3 sesje w kalendarzu, pierwszy o 07:30.");
});

test("reports alone are enough, and both parts are joined", () => {
  assert.equal(formatDailySummary({ trainerId: "t", sessions: 0, firstAt: null, unreadReports: 1 })?.body, "Dziś: 1 nieotwarty raport.");
  const both = formatDailySummary({ trainerId: "t", sessions: 1, firstAt: new Date("2026-07-01T12:00:00Z"), unreadReports: 5 });
  assert.equal(both?.body, "Dziś: 1 sesja w kalendarzu, pierwszy o 14:00, 5 nieotwartych raportów.");
});

test("the day ends at Warsaw midnight, in winter and in summer", () => {
  assert.equal(endOfWarsawDay(new Date("2026-01-15T10:00:00Z")).toISOString(), "2026-01-15T23:00:00.000Z");
  assert.equal(endOfWarsawDay(new Date("2026-07-15T10:00:00Z")).toISOString(), "2026-07-15T22:00:00.000Z");
  // 23:30 UTC in summer is already the next day in Warsaw
  assert.equal(endOfWarsawDay(new Date("2026-07-15T23:30:00Z")).toISOString(), "2026-07-16T22:00:00.000Z");
});
