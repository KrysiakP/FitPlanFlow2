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
  assert.equal(notificationRoute("daily_summary", "trainer"), "/(trainer)/kalendarz-trenera");
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

test("a trainer whose trial is ending is taken to the profile (subscription)", () => {
  assert.equal(notificationRoute("trial_ending", "trainer"), "/(trainer)/profile");
  assert.equal(notificationRoute("trial_ending", "client"), "/(client)/notifications");
});

test("the review request opens the profile, where the trainer is rated", () => {
  assert.equal(notificationRoute("review_request", "client"), "/(client)/profile");
});

test("a chat message opens the chat, and for a trainer the conversation it came from", () => {
  assert.equal(notificationRoute("new_message", "client", { partnerId: "abc" }), "/(client)/chat");
  assert.equal(notificationRoute("new_message", "trainer", { partnerId: "9f1c-22" }), "/(trainer)/chat?partnerId=9f1c-22");
  assert.equal(notificationRoute("new_message", "trainer", {}), "/(trainer)/chat");
  assert.equal(notificationRoute("new_message", "trainer", null), "/(trainer)/chat");
});

test("a partner id that is not a plain id is never put into the route", () => {
  assert.equal(notificationRoute("new_message", "trainer", { partnerId: "x?y=1&z" }), "/(trainer)/chat");
  assert.equal(notificationRoute("new_message", "trainer", { partnerId: 42 }), "/(trainer)/chat");
});

test("a trainer's comment on a workout opens the client's progress", () => {
  assert.equal(notificationRoute("trainer_comment", "client"), "/(client)/progress");
  assert.equal(notificationRoute("report_comment", "client"), "/(client)/weekly-report");
});

test("a payment notice opens the trainer's payments", () => {
  assert.equal(notificationRoute("payment_due", "trainer"), "/(trainer)/payments");
});

test("substitute exercise requests and answers lead to the right place", () => {
  assert.equal(notificationRoute("swap_request", "trainer"), "/(trainer)/clients");
  assert.equal(notificationRoute("swap_answer", "client"), "/(client)/training");
});
