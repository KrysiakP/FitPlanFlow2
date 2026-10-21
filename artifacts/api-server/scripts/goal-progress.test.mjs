// node --test scripts/goal-progress.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { goalProgress } from "../src/lib/goalProgress.ts";

const NOW = new Date("2026-10-21T12:00:00Z");
const day = (n) => new Date(NOW.getTime() + n * 86400000);

test("losing weight: halfway there, on a straight line to the deadline", () => {
  const result = goalProgress({ startKg: 90, targetKg: 80, currentKg: 85, targetDate: day(30), startedAt: day(-30) }, NOW);
  assert.equal(result.percent, 50);
  assert.equal(result.remainingKg, 5);
  assert.equal(result.daysLeft, 30);
  assert.equal(result.status, "on_track");
});

test("behind schedule when well below the straight line", () => {
  const result = goalProgress({ startKg: 90, targetKg: 80, currentKg: 89, targetDate: day(10), startedAt: day(-50) }, NOW);
  assert.equal(result.status, "behind");
  assert.equal(result.percent, 10);
});

test("gaining weight works the same in the other direction", () => {
  const result = goalProgress({ startKg: 70, targetKg: 76, currentKg: 73, targetDate: null, startedAt: day(-20) }, NOW);
  assert.equal(result.percent, 50);
  assert.equal(result.status, "no_deadline");
  assert.equal(result.remainingKg, 3);
});

test("going the wrong way counts as no progress, not negative progress", () => {
  const result = goalProgress({ startKg: 90, targetKg: 80, currentKg: 93, targetDate: null, startedAt: day(-20) }, NOW);
  assert.equal(result.percent, 0);
  assert.equal(result.remainingKg, 13);
});

test("reaching or passing the target is done, even if the deadline is still ahead", () => {
  const result = goalProgress({ startKg: 90, targetKg: 80, currentKg: 79.5, targetDate: day(5), startedAt: day(-60) }, NOW);
  assert.equal(result.status, "reached");
  assert.equal(result.percent, 100);
  assert.equal(result.remainingKg, 0);
});

test("a missed deadline is reported as overdue", () => {
  const result = goalProgress({ startKg: 90, targetKg: 80, currentKg: 85, targetDate: day(-3), startedAt: day(-60) }, NOW);
  assert.equal(result.status, "overdue");
  assert.equal(result.daysLeft, 0);
});
