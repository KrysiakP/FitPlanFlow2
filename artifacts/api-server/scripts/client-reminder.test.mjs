// node --test scripts/client-reminder.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { endOfWarsawDay, formatReminderPush, sanitizeReminderText, warsawDayKey } from "../src/lib/clientReminder.ts";

test("the calendar day is decided in Warsaw time", () => {
  assert.equal(warsawDayKey("2026-10-21T22:30:00Z"), "2026-10-22", "00:30 on the 22nd in Warsaw (CEST)");
  assert.equal(warsawDayKey("2026-01-15T22:30:00Z"), "2026-01-15", "23:30 on the 15th in Warsaw (CET)");
});

test("end of day is the last second of the Warsaw day, summer and winter", () => {
  const summer = endOfWarsawDay(new Date("2026-10-21T10:00:00Z"));
  assert.equal(summer.toISOString(), "2026-10-21T21:59:59.000Z");
  const winter = endOfWarsawDay(new Date("2026-01-15T10:00:00Z"));
  assert.equal(winter.toISOString(), "2026-01-15T22:59:59.000Z");
});

test("reminder text is trimmed, collapsed and limited", () => {
  assert.equal(sanitizeReminderText("  zapytaj   o kolano \n"), "zapytaj o kolano");
  assert.equal(sanitizeReminderText("x".repeat(500)).length, 200);
  assert.equal(sanitizeReminderText("   "), null);
  assert.equal(sanitizeReminderText(42), null);
});

test("the push names the client and the reminder", () => {
  assert.deepEqual(formatReminderPush("zapytaj o kolano", "Anna", "Nowak"), { title: "Przypomnienie o podopiecznym", body: "Anna Nowak: zapytaj o kolano" });
});
