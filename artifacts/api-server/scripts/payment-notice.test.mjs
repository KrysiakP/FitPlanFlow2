// node --test scripts/payment-notice.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { formatPln, paymentNotice } from "../src/lib/paymentNotice.ts";

test("amounts are shown in Polish style from grosze", () => {
  assert.equal(formatPln(10000), "100,00 zł");
  assert.equal(formatPln(123450), "1 234,50 zł");
  assert.equal(formatPln(5), "0,05 zł");
});

test("the notice names the client, never an id", () => {
  const notice = paymentNotice("upcoming", "Anna Nowak", 15000, 3);
  assert.equal(notice.title, "Zbliżający się termin płatności");
  assert.equal(notice.body, "Anna Nowak: płatność 150,00 zł za 3 dni.");
  assert.ok(!/[0-9a-f]{8}-[0-9a-f]{4}/.test(notice.body), "no uuid in the text");
});

test("due today and overdue read naturally, with a singular day", () => {
  assert.equal(paymentNotice("due_today", "Jan Kowalski", 20000, 0).body, "Jan Kowalski: płatność 200,00 zł jest dziś.");
  assert.equal(paymentNotice("overdue", "Jan Kowalski", 20000, -1).body, "Jan Kowalski: płatność 200,00 zł jest przeterminowana o 1 dzień.");
  assert.equal(paymentNotice("overdue", "Jan Kowalski", 20000, -12).body, "Jan Kowalski: płatność 200,00 zł jest przeterminowana o 12 dni.");
});

test("a client without a name still gets a readable notice", () => {
  assert.equal(paymentNotice("due_today", "  ", 1000, 0).body, "Podopieczny: płatność 10,00 zł jest dziś.");
});
