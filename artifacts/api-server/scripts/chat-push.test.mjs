// node --test scripts/chat-push.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { CHAT_PREVIEW_MAX, chatPushPreview } from "../src/lib/chatPush.ts";

test("a short message is shown as it is, on one line", () => {
  assert.equal(chatPushPreview("Cześć,\n\njak trening?  "), "Cześć, jak trening?");
});

test("a long message is cut with an ellipsis", () => {
  const preview = chatPushPreview("a".repeat(300));
  assert.equal(preview.length, CHAT_PREVIEW_MAX);
  assert.ok(preview.endsWith("…"));
});

test("an empty message still has something to show", () => {
  assert.equal(chatPushPreview("   "), "Nowa wiadomość");
});
