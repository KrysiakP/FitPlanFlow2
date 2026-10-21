// node --test scripts/mask-email.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { maskEmail } from "../src/lib/maskEmail.ts";

test("only the first letter and the domain are shown", () => {
  assert.equal(maskEmail("jan.kowalski@gmail.com"), "j***@gmail.com");
  assert.equal(maskEmail("a@b.pl"), "a***@b.pl");
});

test("something that is not an address reveals nothing", () => {
  assert.equal(maskEmail("bez-malpy"), "***");
  assert.equal(maskEmail("@x.pl"), "***");
  assert.equal(maskEmail(""), "***");
});
