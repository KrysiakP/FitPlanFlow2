// node --test scripts/achievements.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { computeAchievements, longestWeeklyStreak } from "../src/lib/achievements.ts";

const empty = { workoutDates: [], reportCount: 0, reportsWithPhoto: 0, strengthGains: 0 };
const byId = (list, id) => list.find((item) => item.id === id);

test("a newcomer has nothing earned and zero progress", () => {
  const list = computeAchievements(empty);
  assert.ok(list.every((item) => !item.earned && item.progress === 0));
  assert.equal(list.length, 8);
});

test("progress is the share of the target and never exceeds one", () => {
  const dates = Array.from({ length: 4 }, (_, i) => new Date(Date.UTC(2026, 9, 1 + i)));
  const list = computeAchievements({ ...empty, workoutDates: dates });
  assert.equal(byId(list, "first_workout").earned, true);
  assert.equal(byId(list, "workouts_10").progress, 0.4);
  const many = computeAchievements({ ...empty, workoutDates: Array.from({ length: 60 }, () => new Date("2026-10-01")) });
  assert.equal(byId(many, "workouts_50").progress, 1);
  assert.equal(byId(many, "workouts_50").current, 50, "the counter stops at the target");
});

test("the weekly streak counts consecutive Monday-based weeks, not days", () => {
  // Wed 7 Oct, Mon 12 Oct, Sun 25 Oct (the week of Mon 19 Oct), Mon 26 Oct
  assert.equal(longestWeeklyStreak(["2026-10-07", "2026-10-12", "2026-10-25", "2026-10-26"]), 4);
  assert.equal(longestWeeklyStreak(["2026-10-07", "2026-10-21"]), 1, "a skipped week breaks the run");
  assert.equal(longestWeeklyStreak([]), 0);
  assert.equal(longestWeeklyStreak(["2026-10-07", "2026-10-08", "2026-10-09"]), 1, "several workouts in one week are one week");
});

test("reports, photos and strength gains unlock their own badges", () => {
  const list = computeAchievements({ ...empty, reportCount: 8, reportsWithPhoto: 1, strengthGains: 2 });
  for (const id of ["first_report", "reports_8", "first_photo", "strength_gain"]) assert.equal(byId(list, id).earned, true, id);
  assert.equal(byId(list, "first_workout").earned, false);
});
