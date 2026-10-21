// node --test scripts/plan-match.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { matchExisting } from "../src/lib/planMatch.ts";

const rows = [
  { id: "a", name: "Przysiad" },
  { id: "b", name: "Wyciskanie" },
  { id: "c", name: "Martwy ciąg" },
];

test("items with a known id update that row, even when renamed", () => {
  const { matches, removed } = matchExisting(rows, [{ id: "b", name: "Wyciskanie hantli" }, { id: "a", name: "Przysiad" }]);
  assert.deepEqual(matches.map((row) => row?.id), ["b", "a"]);
  assert.deepEqual(removed.map((row) => row.id), ["c"], "what is no longer in the list is removed");
});

test("without ids, rows are matched by name ignoring case and spaces", () => {
  const { matches, removed } = matchExisting(rows, [{ name: " przysiad " }, { name: "MARTWY CIĄG" }]);
  assert.deepEqual(matches.map((row) => row?.id), ["a", "c"]);
  assert.deepEqual(removed.map((row) => row.id), ["b"]);
});

test("a new item matches nothing and nothing is removed when everything stays", () => {
  const { matches, removed } = matchExisting(rows, [{ name: "Przysiad" }, { name: "Wyciskanie" }, { name: "Martwy ciąg" }, { name: "Wiosłowanie" }]);
  assert.deepEqual(matches.map((row) => row?.id ?? null), ["a", "b", "c", null]);
  assert.deepEqual(removed, []);
});

test("a row is used once: a duplicated id or name makes the second item new", () => {
  const byId = matchExisting(rows, [{ id: "a", name: "Przysiad" }, { id: "a", name: "Przysiad (kopia)" }]);
  assert.deepEqual(byId.matches.map((row) => row?.id ?? null), ["a", null]);
  const byName = matchExisting(rows, [{ name: "Przysiad" }, { name: "Przysiad" }]);
  assert.deepEqual(byName.matches.map((row) => row?.id ?? null), ["a", null]);
});

test("an id from another plan is ignored and falls back to the name", () => {
  const { matches } = matchExisting(rows, [{ id: "zzz", name: "Wyciskanie" }]);
  assert.equal(matches[0]?.id, "b");
});

test("an empty plan removes everything, an empty list of rows creates everything", () => {
  assert.deepEqual(matchExisting(rows, []).removed.map((row) => row.id), ["a", "b", "c"]);
  assert.deepEqual(matchExisting([], [{ name: "x" }]).matches, [null]);
});
