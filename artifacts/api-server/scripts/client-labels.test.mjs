// node --test scripts/client-labels.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { MAX_LABELS, MAX_LABEL_LENGTH, sanitizeLabels } from "../src/lib/clientLabels.ts";

test("labels are trimmed, single-spaced and de-duplicated ignoring case", () => {
  assert.deepEqual(sanitizeLabels(["  VIP ", "vip", "on   line", "", "   "]), ["VIP", "on line"]);
});

test("only five labels of at most 24 characters are kept", () => {
  assert.equal(sanitizeLabels(["a", "b", "c", "d", "e", "f", "g"]).length, MAX_LABELS);
  assert.equal(sanitizeLabels(["x".repeat(60)])[0].length, MAX_LABEL_LENGTH);
});

test("anything that is not a list of strings gives an empty list", () => {
  assert.deepEqual(sanitizeLabels("VIP"), []);
  assert.deepEqual(sanitizeLabels(null), []);
  assert.deepEqual(sanitizeLabels([1, {}, null, "ok"]), ["ok"]);
});
