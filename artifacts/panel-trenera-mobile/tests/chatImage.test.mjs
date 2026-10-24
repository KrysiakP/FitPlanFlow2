// node --test tests/chatImage.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { CHAT_IMAGE_MAX_BYTES, chatImageProblem, chatImageSource } from "../lib/chatImage.ts";

test("pictures are allowed, other types and huge files are not", () => {
  assert.equal(chatImageProblem({ mimeType: "image/jpeg", fileSize: 2000 }), null);
  assert.equal(chatImageProblem({ mimeType: "IMAGE/HEIC" }), null);
  assert.equal(chatImageProblem({}), null, "unknown type and size are let through");
  assert.match(chatImageProblem({ mimeType: "video/mp4" }), /JPG, PNG/);
  assert.match(chatImageProblem({ mimeType: "image/svg+xml" }), /JPG, PNG/);
  assert.equal(chatImageProblem({ mimeType: "image/png", fileSize: CHAT_IMAGE_MAX_BYTES }), null);
  assert.match(chatImageProblem({ mimeType: "image/png", fileSize: CHAT_IMAGE_MAX_BYTES + 1 }), /10 MB/);
});

test("our objects are loaded from the server with a token, local files as they are", () => {
  assert.deepEqual(chatImageSource("/objects/uploads/abc", "https://api.example"), { uri: "https://api.example/objects/uploads/abc", needsAuth: true });
  assert.deepEqual(chatImageSource("file:///tmp/a.jpg", "https://api.example"), { uri: "file:///tmp/a.jpg", needsAuth: false });
});
