// node --test tests/notificationRoute.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { notificationRoute } from "../lib/notificationRoute.ts";

test("a client is taken to the screen the push is about", () => {
  assert.equal(notificationRoute("report_reminder", "client"), "/(client)/weekly-report");
  assert.equal(notificationRoute("workout_reminder", "client"), "/(client)/training");
});

test("the same push type leads to a different place for a trainer", () => {
  assert.equal(notificationRoute("session_booked", "trainer"), "/(trainer)/kalendarz-trenera");
  assert.equal(notificationRoute("session_booked", "client"), "/(client)");
});

test("studio owners go to the studio analytics for the weekly summary", () => {
  assert.equal(notificationRoute("weekly_summary", "gym_owner"), "/(gym)/analytics");
});

test("unknown or missing types fall back to the notification history, and nobody is signed in means nowhere to go", () => {
  assert.equal(notificationRoute("something_new", "client"), "/(client)/notifications");
  assert.equal(notificationRoute(undefined, "trainer"), "/(trainer)/notifications");
  assert.equal(notificationRoute("weekly_summary", null), null);
  assert.equal(notificationRoute("anything", "gym_owner"), null, "the studio has no notification screen");
});

test("a type that exists only for another role does not leak across roles", () => {
  assert.equal(notificationRoute("report_reminder", "trainer"), "/(trainer)/notifications");
});
