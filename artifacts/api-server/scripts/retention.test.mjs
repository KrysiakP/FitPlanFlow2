// node --test scripts/retention.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { computeRetention } from "../src/lib/retention.ts";

const NOW = new Date("2026-10-21T12:00:00Z");
const ago = (days) => new Date(NOW.getTime() - days * 86400000);

test("no clients: nothing to report, no division by zero", () => {
  assert.deepEqual(computeRetention([], NOW), { activeClients: 0, endedClients: 0, averageMonths: null, retention90: null });
});

test("retention counts only collaborations old enough to be judged", () => {
  const result = computeRetention(
    [
      { createdAt: ago(200), archivedAt: null, status: "active" }, // old and still here
      { createdAt: ago(200), archivedAt: ago(150), status: "archived" }, // lasted 50 days: lost
      { createdAt: ago(300), archivedAt: ago(100), status: "archived" }, // lasted 200 days: kept
      { createdAt: ago(20), archivedAt: null, status: "active" }, // too new to judge
    ],
    NOW,
  );
  assert.equal(result.retention90, 67, "two of three judged collaborations lasted 90 days");
  assert.equal(result.activeClients, 2);
  assert.equal(result.endedClients, 2);
});

test("the average length uses the end date for ended collaborations and today for active ones", () => {
  const result = computeRetention(
    [
      { createdAt: ago(60), archivedAt: ago(30), status: "archived" }, // 30 days
      { createdAt: ago(90), archivedAt: null, status: "active" }, // 90 days
    ],
    NOW,
  );
  assert.equal(result.averageMonths, 2, "60 days on average is about 2 months");
});

test("a young practice has no retention figure yet", () => {
  assert.equal(computeRetention([{ createdAt: ago(10), archivedAt: null, status: "active" }], NOW).retention90, null);
});
