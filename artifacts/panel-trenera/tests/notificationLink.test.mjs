// node --test tests/notificationLink.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { notificationLink } from "../src/lib/notificationLink.ts";

test("client notifications lead to the matching page", () => {
  assert.equal(notificationLink("plan_assigned", "client"), "/my-plan");
  assert.equal(notificationLink("report_reminder", "client"), "/weekly-report");
  assert.equal(notificationLink("new_message", "client"), "/chat");
});

test("the same kind can lead elsewhere for a trainer", () => {
  assert.equal(notificationLink("invitation_accepted", "trainer"), "/clients");
  assert.equal(notificationLink("invitation_accepted", "client"), null);
});

test("unknown or missing kinds lead nowhere", () => {
  assert.equal(notificationLink("something_new", "client"), null);
  assert.equal(notificationLink(null, "client"), null);
  assert.equal(notificationLink(undefined, "trainer"), null);
});
