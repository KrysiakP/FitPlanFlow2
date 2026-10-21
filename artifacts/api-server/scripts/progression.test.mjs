// node --test scripts/progression.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { proposeProgression, progressionStep } from "../src/lib/progression.ts";

const plan = { sets: 3, reps: 5, load: "60" };
const sets = (load, reps, count) => Array.from({ length: count }, () => ({ load, reps }));

test("all planned sets done with all repetitions at the top weight propose one step more", () => {
  const proposal = proposeProgression(plan, sets("60", 5, 3));
  assert.equal(proposal?.from, 60);
  assert.equal(proposal?.to, 62.5);
  assert.equal(proposal?.planLoad, 60);
  assert.match(proposal?.reason ?? "", /3×5 z 60 kg/);
});

test("the step is 5 kg from 100 kg up", () => {
  assert.equal(progressionStep(97.5), 2.5);
  assert.equal(progressionStep(100), 5);
  assert.equal(proposeProgression({ sets: 3, reps: 5, load: "100" }, sets("100 kg", 5, 3))?.to, 105);
});

test("comma decimals and units are understood", () => {
  assert.equal(proposeProgression({ sets: 2, reps: 8, load: "62,5" }, sets("62,5 kg", 8, 2))?.to, 65);
});

test("a missed repetition or a missing set means no proposal", () => {
  assert.equal(proposeProgression(plan, [...sets("60", 5, 2), { load: "60", reps: 4 }]), null, "one set fell short");
  assert.equal(proposeProgression(plan, sets("60", 5, 2)), null, "only two of three sets");
});

test("only sets at the top weight count, lighter back-off sets do not", () => {
  const session = [...sets("60", 5, 3), ...sets("50", 10, 2)];
  assert.equal(proposeProgression(plan, session)?.from, 60);
  assert.equal(proposeProgression(plan, [...sets("60", 5, 2), ...sets("55", 5, 3)]), null, "only two sets at the top weight");
});

test("extra repetitions are fine", () => {
  assert.equal(proposeProgression(plan, sets("60", 8, 3))?.to, 62.5);
});

test("nothing to propose without weights, or when the plan already asks for more", () => {
  assert.equal(proposeProgression(plan, []), null);
  assert.equal(proposeProgression(plan, sets(null, 5, 3)), null);
  assert.equal(proposeProgression(plan, sets("bez ciężaru", 5, 3)), null);
  assert.equal(proposeProgression({ sets: 3, reps: 5, load: "70" }, sets("60", 5, 3)), null, "the trainer already raised it");
  assert.equal(proposeProgression({ sets: 0, reps: 5, load: "60" }, sets("60", 5, 3)), null, "a plan without sets");
});

test("a plan without a load still gets a proposal", () => {
  const proposal = proposeProgression({ sets: 3, reps: 5, load: null }, sets("40", 5, 3));
  assert.equal(proposal?.to, 42.5);
  assert.equal(proposal?.planLoad, null);
});
