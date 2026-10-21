// node --test scripts/expo-push.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { deadPushTokens, withPushType } from "../src/lib/expoPush.ts";

test("only tokens whose ticket says DeviceNotRegistered are reported dead", () => {
  const response = {
    data: [
      { status: "ok", id: "1" },
      { status: "error", message: "gone", details: { error: "DeviceNotRegistered" } },
      { status: "error", message: "too big", details: { error: "MessageTooBig" } },
    ],
  };
  assert.deepEqual(deadPushTokens(["a", "b", "c"], response), ["b"]);
});

test("garbage responses never delete anything", () => {
  assert.deepEqual(deadPushTokens(["a"], null), []);
  assert.deepEqual(deadPushTokens(["a"], { errors: [{ message: "rate limited" }] }), []);
  assert.deepEqual(deadPushTokens(["a", "b"], { data: [{ status: "ok" }] }), [], "missing tickets are not errors");
});

test("the notification type travels with the push unless the caller already set it", () => {
  assert.deepEqual(withPushType(undefined, "report_reminder"), { type: "report_reminder" });
  assert.deepEqual(withPushType({ sessionId: "s1" }, "session_booked"), { sessionId: "s1", type: "session_booked" });
  assert.deepEqual(withPushType({ type: "custom" }, "other"), { type: "custom" });
  assert.deepEqual(withPushType({ a: "1" }, null), { a: "1" });
});
