// node --test tests/parseClientCsv.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { MAX_CSV_INVITES, parseClientCsv } from "../src/lib/parseClientCsv.ts";

test("a header row names the columns, in any order, with a semicolon like Excel in Polish", () => {
  const result = parseClientCsv("Imię;E-mail\nAnna;anna@example.com\nTomek;Tomek@Example.com\n");
  assert.deepEqual(result.rows, [
    { email: "anna@example.com", firstName: "Anna" },
    { email: "tomek@example.com", firstName: "Tomek" },
  ]);
  assert.equal(result.problems.length, 0);
});

test("without a header the address is found and the neighbouring cell is the name", () => {
  const result = parseClientCsv("anna@example.com,Anna\nkasia@example.com,\n");
  assert.deepEqual(result.rows, [
    { email: "anna@example.com", firstName: "Anna" },
    { email: "kasia@example.com", firstName: null },
  ]);
  const swapped = parseClientCsv("Anna\tanna@example.com\n");
  assert.deepEqual(swapped.rows, [{ email: "anna@example.com", firstName: "Anna" }]);
});

test("quoted cells, a BOM and Windows line endings are handled", () => {
  const result = parseClientCsv('﻿email,imię\r\n"anna@example.com","Anna, Maria"\r\n');
  assert.deepEqual(result.rows, [{ email: "anna@example.com", firstName: "Anna, Maria" }]);
});

test("bad and duplicate addresses are reported with their line number and skipped", () => {
  const result = parseClientCsv("email,imię\nanna@example.com,Anna\nnie-adres,Ola\nanna@example.com,Anna 2\n");
  assert.equal(result.rows.length, 1);
  assert.deepEqual(result.problems.map((p) => [p.line, p.reason]), [
    [3, "to nie wygląda na adres e-mail"],
    [4, "ten adres już jest na liście"],
  ]);
});

test("an empty file gives nothing, and a huge file is cut at the limit", () => {
  assert.deepEqual(parseClientCsv("").rows, []);
  assert.deepEqual(parseClientCsv("\n\n").problems, []);
  const big = parseClientCsv(Array.from({ length: MAX_CSV_INVITES + 20 }, (_, i) => `u${i}@example.com`).join("\n"));
  assert.equal(big.rows.length, MAX_CSV_INVITES);
  assert.equal(big.truncated, true);
});

test("a name that is itself an address is not used as a name", () => {
  const result = parseClientCsv("a@example.com,b@example.com\n");
  assert.deepEqual(result.rows, [{ email: "a@example.com", firstName: null }]);
});
