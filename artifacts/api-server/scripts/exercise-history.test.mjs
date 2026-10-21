// node --test scripts/exercise-history.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { buildExerciseHistory } from "../src/lib/exerciseHistory.ts";

const row = (name, load, reps, iso) => ({ name, load, reps, loggedAt: iso });

test("one point per day: the best set of the day wins", () => {
  const history = buildExerciseHistory([
    row("Przysiad", "100", 5, "2026-10-01T10:00:00Z"),
    row("Przysiad", "110", 5, "2026-10-01T10:10:00Z"),
    row("Przysiad", "90", 8, "2026-10-01T10:20:00Z"),
  ]);
  assert.equal(history.length, 1);
  assert.equal(history[0].points.length, 1);
  assert.equal(history[0].points[0].bestLoad, 110);
  assert.equal(history[0].points[0].estimatedOneRepMax, 128.3);
});

test("names are merged ignoring case and sorted by training days", () => {
  const history = buildExerciseHistory([
    row("martwy ciąg", "120", 3, "2026-10-01T10:00:00Z"),
    row("Przysiad", "100", 5, "2026-10-01T10:00:00Z"),
    row("PRZYSIAD", "105", 5, "2026-10-08T10:00:00Z"),
  ]);
  assert.deepEqual(history.map((h) => h.exercise), ["Przysiad", "martwy ciąg"]);
  assert.equal(history[0].points.length, 2);
});

test("change compares the latest point with the first", () => {
  const history = buildExerciseHistory([
    row("Wyciskanie", "60", 10, "2026-09-01T10:00:00Z"),
    row("Wyciskanie", "70", 10, "2026-10-01T10:00:00Z"),
  ]);
  assert.equal(history[0].change, 13.3);
  assert.equal(history[0].latest, history[0].best);
});

test("unweighted and invalid sets are ignored", () => {
  const history = buildExerciseHistory([
    row("Podciąganie", "bodyweight", 10, "2026-10-01T10:00:00Z"),
    row("Podciąganie", "", 10, "2026-10-02T10:00:00Z"),
    row("Przysiad", "100", 0, "2026-10-01T10:00:00Z"),
  ]);
  assert.equal(history.length, 0);
});

test("only the latest points are kept, and a single point has no change", () => {
  const rows = Array.from({ length: 15 }, (_, i) => row("Przysiad", String(100 + i), 5, `2026-10-${String(i + 1).padStart(2, "0")}T10:00:00Z`));
  const [history] = buildExerciseHistory(rows, { maxPoints: 12 });
  assert.equal(history.points.length, 12);
  assert.equal(history.points[0].date, "2026-10-04");
  assert.equal(buildExerciseHistory([row("Przysiad", "100", 5, "2026-10-01T10:00:00Z")])[0].change, null);
});

test("the day boundary follows Warsaw time", () => {
  // 23:30 UTC on 1 Oct is already 2 Oct in Warsaw (UTC+2)
  const [history] = buildExerciseHistory([row("Przysiad", "100", 5, "2026-10-01T23:30:00Z")]);
  assert.equal(history.points[0].date, "2026-10-02");
});
