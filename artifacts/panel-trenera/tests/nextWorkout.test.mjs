// node --test tests/nextWorkout.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { nextWorkout } from "../src/lib/nextWorkout.ts";

const NOW = new Date(2026, 9, 21, 12);
const workouts = [
  { id: "b", name: "Plecy", orderIndex: 1 },
  { id: "a", name: "Klatka", orderIndex: 0 },
  { id: "c", name: "Nogi", orderIndex: 2 },
];
const done = (workoutId, daysAgo) => ({ workoutId, completedAt: new Date(2026, 9, 21 - daysAgo, 10).toISOString() });

test("with no history the first workout is next", () => {
  assert.equal(nextWorkout(workouts, [], NOW).workout.id, "a");
});

test("the workout after the last finished one is next, in plan order", () => {
  assert.equal(nextWorkout(workouts, [done("a", 3)], NOW).workout.id, "b");
  assert.equal(nextWorkout(workouts, [done("a", 5), done("b", 2)], NOW).workout.id, "c");
});

test("after the last workout the plan wraps around", () => {
  assert.equal(nextWorkout(workouts, [done("c", 1)], NOW).workout.id, "a");
});

test("the most recent session decides, whatever the order of the list", () => {
  assert.equal(nextWorkout(workouts, [done("c", 1), done("a", 6), done("b", 3)], NOW).workout.id, "a");
});

test("sessions of other plans are ignored", () => {
  assert.equal(nextWorkout(workouts, [done("zzz", 0)], NOW).workout.id, "a");
});

test("training earlier today is flagged", () => {
  assert.equal(nextWorkout(workouts, [done("a", 0)], NOW).trainedToday, true);
  assert.equal(nextWorkout(workouts, [done("a", 1)], NOW).trainedToday, false);
});

test("an empty plan has no next workout", () => {
  assert.equal(nextWorkout([], [done("a", 1)], NOW), null);
});
