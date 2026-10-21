// node --test scripts/report-reminder.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { isSundayInWarsaw, REPORT_REMINDER } from "../src/lib/reportReminder.ts";

test("Sunday is decided in Warsaw time, not UTC", () => {
  assert.equal(isSundayInWarsaw(new Date("2026-10-18T10:00:00Z")), true); // Sunday
  assert.equal(isSundayInWarsaw(new Date("2026-10-18T22:30:00Z")), false, "00:30 on Monday in Warsaw (CEST)");
  assert.equal(isSundayInWarsaw(new Date("2026-10-17T22:30:00Z")), true, "00:30 on Sunday in Warsaw while UTC is still Saturday");
  assert.equal(isSundayInWarsaw(new Date("2026-10-21T10:00:00Z")), false);
});

test("the reminder has a title and a short body", () => {
  assert.ok(REPORT_REMINDER.title.length > 0);
  assert.ok(REPORT_REMINDER.body.length < 120);
});
