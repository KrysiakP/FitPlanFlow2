// node --test scripts/plan-templates.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { findPlanTemplate, PLAN_TEMPLATES, planFromTemplate } from "../src/lib/planTemplates.ts";

test("every template has a unique key and a sensible shape", () => {
  const keys = PLAN_TEMPLATES.map((template) => template.key);
  assert.equal(new Set(keys).size, keys.length, "keys are unique");
  assert.ok(PLAN_TEMPLATES.length >= 4);
  for (const template of PLAN_TEMPLATES) {
    assert.ok(template.name.trim() && template.description.trim(), template.key);
    assert.equal(template.workouts.length, template.daysPerWeek, `${template.key}: one workout per training day`);
    for (const workout of template.workouts) {
      assert.ok(workout.name.trim(), template.key);
      assert.ok(workout.exercises.length >= 4 && workout.exercises.length <= 8, `${template.key}/${workout.name}: 4-8 exercises`);
      const names = workout.exercises.map((exercise) => exercise.name.toLowerCase());
      assert.equal(new Set(names).size, names.length, `${template.key}/${workout.name}: no repeated exercise`);
      for (const exercise of workout.exercises) {
        assert.ok(exercise.name.trim(), template.key);
        assert.ok(Number.isInteger(exercise.sets) && exercise.sets >= 1 && exercise.sets <= 6, `${exercise.name}: sets`);
        assert.ok(Number.isInteger(exercise.reps) && exercise.reps >= 1 && exercise.reps <= 60, `${exercise.name}: reps`);
        assert.ok(exercise.restTime >= 30 && exercise.restTime <= 240, `${exercise.name}: rest`);
      }
    }
  }
});

test("a template is found by its key and only by it", () => {
  assert.equal(findPlanTemplate("fbw-3")?.name, "FBW – całe ciało, 3 dni");
  assert.equal(findPlanTemplate("nie-ma"), undefined);
});

test("the plan built from a template numbers workouts and exercises from zero and takes an optional name", () => {
  const template = findPlanTemplate("ppl-3");
  const plan = planFromTemplate(template);
  assert.equal(plan.name, template.name);
  assert.deepEqual(plan.workouts.map((workout) => workout.orderIndex), [0, 1, 2]);
  assert.deepEqual(plan.workouts[0].exercises.map((exercise) => exercise.orderIndex), [0, 1, 2, 3, 4]);
  assert.equal(planFromTemplate(template, "  Moje PPL ").name, "Moje PPL");
  assert.equal(planFromTemplate(template, "   ").name, template.name);
});
