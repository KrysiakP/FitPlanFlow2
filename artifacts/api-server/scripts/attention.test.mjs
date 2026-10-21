// node --test scripts/attention.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { buildAttentionList } from "../src/lib/attention.ts";

const NOW = new Date("2026-10-21T12:00:00Z");
const daysAgo = (n) => new Date(NOW.getTime() - n * 86400000);
const client = (id, firstName = id, lastName = "Test") => ({ id, firstName, lastName });
const base = (over = {}) => ({
  clients: [],
  lastSessionAt: new Map(),
  assignedClientIds: new Set(),
  overduePayments: new Map(),
  unreadReports: new Map(),
  now: NOW,
  ...over,
});

test("someone who trained recently needs nothing", () => {
  const result = buildAttentionList(base({ clients: [client("a")], assignedClientIds: new Set(["a"]), lastSessionAt: new Map([["a", daysAgo(2)]]) }));
  assert.deepEqual(result, []);
});

test("a long break is reported with the number of days", () => {
  const [item] = buildAttentionList(base({ clients: [client("a")], assignedClientIds: new Set(["a"]), lastSessionAt: new Map([["a", daysAgo(10)]]) }));
  assert.equal(item.reasons[0].type, "inactive");
  assert.equal(item.reasons[0].label, "Bez treningu od 10 dni");
});

test("a client with a plan who never trained, and one without a plan", () => {
  const result = buildAttentionList(base({ clients: [client("a"), client("b")], assignedClientIds: new Set(["a"]) }));
  const byId = Object.fromEntries(result.map((r) => [r.clientId, r.reasons[0].type]));
  assert.equal(byId.a, "never_trained");
  assert.equal(byId.b, "no_plan");
});

test("overdue payments outrank everything and the list is sorted by urgency", () => {
  const result = buildAttentionList(base({
    clients: [client("a"), client("b"), client("c")],
    assignedClientIds: new Set(["a", "b", "c"]),
    lastSessionAt: new Map([["a", daysAgo(9)], ["b", daysAgo(1)], ["c", daysAgo(1)]]),
    overduePayments: new Map([["b", 2]]),
    unreadReports: new Map([["c", 1]]),
  }));
  assert.deepEqual(result.map((r) => r.clientId), ["b", "a", "c"]);
  assert.equal(result[0].reasons[0].label, "2 zaległe płatności");
  assert.equal(result[2].reasons[0].label, "1 nowy raport");
});

test("several reasons stack on one client", () => {
  const [item] = buildAttentionList(base({ clients: [client("a")], overduePayments: new Map([["a", 1]]), unreadReports: new Map([["a", 3]]) }));
  assert.deepEqual(item.reasons.map((r) => r.type), ["overdue_payment", "no_plan", "new_report"]);
  assert.equal(item.reasons[2].label, "3 nowe raporty");
});

test("Polish plurals for days and payments", () => {
  const label = (n) => buildAttentionList(base({ clients: [client("a")], assignedClientIds: new Set(["a"]), lastSessionAt: new Map([["a", daysAgo(n)]]) }))[0].reasons[0].label;
  assert.equal(label(7), "Bez treningu od 7 dni");
  assert.equal(label(22), "Bez treningu od 22 dni");
  const pay = (n) => buildAttentionList(base({ clients: [client("a")], assignedClientIds: new Set(["a"]), lastSessionAt: new Map([["a", daysAgo(1)]]), overduePayments: new Map([["a", n]]) }))[0].reasons[0].label;
  assert.equal(pay(1), "1 zaległa płatność");
  assert.equal(pay(3), "3 zaległe płatności");
  assert.equal(pay(5), "5 zaległych płatności");
});
