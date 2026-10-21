// node --test scripts/object-access.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { canOpenObject } from "../src/lib/objectAccess.ts";

const base = { userId: "u1", visibility: "public", ownerId: "owner", reportPhotoOwnerId: null, userIsTrainerOfOwner: false };

test("public files such as exercise videos are open to any signed-in user, not to anonymous ones", () => {
  assert.equal(canOpenObject(base), true);
  assert.equal(canOpenObject({ ...base, userId: undefined }), false);
});

test("a progress photo is open to its owner and to the owner's trainer only", () => {
  const photo = { ...base, reportPhotoOwnerId: "owner" };
  assert.equal(canOpenObject({ ...photo, userId: "owner" }), true);
  assert.equal(canOpenObject({ ...photo, userIsTrainerOfOwner: true }), true);
  assert.equal(canOpenObject(photo), false, "another user, even though the old ACL says public");
});

test("a private file follows its ACL owner", () => {
  const file = { ...base, visibility: "private" };
  assert.equal(canOpenObject({ ...file, userId: "owner" }), true);
  assert.equal(canOpenObject({ ...file, userIsTrainerOfOwner: true }), true);
  assert.equal(canOpenObject(file), false);
});

test("a file without any ACL is not open to strangers", () => {
  assert.equal(canOpenObject({ ...base, visibility: undefined, ownerId: undefined }), false);
});
