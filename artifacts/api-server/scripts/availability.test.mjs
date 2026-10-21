// node --test scripts/availability.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { freeSlots, validateWindows, warsawToUtc } from "../src/lib/availability.ts";

test("Warsaw wall-clock time becomes the right UTC moment in winter and in summer", () => {
  assert.equal(warsawToUtc(2026, 1, 12, 17 * 60).toISOString(), "2026-01-12T16:00:00.000Z");
  assert.equal(warsawToUtc(2026, 7, 13, 17 * 60).toISOString(), "2026-07-13T15:00:00.000Z");
});

test("the days of the clock changes keep the wall-clock hours", () => {
  // 2026-03-29: clocks go forward at 02:00; 2026-10-25: back at 03:00
  assert.equal(warsawToUtc(2026, 3, 29, 10 * 60).toISOString(), "2026-03-29T08:00:00.000Z");
  assert.equal(warsawToUtc(2026, 10, 25, 10 * 60).toISOString(), "2026-10-25T09:00:00.000Z");
  assert.equal(warsawToUtc(2026, 10, 24, 10 * 60).toISOString(), "2026-10-24T08:00:00.000Z");
});

test("windows are validated", () => {
  const ok = { dayOfWeek: 1, startMinute: 17 * 60, endMinute: 20 * 60, slotMinutes: 60 };
  assert.deepEqual(validateWindows([ok]), [ok]);
  assert.deepEqual(validateWindows([]), []);
  for (const bad of [
    { ...ok, dayOfWeek: 0 }, { ...ok, dayOfWeek: 8 }, { ...ok, endMinute: ok.startMinute }, { ...ok, startMinute: -1 },
    { ...ok, endMinute: 25 * 60 }, { ...ok, slotMinutes: 10 }, { ...ok, slotMinutes: 300 }, { ...ok, slotMinutes: 240 }, { ...ok, dayOfWeek: "1" },
  ]) assert.equal(validateWindows([bad]), null, JSON.stringify(bad));
  assert.equal(validateWindows("nie lista"), null);
  assert.equal(validateWindows(Array.from({ length: 41 }, () => ok)), null, "too many windows");
});

// Monday 2026-01-12, 08:00 Warsaw (= 07:00 UTC)
const now = new Date("2026-01-12T07:00:00Z");
const monday = { dayOfWeek: 1, startMinute: 17 * 60, endMinute: 20 * 60, slotMinutes: 60 };

test("a window yields back-to-back slots, today and on the next matching days", () => {
  const slots = freeSlots([monday], [], now, 14);
  assert.deepEqual(slots.slice(0, 3).map((slot) => slot.startsAt), ["2026-01-12T16:00:00.000Z", "2026-01-12T17:00:00.000Z", "2026-01-12T18:00:00.000Z"]);
  assert.equal(slots.length, 6, "two Mondays in 14 days, three slots each");
  assert.ok(slots.every((slot) => slot.durationMinutes === 60));
});

test("a booked session takes its slot, an overlapping one takes two", () => {
  const taken = freeSlots([monday], [{ scheduledAt: "2026-01-12T17:00:00Z", durationMinutes: 60 }], now, 7);
  assert.deepEqual(taken.map((slot) => slot.startsAt), ["2026-01-12T16:00:00.000Z", "2026-01-12T18:00:00.000Z"]);
  const overlap = freeSlots([monday], [{ scheduledAt: "2026-01-12T17:30:00Z", durationMinutes: 60 }], now, 7);
  assert.deepEqual(overlap.map((slot) => slot.startsAt), ["2026-01-12T16:00:00.000Z"], "17:30-18:30 UTC blocks both the 17:00 and the 18:00 slot");
});

test("slots too close to now are not offered", () => {
  const evening = new Date("2026-01-12T17:30:00Z"); // 18:30 Warsaw: only the 19:00 slot is left today, 30 minutes away
  assert.deepEqual(freeSlots([monday], [], evening, 1, 2), [], "the minimum notice is two hours");
  assert.deepEqual(freeSlots([monday], [], evening, 1, 0).map((slot) => slot.startsAt), ["2026-01-12T18:00:00.000Z"], "with no notice it remains");
  const afternoon = new Date("2026-01-12T15:30:00Z"); // 16:30 Warsaw: 17:00 is too close, 18:00 and 19:00 are not
  assert.deepEqual(freeSlots([monday], [], afternoon, 1, 2).map((slot) => slot.startsAt), ["2026-01-12T18:00:00.000Z"]);
});

test("slots stay on Warsaw wall-clock hours across the summer time change", () => {
  const before = new Date("2026-03-23T07:00:00Z"); // Monday
  const starts = freeSlots([{ dayOfWeek: 1, startMinute: 17 * 60, endMinute: 18 * 60, slotMinutes: 60 }], [], before, 14).map((slot) => slot.startsAt);
  assert.deepEqual(starts, ["2026-03-23T16:00:00.000Z", "2026-03-30T15:00:00.000Z"], "17:00 Warsaw is 16:00 UTC before and 15:00 UTC after the change");
});

test("no windows means no slots", () => {
  assert.deepEqual(freeSlots([], [], now, 14), []);
});
