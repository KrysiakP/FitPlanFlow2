// node --test tests/chatTemplates.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { addTemplate, DEFAULT_TEMPLATES, insertTemplate, MAX_CUSTOM_TEMPLATES, MAX_TEMPLATE_LENGTH } from "../src/lib/chatTemplates.ts";

test("a saved template is cleaned up", () => {
  assert.deepEqual(addTemplate([], "  Dzień   dobry,  jak   leci?  "), ["Dzień dobry, jak leci?"]);
});

test("empty text and duplicates (also of the defaults, ignoring case) are not added", () => {
  assert.deepEqual(addTemplate(["Cześć"], "   "), ["Cześć"]);
  assert.deepEqual(addTemplate(["Cześć"], "cześć"), ["Cześć"]);
  assert.deepEqual(addTemplate([], DEFAULT_TEMPLATES[0].toUpperCase()), []);
});

test("only the newest few are kept, and long text is cut", () => {
  let list = [];
  for (let i = 0; i < MAX_CUSTOM_TEMPLATES + 3; i += 1) list = addTemplate(list, `szablon ${i}`);
  assert.equal(list.length, MAX_CUSTOM_TEMPLATES);
  assert.equal(list[list.length - 1], `szablon ${MAX_CUSTOM_TEMPLATES + 2}`);
  assert.equal(addTemplate([], "x".repeat(1000))[0].length, MAX_TEMPLATE_LENGTH);
});

test("inserting into an empty box replaces, into typed text appends", () => {
  assert.equal(insertTemplate("", "Hej!"), "Hej!");
  assert.equal(insertTemplate("Cześć Aniu. ", "Jak się masz?"), "Cześć Aniu. Jak się masz?");
});
