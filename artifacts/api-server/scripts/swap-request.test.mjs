// node --test scripts/swap-request.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { isDecision, validateNote, validateReason, validateReplacement } from "../src/lib/swapRequest.ts";

test("a reason is 3 to 300 characters, trimmed to one line", () => {
  assert.equal(validateReason("  kolano   boli\n"), "kolano boli");
  assert.equal(validateReason("ab"), null);
  assert.equal(validateReason("a".repeat(301)), null);
  assert.equal(validateReason("a".repeat(300))?.length, 300);
  assert.equal(validateReason(undefined), null);
  assert.equal(validateReason(5), null);
});

test("a replacement needs a real name", () => {
  assert.equal(validateReplacement("Wyciskanie hantli"), "Wyciskanie hantli");
  assert.equal(validateReplacement(" a "), null);
  assert.equal(validateReplacement("x".repeat(256)), null);
  assert.equal(validateReplacement(null), null);
});

test("a trainer's note is optional but capped", () => {
  assert.equal(validateNote(undefined), null);
  assert.equal(validateNote(""), null);
  assert.equal(validateNote("   "), null);
  assert.equal(validateNote("Uważaj na kolano"), "Uważaj na kolano");
  assert.equal(validateNote("x".repeat(301)), undefined, "too long is invalid");
  assert.equal(validateNote(42), undefined);
});

test("only approve and reject are decisions", () => {
  assert.equal(isDecision("approve"), true);
  assert.equal(isDecision("reject"), true);
  for (const bad of ["Approve", "pending", "", null, undefined, 1]) assert.equal(isDecision(bad), false, String(bad));
});
