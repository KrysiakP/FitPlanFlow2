// node --test tests/slots.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { groupSlotsByDay, slotTimeLabel, slotDayKey } from "../lib/slots.ts";

const slot = (startsAt) => ({ startsAt, durationMinutes: 60 });

test("slots are grouped by Warsaw day in time order", () => {
  const days = groupSlotsByDay([slot("2026-01-19T17:00:00Z"), slot("2026-01-12T16:00:00Z"), slot("2026-01-12T17:00:00Z")]);
  assert.deepEqual(days.map((day) => day.key), ["2026-01-12", "2026-01-19"]);
  assert.deepEqual(days[0].slots.map((item) => item.startsAt), ["2026-01-12T16:00:00Z", "2026-01-12T17:00:00Z"]);
});

test("late evening UTC already belongs to the next Warsaw day", () => {
  assert.equal(slotDayKey("2026-01-12T23:30:00Z"), "2026-01-13");
});

test("times are shown on the Warsaw clock, in winter and summer", () => {
  assert.equal(slotTimeLabel("2026-01-12T16:00:00Z"), "17:00");
  assert.equal(slotTimeLabel("2026-07-13T15:00:00Z"), "17:00");
});

test("only the first days are listed and an empty list gives nothing", () => {
  const many = Array.from({ length: 10 }, (_, index) => slot(`2026-01-${String(10 + index).padStart(2, "0")}T16:00:00Z`));
  assert.equal(groupSlotsByDay(many, 3).length, 3);
  assert.deepEqual(groupSlotsByDay([]), []);
});
