// node --test tests/readReceipt.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { lastReadOwnMessageId } from "../lib/readReceipt.ts";

const msg = (id, senderId, createdAt, readAt = null) => ({ id, senderId, createdAt, readAt });

test("nothing to mark without messages or a user", () => {
  assert.equal(lastReadOwnMessageId(undefined, "me"), null);
  assert.equal(lastReadOwnMessageId([], "me"), null);
  assert.equal(lastReadOwnMessageId([msg("a", "me", "2026-10-01T10:00:00Z", "2026-10-01T11:00:00Z")], undefined), null);
});

test("the newest own message that was read gets the mark", () => {
  const messages = [
    msg("a", "me", "2026-10-01T10:00:00Z", "2026-10-01T10:05:00Z"),
    msg("b", "them", "2026-10-01T10:10:00Z", "2026-10-01T10:11:00Z"),
    msg("c", "me", "2026-10-01T10:20:00Z", "2026-10-01T10:25:00Z"),
    msg("d", "me", "2026-10-01T10:30:00Z", null),
  ];
  assert.equal(lastReadOwnMessageId(messages, "me"), "c");
});

test("messages from the other side never get a mark, and unread ones neither", () => {
  assert.equal(lastReadOwnMessageId([msg("x", "them", "2026-10-01T10:00:00Z", "2026-10-01T10:01:00Z")], "me"), null);
  assert.equal(lastReadOwnMessageId([msg("y", "me", "2026-10-01T10:00:00Z", null)], "me"), null);
});

test("the order of the list does not matter", () => {
  const messages = [msg("late", "me", "2026-10-02T10:00:00Z", "2026-10-02T10:05:00Z"), msg("early", "me", "2026-10-01T10:00:00Z", "2026-10-01T10:05:00Z")];
  assert.equal(lastReadOwnMessageId(messages, "me"), "late");
});
