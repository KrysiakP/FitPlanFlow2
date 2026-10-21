// node --test scripts/personal-record.test.mjs  (Node 24 runs the TypeScript helper directly)
import assert from "node:assert/strict";
import test from "node:test";
import { estimateOneRepMax, evaluatePersonalRecord, parseLoadKg } from "../src/lib/personalRecord.ts";

test("load parsing tolerates units and decimal commas", () => {
  assert.equal(parseLoadKg("62,5 kg"), 62.5);
  assert.equal(parseLoadKg("100"), 100);
  assert.equal(parseLoadKg("25kg"), 25);
  assert.equal(parseLoadKg(""), null);
  assert.equal(parseLoadKg(null), null);
  assert.equal(parseLoadKg("bodyweight"), null);
  assert.equal(parseLoadKg("masa ciała"), null);
  assert.equal(parseLoadKg("0"), null);
});

test("Epley estimate", () => {
  assert.equal(estimateOneRepMax(100, 1), 100);
  assert.equal(Math.round(estimateOneRepMax(100, 5) * 10) / 10, 116.7);
  assert.equal(estimateOneRepMax(100, 0), 0);
  assert.equal(estimateOneRepMax(100, 50), estimateOneRepMax(100, 30), "very high reps are capped");
});

test("a heavier set beats the history", () => {
  const result = evaluatePersonalRecord([{ load: "100", reps: 5 }, { load: "90", reps: 8 }], { load: "105", reps: 5 });
  assert.equal(result.isRecord, true);
  assert.equal(result.previousBest, 116.7);
});

test("more reps at the same weight is a record too", () => {
  assert.equal(evaluatePersonalRecord([{ load: "60", reps: 8 }], { load: "60", reps: 10 }).isRecord, true);
});

test("an equal or weaker set is not a record", () => {
  assert.equal(evaluatePersonalRecord([{ load: "100", reps: 5 }], { load: "100", reps: 5 }).isRecord, false);
  assert.equal(evaluatePersonalRecord([{ load: "100", reps: 5 }], { load: "90", reps: 5 }).isRecord, false);
});

test("the first ever set is a starting point, not a record", () => {
  const result = evaluatePersonalRecord([], { load: "80", reps: 8 });
  assert.equal(result.isRecord, false);
  assert.equal(result.previousBest, null);
});

test("bodyweight sets are never records", () => {
  assert.equal(evaluatePersonalRecord([{ load: "10", reps: 5 }], { load: "bodyweight", reps: 20 }).isRecord, false);
  assert.equal(evaluatePersonalRecord([{ load: "bodyweight", reps: 5 }], { load: "10", reps: 5 }).isRecord, false, "no weighted history yet");
});
