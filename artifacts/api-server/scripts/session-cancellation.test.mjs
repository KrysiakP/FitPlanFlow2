// node --test scripts/session-cancellation.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { cancellableUntil, canClientCancel, CANCELLATION_NOTICE_HOURS } from "../src/lib/sessionCancellation.ts";

const start = new Date("2026-10-25T10:00:00Z");

test("the notice period is 24 hours", () => {
  assert.equal(CANCELLATION_NOTICE_HOURS, 24);
  assert.equal(cancellableUntil(start).toISOString(), "2026-10-24T10:00:00.000Z");
});

test("cancelling is allowed well ahead and exactly 24 hours before", () => {
  assert.equal(canClientCancel(start, new Date("2026-10-20T10:00:00Z")), true);
  assert.equal(canClientCancel(start, new Date("2026-10-24T10:00:00Z")), true);
});

test("cancelling less than 24 hours before, or after the start, is refused", () => {
  assert.equal(canClientCancel(start, new Date("2026-10-24T10:00:01Z")), false);
  assert.equal(canClientCancel(start, new Date("2026-10-25T09:00:00Z")), false);
  assert.equal(canClientCancel(start, new Date("2026-10-26T10:00:00Z")), false);
});
