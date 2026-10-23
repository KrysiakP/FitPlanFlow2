// node --test scripts/bearer-session.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { attachBearerUser } from "../src/lib/bearerSession.ts";

test("the user id can be read, but does not show in the session's stored form", () => {
  const session = { cookie: { maxAge: 1000 } };
  const before = JSON.stringify(session);
  attachBearerUser(session, "user-1");
  assert.equal(session.userId, "user-1");
  assert.equal(JSON.stringify(session), before, "the session looks unmodified, so it is not saved");
  assert.deepEqual(Object.keys(session), ["cookie"]);
});

test("a real login still stores the user id the ordinary way", () => {
  const session = {};
  session.userId = "user-2";
  assert.equal(JSON.stringify(session), '{"userId":"user-2"}');
});

test("the value can be replaced and the property survives a spread read", () => {
  const session = {};
  attachBearerUser(session, "a");
  attachBearerUser(session, "b");
  assert.equal(session.userId, "b");
  assert.equal({ ...session }.userId, undefined, "copies do not carry it, which is the point");
});
