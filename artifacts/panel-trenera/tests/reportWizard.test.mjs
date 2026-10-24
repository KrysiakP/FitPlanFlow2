// node --test tests/reportWizard.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { clampStep, firstStepWithError, REPORT_STEPS, stepClass } from "../src/lib/reportWizard.ts";
import { DRAFT_FIELDS } from "../src/lib/reportDraft.ts";

test("every field of the report belongs to exactly one step", () => {
  const all = REPORT_STEPS.flatMap((step) => step.fields);
  assert.equal(new Set(all).size, all.length, "no field twice");
  for (const field of ["reportDate", "photoUrl", ...DRAFT_FIELDS]) assert.ok(all.includes(field), `${field} has a step`);
});

test("an error sends back to the first step that has it", () => {
  assert.equal(firstStepWithError(["thoughts"]), 2);
  assert.equal(firstStepWithError(["photoUrl", "waist"]), 1);
  assert.equal(firstStepWithError(["weight", "photoUrl"]), 0);
  assert.equal(firstStepWithError([]), null);
  assert.equal(firstStepWithError(["nieznane"]), null);
});

test("the step number stays inside the steps", () => {
  assert.equal(clampStep(-3), 0);
  assert.equal(clampStep(99), REPORT_STEPS.length - 1);
  assert.equal(clampStep(1.9), 1);
  assert.equal(clampStep(Number.NaN), 0);
});

test("only the current step is visible on a phone, all of them on a wide screen", () => {
  assert.equal(stepClass(1, 1), "");
  assert.equal(stepClass(1, 0), "hidden md:block");
  assert.equal(stepClass(0, 3), "hidden md:block");
});
