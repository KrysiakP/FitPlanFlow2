// node --test scripts/email-fallback.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { shouldEmailFallback } from "../src/lib/emailFallback.ts";

const base = { type: "session_booked", pushTokenCount: 0, muted: [], emailVerified: true, hasEmail: true };

test("an important notice goes out by e-mail when the user has no phone app", () => {
  assert.equal(shouldEmailFallback(base), true);
  for (const type of ["session_cancelled", "session_reminder", "plan_assigned", "invitation_accepted"]) {
    assert.equal(shouldEmailFallback({ ...base, type }), true, type);
  }
});

test("a user with the app gets no e-mail", () => {
  assert.equal(shouldEmailFallback({ ...base, pushTokenCount: 1 }), false);
});

test("other kinds never become e-mails", () => {
  for (const type of ["new_message", "weekly_summary", "daily_summary", "client_reminder", "studio_announcement", null, undefined]) {
    assert.equal(shouldEmailFallback({ ...base, type }), false, String(type));
  }
});

test("opting out, or muting that very kind, stops the e-mail", () => {
  assert.equal(shouldEmailFallback({ ...base, muted: ["email_fallback"] }), false);
  assert.equal(shouldEmailFallback({ ...base, type: "session_reminder", muted: ["session_reminder"] }), false);
  assert.equal(shouldEmailFallback({ ...base, muted: ["report_reminder"] }), true);
});

test("only a verified address is written to", () => {
  assert.equal(shouldEmailFallback({ ...base, emailVerified: false }), false);
  assert.equal(shouldEmailFallback({ ...base, hasEmail: false }), false);
});
