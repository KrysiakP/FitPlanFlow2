// node --test tests/libraryFilter.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { filterLibrary, fold, libraryCategories } from "../src/lib/libraryFilter.ts";

const items = [
  { name: "Martwy ciąg", category: "Nogi", description: "Klasyk", videoUrl: "https://youtu.be/a" },
  { name: "Przysiad ze sztangą", category: "Nogi", description: "Plecy proste", videoUrl: null },
  { name: "Wyciskanie leżąc", category: "Klatka", description: null, videoUrl: "https://youtu.be/b" },
  { name: "Łydki stojąc", category: null, description: "Wspięcia", videoUrl: null },
];
const all = { query: "", category: null, onlyWithVideo: false };

test("folding ignores case and Polish letters", () => {
  assert.equal(fold("  Łydki  ZĄB "), "lydki zab");
  assert.equal(fold("Zażółć gęślą jaźń"), "zazolc gesla jazn");
});

test("no filter keeps everything in order", () => {
  assert.deepEqual(filterLibrary(items, all).map((item) => item.name), items.map((item) => item.name));
});

test("search matches without diacritics and across name, category and description", () => {
  assert.deepEqual(filterLibrary(items, { ...all, query: "ciag" }).map((item) => item.name), ["Martwy ciąg"]);
  assert.deepEqual(filterLibrary(items, { ...all, query: "lydki" }).map((item) => item.name), ["Łydki stojąc"]);
  assert.deepEqual(filterLibrary(items, { ...all, query: "plecy" }).map((item) => item.name), ["Przysiad ze sztangą"], "description");
  assert.deepEqual(filterLibrary(items, { ...all, query: "klatka" }).map((item) => item.name), ["Wyciskanie leżąc"], "category");
});

test("every word of the query must match", () => {
  assert.deepEqual(filterLibrary(items, { ...all, query: "przysiad sztanga" }).map((item) => item.name), ["Przysiad ze sztangą"]);
  assert.deepEqual(filterLibrary(items, { ...all, query: "przysiad klatka" }), []);
});

test("category and video filters combine with the search", () => {
  assert.deepEqual(filterLibrary(items, { ...all, category: "Nogi" }).map((item) => item.name), ["Martwy ciąg", "Przysiad ze sztangą"]);
  assert.deepEqual(filterLibrary(items, { ...all, onlyWithVideo: true }).map((item) => item.name), ["Martwy ciąg", "Wyciskanie leżąc"]);
  assert.deepEqual(filterLibrary(items, { query: "ciag", category: "Nogi", onlyWithVideo: true }).map((item) => item.name), ["Martwy ciąg"]);
  assert.deepEqual(filterLibrary(items, { query: "ciag", category: "Klatka", onlyWithVideo: false }), []);
});

test("categories are distinct, non-empty and sorted", () => {
  assert.deepEqual(libraryCategories(items), ["Klatka", "Nogi"]);
  assert.deepEqual(libraryCategories([]), []);
});
