// node --test scripts/quiet-hours.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { isQuietNow, sanitizeQuietHours, warsawMinutes } from "../src/lib/quietHours.ts";

const at = (iso) => new Date(iso);

test("a window that crosses midnight covers the night on both sides", () => {
  const start = 22 * 60, end = 7 * 60;
  assert.equal(isQuietNow(start, end, at("2026-10-21T21:30:00Z")), true, "23:30 in Warsaw (CEST)");
  assert.equal(isQuietNow(start, end, at("2026-10-21T03:00:00Z")), true, "05:00 in Warsaw");
  assert.equal(isQuietNow(start, end, at("2026-10-21T10:00:00Z")), false, "12:00 in Warsaw");
  assert.equal(isQuietNow(start, end, at("2026-10-21T05:00:00Z")), false, "07:00 sharp is already awake");
});

test("a daytime window and switched-off values", () => {
  assert.equal(isQuietNow(13 * 60, 15 * 60, at("2026-10-21T12:00:00Z")), true, "14:00 in Warsaw");
  assert.equal(isQuietNow(null, null), false);
  assert.equal(isQuietNow(600, 600, at("2026-10-21T08:00:00Z")), false, "an empty window never silences");
});

test("winter time is handled by the timezone, not by a fixed offset", () => {
  assert.equal(warsawMinutes(at("2026-01-15T21:30:00Z")), 22 * 60 + 30, "CET is UTC+1");
  assert.equal(warsawMinutes(at("2026-07-15T21:30:00Z")), 23 * 60 + 30, "CEST is UTC+2");
});

test("only preset windows are accepted; null switches off; junk is ignored", () => {
  assert.deepEqual(sanitizeQuietHours({ start: 1320, end: 420 }), { start: 1320, end: 420 });
  assert.equal(sanitizeQuietHours({ start: 1, end: 2 }), undefined);
  assert.equal(sanitizeQuietHours(null), null);
  assert.equal(sanitizeQuietHours("22:00"), undefined);
  assert.equal(sanitizeQuietHours(undefined), undefined);
});
