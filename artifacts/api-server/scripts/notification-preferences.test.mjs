// node --test scripts/notification-preferences.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { isOptionalNotificationType, optionalNotifications, sanitizeMutedTypes } from "../src/lib/notificationPreferences.ts";

test("each role sees only its own optional notifications", () => {
  assert.deepEqual(optionalNotifications("client").map((o) => o.type), ["session_reminder", "report_reminder", "review_request"]);
  assert.deepEqual(optionalNotifications("gym_owner").map((o) => o.type), ["weekly_summary"]);
  assert.deepEqual(optionalNotifications(null), []);
  assert.deepEqual(optionalNotifications("admin"), []);
});

test("only types the role may mute survive, without duplicates", () => {
  assert.deepEqual(sanitizeMutedTypes(["report_reminder", "report_reminder", "plan_assigned", 7, null], "client"), ["report_reminder"]);
  assert.deepEqual(sanitizeMutedTypes(["weekly_summary"], "client"), [], "a client cannot mute trainer-only types");
  assert.deepEqual(sanitizeMutedTypes("report_reminder", "client"), [], "not a list");
});

test("transactional types are never optional", () => {
  for (const type of ["plan_assigned", "session_booked", "session_cancelled", "new_message", "invitation_accepted", null, undefined]) {
    assert.equal(isOptionalNotificationType(type), false, String(type));
  }
  assert.equal(isOptionalNotificationType("session_reminder"), true);
});
