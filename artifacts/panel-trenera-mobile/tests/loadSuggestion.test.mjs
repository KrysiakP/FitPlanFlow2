// node --test tests/loadSuggestion.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { loadStep, parseRepRange, suggestLoad } from "../lib/loadSuggestion.ts";

test("rep ranges are parsed, in either order, and junk is rejected", () => {
  assert.deepEqual(parseRepRange("8-10"), { low: 8, high: 10 });
  assert.deepEqual(parseRepRange("10 – 8"), { low: 8, high: 10 });
  assert.deepEqual(parseRepRange(12), { low: 12, high: 12 });
  assert.equal(parseRepRange("do upadku"), null);
  assert.equal(parseRepRange(null), null);
});

test("reaching the top of the range adds weight: 2.5 kg, or 5 kg from 100 kg", () => {
  assert.equal(suggestLoad({ plannedReps: "8-10", lastReps: 10, lastLoad: "80 kg" }), "Ostatnio 80 kg × 10: spróbuj 82,5 kg");
  assert.equal(suggestLoad({ plannedReps: 5, lastReps: 5, lastLoad: "100" }), "Ostatnio 100 kg × 5: spróbuj 105 kg");
  assert.equal(loadStep(99.9), 2.5);
});

test("inside the range the advice is one more rep, below it stay and reach the low end", () => {
  assert.match(suggestLoad({ plannedReps: "8-10", lastReps: 9, lastLoad: "80" }), /jedno powtórzenie więcej/);
  assert.match(suggestLoad({ plannedReps: "8-10", lastReps: 6, lastLoad: "80" }), /zostań przy tym ciężarze i dobij do 8/);
});

test("no history or no usable plan gives no advice, and decimals with a comma work", () => {
  assert.equal(suggestLoad({ plannedReps: "8-10", lastReps: null, lastLoad: "80" }), null);
  assert.equal(suggestLoad({ plannedReps: "8-10", lastReps: 10, lastLoad: null }), null);
  assert.equal(suggestLoad({ plannedReps: "AMRAP", lastReps: 10, lastLoad: "80" }), null);
  assert.equal(suggestLoad({ plannedReps: 10, lastReps: 10, lastLoad: "82,5" }), "Ostatnio 82,5 kg × 10: spróbuj 85 kg");
});
