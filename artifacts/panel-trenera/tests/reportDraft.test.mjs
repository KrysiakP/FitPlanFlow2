// node --test tests/reportDraft.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { DRAFT_MAX_AGE_MS, parseDraft, serializeDraft } from "../src/lib/reportDraft.ts";

const NOW = Date.parse("2026-10-21T12:00:00Z");

test("nothing typed means nothing is stored", () => {
  assert.equal(serializeDraft({}, NOW), null);
  assert.equal(serializeDraft({ weight: "  ", thoughts: "" }, NOW), null);
});

test("values carried over from the last report alone are not a draft", () => {
  assert.equal(serializeDraft({ chest: "100", waist: "88", supplements: "kreatyna" }, NOW), null);
});

test("a typed value is kept together with the rest, and comes back", () => {
  const raw = serializeDraft({ weight: "79,5", waist: "88", mood: "dobry", ignored: "x", leg: 5 }, NOW);
  assert.ok(raw);
  assert.deepEqual(parseDraft(raw, NOW + 1000), { weight: "79,5", waist: "88", mood: "dobry" });
});

test("old, broken or foreign data is ignored", () => {
  const raw = serializeDraft({ weight: "80" }, NOW);
  assert.equal(parseDraft(raw, NOW + DRAFT_MAX_AGE_MS + 1), null);
  assert.equal(parseDraft("not json", NOW), null);
  assert.equal(parseDraft(null, NOW), null);
  assert.equal(parseDraft(JSON.stringify({ savedAt: NOW, values: "oops" }), NOW), null);
  assert.equal(parseDraft(JSON.stringify({ savedAt: NOW, values: { weight: 80, other: "x" } }), NOW), null);
});
