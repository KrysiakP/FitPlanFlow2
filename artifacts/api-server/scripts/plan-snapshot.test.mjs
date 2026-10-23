// node --test scripts/plan-snapshot.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { snapshotPlan, snapshotSummary } from "../src/lib/planSnapshot.ts";

const plan = { name: "Mój plan", description: "Opis" };
const workouts = [
  { id: "w2", planId: "p", name: "B", orderIndex: 5, exercises: [{ id: "e3", workoutId: "w2", name: "Martwy ciąg", sets: 3, reps: 5, orderIndex: 0 }] },
  {
    id: "w1", planId: "p", name: "A", orderIndex: 1,
    exercises: [
      { id: "e2", workoutId: "w1", name: "Wyciskanie", sets: 4, reps: 6, load: "60", restTime: 90, orderIndex: 7 },
      { id: "e1", workoutId: "w1", name: "Przysiad", sets: 3, reps: 5, description: "Plecy proste", technique: "dropset", rir: 2, tempo: "3-1-1", videoUrl: "https://youtu.be/x", orderIndex: 2 },
    ],
  },
];

test("workouts and exercises are put in order and renumbered from zero", () => {
  const snapshot = snapshotPlan(plan, workouts);
  assert.deepEqual(snapshot.workouts.map((workout) => [workout.name, workout.orderIndex]), [["A", 0], ["B", 1]]);
  assert.deepEqual(snapshot.workouts[0].exercises.map((exercise) => [exercise.name, exercise.orderIndex]), [["Przysiad", 0], ["Wyciskanie", 1]]);
});

test("no ids leak into the snapshot, and the exercise settings are kept", () => {
  const snapshot = snapshotPlan(plan, workouts);
  assert.ok(!JSON.stringify(snapshot).match(/"(id|planId|workoutId)"/), "no row ids");
  const squat = snapshot.workouts[0].exercises[0];
  assert.deepEqual({ ...squat }, { name: "Przysiad", description: "Plecy proste", videoUrl: "https://youtu.be/x", sets: 3, reps: 5, load: null, restTime: null, technique: "dropset", rir: 2, tempo: "3-1-1", orderIndex: 0 });
});

test("missing optional values become null and the plan description survives", () => {
  assert.equal(snapshotPlan({ name: "X" }, []).description, null);
  assert.equal(snapshotPlan(plan, workouts).description, "Opis");
  assert.equal(snapshotPlan(plan, workouts).workouts[1].description, null);
});

test("the summary lists days with exercise names only", () => {
  assert.deepEqual(snapshotSummary(snapshotPlan(plan, workouts)), [
    { name: "A", exercises: ["Przysiad", "Wyciskanie"] },
    { name: "B", exercises: ["Martwy ciąg"] },
  ]);
});
