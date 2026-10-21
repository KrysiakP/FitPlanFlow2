// node --test tests/shoppingList.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { buildShoppingList, formatAmount } from "../src/lib/shoppingList.ts";

const line = (items) => items.map((item) => `${item.name}: ${formatAmount(item)}`);

test("quantities in front of the name are read with or without a space", () => {
  const list = buildShoppingList(["100 g ryżu, 2 jajka, 150g kurczaka, 1,5 l mleka"]);
  assert.deepEqual(line(list), ["jajka: 2", "kurczaka: 150 g", "mleka: 1,5 l", "ryżu: 100 g"]);
});

test("the same product is summed across meals, and kg/g and l/ml are merged", () => {
  const list = buildShoppingList(["200 g ryżu", "0,3 kg ryżu\n2 szt. jajka", "3 jajka"]);
  assert.equal(list.length, 3, "rice, eggs in pieces and eggs counted bare");
  const rice = list.find((item) => item.name === "ryżu");
  assert.equal(rice.amount, 500);
  assert.equal(list.find((item) => item.name === "jajka" && item.unit === "szt.").amount, 2, "pieces and bare counts stay separate units");
});

test("quantity after the name works too", () => {
  assert.deepEqual(line(buildShoppingList(["ryż 80 g; oliwa 1 łyżka"])), ["oliwa: 1 łyżki", "ryż: 80 g"]);
});

test("recipe steps and parts without a number never reach the list", () => {
  const list = buildShoppingList([
    "Wymieszać wszystko i smażyć 5 minut na średnim ogniu aż do zarumienienia mięsa z cebulą i przyprawami",
    "sól, pieprz, wymieszać",
    "100 g płatków owsianych",
  ]);
  assert.deepEqual(line(list), ["płatków owsianych: 100 g"]);
});

test("bullets and notes in brackets are cleaned, empty input gives an empty list", () => {
  assert.deepEqual(line(buildShoppingList(["- 50 g orzechów (włoskich)\n• 1 banan"])), ["banan: 1", "orzechów: 50 g"]);
  assert.deepEqual(buildShoppingList([null, undefined, ""]), []);
});
