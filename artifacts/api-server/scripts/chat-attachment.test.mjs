// node --test scripts/chat-attachment.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { checkChatPayload } from "../src/lib/chatAttachment.ts";
import { chatPushPreview } from "../src/lib/chatPush.ts";
import { canOpenObject } from "../src/lib/objectAccess.ts";

const PATH = "/objects/uploads/3f2b8c1e-5a47-4d9b-8e21-0c6f7a9d1b34";

test("a text message and an image without text are fine, an empty one is not", () => {
  assert.deepEqual(checkChatPayload("  Cześć  ", undefined), { ok: true, body: "Cześć", attachmentUrl: null });
  assert.deepEqual(checkChatPayload("", PATH), { ok: true, body: "", attachmentUrl: PATH });
  assert.deepEqual(checkChatPayload(undefined, PATH), { ok: true, body: "", attachmentUrl: PATH });
  assert.deepEqual(checkChatPayload("Zobacz", PATH), { ok: true, body: "Zobacz", attachmentUrl: PATH });
  assert.equal(checkChatPayload("   ", null).ok, false);
  assert.equal(checkChatPayload("", "").ok, false);
  assert.equal(checkChatPayload(undefined, undefined).ok, false);
});

test("only an uploaded object path is accepted as an image", () => {
  for (const bad of ["https://evil.example/x.png", "/objects/uploads/../secret", "/objects/uploads/abc", `${PATH}/extra`, "javascript:alert(1)", "/objects/other/3f2b8c1e-5a47-4d9b-8e21-0c6f7a9d1b34", 5, {}]) {
    assert.equal(checkChatPayload("x", bad).ok, false, String(bad));
  }
});

test("wrong types and too long a text are refused", () => {
  assert.equal(checkChatPayload(5, undefined).ok, false);
  assert.equal(checkChatPayload("x".repeat(5001), undefined).ok, false);
  assert.equal(checkChatPayload("x".repeat(5000), undefined).ok, true);
});

test("the lock screen says a photo came when there is no text", () => {
  assert.equal(chatPushPreview("", true), "Przesłano zdjęcie");
  assert.equal(chatPushPreview("   ", true), "Przesłano zdjęcie");
  assert.equal(chatPushPreview("Cześć", true), "Cześć");
  assert.equal(chatPushPreview("", false), "Nowa wiadomość");
  assert.equal(chatPushPreview(""), "Nowa wiadomość");
});

test("the sender and the recipient of a chat image may open it, nobody else", () => {
  const base = { userId: "u1", visibility: "private", ownerId: "owner", reportPhotoOwnerId: null, userIsTrainerOfOwner: false };
  assert.equal(canOpenObject({ ...base, chatParticipant: true }), true);
  assert.equal(canOpenObject({ ...base, chatParticipant: false }), false);
  assert.equal(canOpenObject({ ...base }), false, "private stays private without the chat flag");
  assert.equal(canOpenObject({ ...base, userId: undefined, chatParticipant: true }), false, "signed-in only");
});
