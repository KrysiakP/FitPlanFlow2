// node --test tests/   (Node 24 runs the TypeScript helper directly)
import assert from "node:assert/strict";
import test from "node:test";
import { metricSeries, weekWord, weeklyStreak, weightSeries, workoutsThisWeek } from "../lib/progressInsights.ts";

// Wednesday 21 Oct 2026, noon
const NOW = new Date(2026, 9, 21, 12, 0, 0);
const day = (offset, hour = 10) => new Date(2026, 9, 21 + offset, hour).toISOString();

test("weekly streak counts consecutive weeks with a workout", () => {
  const sessions = [{ completedAt: day(0) }, { completedAt: day(-7) }, { completedAt: day(-14) }];
  assert.equal(weeklyStreak(sessions, NOW), 3);
});

test("an empty current week does not break the streak yet", () => {
  const sessions = [{ completedAt: day(-7) }, { completedAt: day(-14) }];
  assert.equal(weeklyStreak(sessions, NOW), 2);
});

test("a skipped week ends the streak", () => {
  const sessions = [{ completedAt: day(0) }, { completedAt: day(-14) }];
  assert.equal(weeklyStreak(sessions, NOW), 1);
});

test("no workouts means no streak", () => {
  assert.equal(weeklyStreak([], NOW), 0);
});

test("the week starts on Monday", () => {
  // Sunday 18 Oct belongs to the previous week, Monday 19 Oct to this one
  const sessions = [{ completedAt: new Date(2026, 9, 18, 20).toISOString() }, { completedAt: new Date(2026, 9, 19, 8).toISOString() }];
  assert.equal(workoutsThisWeek(sessions, NOW), 1);
});

test("weight series sorts, tolerates commas and units, and drops junk", () => {
  const series = weightSeries([
    { reportDate: day(-7), weight: "75,5 kg" },
    { reportDate: day(-14), weight: "76" },
    { reportDate: day(-21), weight: "" },
    { reportDate: day(-28), weight: null },
    { reportDate: day(0), weight: "abc" },
    { reportDate: day(-1), weight: "0" },
    { reportDate: day(-2), weight: "74.8" },
  ]);
  assert.deepEqual(series.map((p) => p.kg), [76, 75.5, 74.8]);
});

test("weight series keeps only the latest entries", () => {
  const reports = Array.from({ length: 12 }, (_, i) => ({ reportDate: day(-i * 7), weight: String(80 - i) }));
  const series = weightSeries(reports, 8);
  assert.equal(series.length, 8);
  assert.equal(series[series.length - 1].kg, 80);
});

test("several reports on one day count as a single point", () => {
  const series = weightSeries([
    { reportDate: day(0, 8), weight: "70" },
    { reportDate: day(0, 9), weight: "70.4" },
    { reportDate: day(-7), weight: "71" },
  ]);
  assert.equal(series.length, 2);
  assert.equal(series[1].kg, 70.4);
});

test("other body measurements work the same way and are independent of weight", () => {
  const reports = [
    { reportDate: day(-14), weight: "80", waist: "92,5 cm" },
    { reportDate: day(-7), weight: "79", waist: "91" },
    { reportDate: day(0), weight: "", waist: "89.8", chest: "101" },
  ];
  assert.deepEqual(metricSeries(reports, "waist").map((p) => p.value), [92.5, 91, 89.8]);
  assert.equal(metricSeries(reports, "weight").length, 2);
  assert.equal(metricSeries(reports, "chest").length, 1);
  assert.equal(metricSeries(reports, "hips").length, 0);
});

test("Polish plural of 'tydzień'", () => {
  assert.equal(weekWord(1), "tydzień");
  for (const n of [2, 3, 4, 22, 23, 24]) assert.equal(weekWord(n), "tygodnie", String(n));
  for (const n of [5, 11, 12, 13, 14, 15, 21, 25]) assert.equal(weekWord(n), "tygodni", String(n));
});
