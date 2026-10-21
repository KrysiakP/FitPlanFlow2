// node --test tests/monthlyReport.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { buildMonthlySummary, monthKey, monthsWithData } from "../src/lib/monthlyReport.ts";

const reports = [
  { reportDate: "2026-09-28T10:00:00Z", weight: "82", waist: "90" },
  { reportDate: "2026-10-05T10:00:00Z", weight: "81,5 kg", waist: "89", chest: "100" },
  { reportDate: "2026-10-26T10:00:00Z", weight: "80", waist: "88", chest: "101" },
];
const sessions = [
  { completedAt: "2026-10-02T10:00:00Z", durationSeconds: 3600, rpe: 7 },
  { completedAt: "2026-10-09T10:00:00Z", durationSeconds: 1800, rpe: 8 },
  { completedAt: "2026-10-16T10:00:00Z", durationSeconds: null, rpe: null },
  { completedAt: "2026-09-30T10:00:00Z", durationSeconds: 600, rpe: 5 },
];
const strength = [
  { exercise: "Przysiad", points: [{ date: "2026-09-20", estimatedOneRepMax: 100 }, { date: "2026-10-03", estimatedOneRepMax: 105 }, { date: "2026-10-24", estimatedOneRepMax: 112.5 }] },
  { exercise: "Wyciskanie", points: [{ date: "2026-10-10", estimatedOneRepMax: 70 }] },
];

test("the month key follows the Warsaw calendar", () => {
  assert.equal(monthKey("2026-10-31T23:30:00Z"), "2026-11", "23:30 UTC on 31 Oct is already 1 Nov in Warsaw");
  assert.equal(monthKey("2026-10-15T12:00:00Z"), "2026-10");
});

test("months with data are listed newest first", () => {
  assert.deepEqual(monthsWithData(reports, sessions), ["2026-10", "2026-09"]);
  assert.deepEqual(monthsWithData([], []), []);
});

test("workouts, minutes and the average difficulty count only that month", () => {
  const summary = buildMonthlySummary("2026-10", reports, sessions, strength);
  assert.equal(summary.workouts, 3);
  assert.equal(summary.trainingMinutes, 90);
  assert.equal(summary.averageRpe, 7.5, "sessions without a rating are left out of the average");
  assert.equal(summary.reportsSent, 2);
});

test("body changes need two measurements within the month", () => {
  const summary = buildMonthlySummary("2026-10", reports, sessions, strength);
  const weight = summary.body.find((item) => item.label === "Waga");
  assert.deepEqual(weight, { label: "Waga", unit: "kg", from: 81.5, to: 80, change: -1.5 });
  assert.equal(summary.body.find((item) => item.label === "Klatka")?.change, 1);
  assert.equal(summary.body.some((item) => item.label === "Biodra"), false, "never measured");
});

test("strength changes use only points from the month and need two of them", () => {
  const summary = buildMonthlySummary("2026-10", reports, sessions, strength);
  assert.deepEqual(summary.strength, [{ exercise: "Przysiad", from: 105, to: 112.5, change: 7.5 }]);
});

test("an empty month gives zeros and no lists", () => {
  const summary = buildMonthlySummary("2026-01", reports, sessions, strength);
  assert.deepEqual({ ...summary }, { month: "2026-01", workouts: 0, trainingMinutes: 0, averageRpe: null, reportsSent: 0, body: [], strength: [] });
});
