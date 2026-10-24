// node --test tests/chatImage.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { CHAT_IMAGE_MAX_BYTES, chatImageProblem, uploadChatImage } from "../src/lib/chatImage.ts";

const image = (overrides = {}) => ({ type: "image/jpeg", size: 1000, ...overrides });

test("pictures are allowed, other files and huge ones are not", () => {
  assert.equal(chatImageProblem(image()), null);
  assert.equal(chatImageProblem(image({ type: "IMAGE/PNG" })), null);
  assert.equal(chatImageProblem(image({ type: "image/heic" })), null);
  assert.match(chatImageProblem(image({ type: "application/pdf" })), /JPG, PNG/);
  assert.match(chatImageProblem(image({ type: "image/svg+xml" })), /JPG, PNG/, "svg can carry scripts");
  assert.match(chatImageProblem(image({ type: "" })), /JPG, PNG/);
  assert.match(chatImageProblem(image({ size: 0 })), /pusty/);
  assert.equal(chatImageProblem(image({ size: CHAT_IMAGE_MAX_BYTES })), null);
  assert.match(chatImageProblem(image({ size: CHAT_IMAGE_MAX_BYTES + 1 })), /10 MB/);
});

test("the upload asks for an address, puts the file there and returns the object path", async () => {
  const calls = [];
  const file = Object.assign(new Blob(["x"], { type: "image/png" }), { name: "a.png" });
  const fetchFn = async (url, init) => {
    calls.push([url, init.method]);
    if (url === "/api/objects/upload") return new Response(JSON.stringify({ uploadURL: "https://storage.example/put", objectPath: "/objects/uploads/abc", previewUrl: "https://storage.example/get" }), { status: 200 });
    return new Response(null, { status: 200 });
  };
  assert.deepEqual(await uploadChatImage(file, fetchFn), { objectPath: "/objects/uploads/abc", previewUrl: "https://storage.example/get" });
  assert.deepEqual(calls, [["/api/objects/upload", "POST"], ["https://storage.example/put", "PUT"]]);
});

test("a failed step stops the upload with a readable message", async () => {
  const file = Object.assign(new Blob(["x"], { type: "image/png" }), { name: "a.png" });
  await assert.rejects(uploadChatImage(file, async () => new Response(null, { status: 500 })), /przygotować/);
  const failingPut = async (url) => (url === "/api/objects/upload" ? new Response(JSON.stringify({ uploadURL: "u", objectPath: "/objects/uploads/x" }), { status: 200 }) : new Response(null, { status: 403 }));
  await assert.rejects(uploadChatImage(file, failingPut), /przesłać zdjęcia/);
  await assert.rejects(uploadChatImage(Object.assign(new Blob(["x"], { type: "text/plain" }), { name: "a.txt" }), failingPut), /JPG, PNG/);
});
