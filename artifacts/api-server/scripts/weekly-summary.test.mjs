// node --test scripts/weekly-summary.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { formatWeeklySummary, isMondayInWarsaw } from "../src/lib/weeklySummary.ts";

const week = (over = {}) => ({ trainerId: "t", activeClients: 3, sessions: 12, reports: 3, overduePayments: 0, ...over });

test("a normal week lists treningi and raporty", () => {
  assert.equal(formatWeeklySummary(week()).body, "Ostatnie 7 dni: 12 treningów, 3 nowe raporty.");
});

test("overdue payments are appended when there are any", () => {
  assert.equal(formatWeeklySummary(week({ overduePayments: 2 })).body, "Ostatnie 7 dni: 12 treningów, 3 nowe raporty, 2 zaległe płatności.");
});

test("Polish plurals", () => {
  assert.match(formatWeeklySummary(week({ sessions: 1, reports: 1 })).body, /1 trening, 1 nowy raport/);
  assert.match(formatWeeklySummary(week({ sessions: 2, reports: 5 })).body, /2 treningi, 5 nowych raportów/);
  assert.match(formatWeeklySummary(week({ sessions: 22, reports: 24 })).body, /22 treningi, 24 nowe raporty/);
  assert.match(formatWeeklySummary(week({ sessions: 11, reports: 12 })).body, /11 treningów, 12 nowych raportów/);
});

test("a quiet week says so", () => {
  const { body } = formatWeeklySummary(week({ sessions: 0, reports: 0, overduePayments: 1 }));
  assert.match(body, /^Cichy tydzień/);
  assert.match(body, /1 zaległa płatność/);
});

test("trainers without clients get nothing", () => {
  assert.equal(formatWeeklySummary(week({ activeClients: 0 })), null);
});

test("Monday is decided in Warsaw time", () => {
  assert.equal(isMondayInWarsaw(new Date("2026-10-19T09:00:00Z")), true); // Monday
  assert.equal(isMondayInWarsaw(new Date("2026-10-18T23:30:00Z")), true); // already Monday 01:30 in Warsaw
  assert.equal(isMondayInWarsaw(new Date("2026-10-19T23:30:00Z")), false); // Tuesday 01:30 in Warsaw
  assert.equal(isMondayInWarsaw(new Date("2026-10-21T09:00:00Z")), false);
});
