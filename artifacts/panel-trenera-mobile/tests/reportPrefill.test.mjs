// node --test tests/reportPrefill.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { prefillFromReports } from "../lib/reportPrefill.ts";

test("no reports means nothing to carry over", () => {
  assert.deepEqual(prefillFromReports(undefined), {});
  assert.deepEqual(prefillFromReports([]), {});
});

test("the newest value of each field wins, whatever order the reports come in", () => {
  const result = prefillFromReports([
    { reportDate: "2026-09-01", waist: "90", chest: "100", supplements: "kreatyna" },
    { reportDate: "2026-10-01", waist: "88", chest: "", supplements: null },
  ]);
  assert.deepEqual(result, { waist: "88", chest: "100", supplements: "kreatyna" });
});

test("only slowly changing fields are carried, and blanks are skipped", () => {
  const result = prefillFromReports([{ reportDate: new Date("2026-10-01"), weight: "80", mood: "dobry", arm: "  ", leg: " 60 " }]);
  assert.deepEqual(result, { leg: "60" });
});
