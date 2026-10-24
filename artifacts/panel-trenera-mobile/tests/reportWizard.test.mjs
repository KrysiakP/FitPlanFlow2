// node --test tests/reportWizard.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { canLeaveStep, clampStep, REPORT_STEP_TITLES } from "../lib/reportWizard.ts";

test("the step number stays inside the steps", () => {
  assert.equal(clampStep(-1), 0);
  assert.equal(clampStep(2.7), 2);
  assert.equal(clampStep(10), REPORT_STEP_TITLES.length - 1);
  assert.equal(clampStep(Number.NaN), 0);
});

test("the first step cannot be left without a valid date", () => {
  assert.equal(canLeaveStep(0, "2026-10-19"), true);
  assert.equal(canLeaveStep(0, " 2026-10-19 "), true);
  assert.equal(canLeaveStep(0, ""), false);
  assert.equal(canLeaveStep(0, "19.10.2026"), false);
  assert.equal(canLeaveStep(0, "2026-13-45"), false);
  assert.equal(canLeaveStep(1, ""), true, "later steps have only optional fields");
});
