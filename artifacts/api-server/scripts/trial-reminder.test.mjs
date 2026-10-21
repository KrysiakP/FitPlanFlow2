// node --test scripts/trial-reminder.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { daysLeft, formatTrialReminder } from "../src/lib/trialReminder.ts";

const NOW = new Date("2026-10-21T10:00:00Z");
const in_ = (hours) => new Date(NOW.getTime() + hours * 3600000);

test("days left are rounded up, so the last day still counts", () => {
  assert.equal(daysLeft(in_(1), NOW), 1);
  assert.equal(daysLeft(in_(24), NOW), 1);
  assert.equal(daysLeft(in_(25), NOW), 2);
  assert.equal(daysLeft(in_(-1), NOW), 0, "already over");
});

test("the reminder says tomorrow or in N days", () => {
  assert.match(formatTrialReminder(in_(20), NOW).body, /kończy się jutro/);
  assert.match(formatTrialReminder(in_(60), NOW).body, /za 3 dni/);
});

test("nothing is sent too early or after the trial ended", () => {
  assert.equal(formatTrialReminder(in_(24 * 10), NOW), null);
  assert.equal(formatTrialReminder(in_(24 * 3 + 5), NOW), null, "four days left is still early");
  assert.equal(formatTrialReminder(in_(-5), NOW), null);
});
