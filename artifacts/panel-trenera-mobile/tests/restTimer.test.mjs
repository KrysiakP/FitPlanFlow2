// node --test tests/restTimer.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { remainingSeconds, restDeadline, REST_END_VIBRATION } from "../lib/restTimer.ts";

test("the deadline is the start plus the rest", () => {
  assert.equal(restDeadline(90, 1_000_000), 1_090_000);
  assert.equal(restDeadline(0, 5), 5);
  assert.equal(restDeadline(-5, 5), 5, "a negative rest is no rest");
});

test("the time left is counted from the deadline, so it stays right after the app was in the background", () => {
  const start = 1_000_000;
  const deadline = restDeadline(90, start);
  assert.equal(remainingSeconds(deadline, start), 90);
  assert.equal(remainingSeconds(deadline, start + 1_000), 89);
  // the phone was locked for 70 seconds and nothing ticked in between
  assert.equal(remainingSeconds(deadline, start + 70_000), 20);
});

test("partial seconds round up and the result never goes below zero", () => {
  assert.equal(remainingSeconds(10_000, 9_001), 1);
  assert.equal(remainingSeconds(10_000, 10_000), 0);
  assert.equal(remainingSeconds(10_000, 99_000), 0);
});

test("the end-of-rest vibration is a pattern of pulses", () => {
  assert.ok(REST_END_VIBRATION.length >= 3);
  assert.ok(REST_END_VIBRATION.every((ms) => Number.isInteger(ms) && ms >= 0));
});
