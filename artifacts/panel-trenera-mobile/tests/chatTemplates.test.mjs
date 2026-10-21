// node --test tests/chatTemplates.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_TEMPLATES, insertTemplate } from "../lib/chatTemplates.ts";

test("inserting into an empty box replaces, into typed text appends", () => {
  assert.equal(insertTemplate("", "Hej!"), "Hej!");
  assert.equal(insertTemplate("Cześć Aniu. ", "Jak się masz?"), "Cześć Aniu. Jak się masz?");
});

test("the defaults fit a chat message and are all different", () => {
  assert.equal(new Set(DEFAULT_TEMPLATES).size, DEFAULT_TEMPLATES.length);
  assert.ok(DEFAULT_TEMPLATES.every((text) => text.length > 0 && text.length < 200));
});
