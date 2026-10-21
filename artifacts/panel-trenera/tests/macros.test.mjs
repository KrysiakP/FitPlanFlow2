// node --test tests/macros.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { calculateMacros, validateMacroInput } from "../src/lib/macros.ts";

const base = { sex: "male", age: 30, heightCm: 180, weightKg: 80, activity: "moderate", goal: "maintain" };

test("Mifflin–St Jeor: a 30-year-old 180 cm 80 kg man has a BMR of 1780 kcal", () => {
  const result = calculateMacros(base);
  assert.equal(result.bmr, 1780);
  assert.equal(result.tdee, Math.round(1780 * 1.55));
  assert.equal(result.calories, result.tdee, "maintenance keeps the energy needs");
});

test("the female constant differs by 166 kcal", () => {
  assert.equal(calculateMacros(base).bmr - calculateMacros({ ...base, sex: "female" }).bmr, 166);
});

test("losing weight is a 15% deficit with more protein, gaining a 10% surplus", () => {
  const maintain = calculateMacros(base);
  const lose = calculateMacros({ ...base, goal: "lose" });
  const gain = calculateMacros({ ...base, goal: "gain" });
  assert.equal(lose.calories, Math.round(maintain.tdee * 0.85));
  assert.equal(gain.calories, Math.round(maintain.tdee * 1.1));
  assert.equal(lose.proteinG, 160);
  assert.equal(maintain.proteinG, 144);
});

test("the macros add up to the calories within rounding", () => {
  for (const goal of ["lose", "maintain", "gain"]) {
    const r = calculateMacros({ ...base, goal });
    const sum = r.proteinG * 4 + r.fatG * 9 + r.carbsG * 4;
    assert.ok(Math.abs(sum - r.calories) <= 9, `${goal}: ${sum} vs ${r.calories}`);
  }
});

test("implausible input is refused with a reason", () => {
  assert.equal(validateMacroInput(base), null);
  assert.match(validateMacroInput({ ...base, age: 5 }), /Wiek/);
  assert.match(validateMacroInput({ ...base, weightKg: 10 }), /Waga/);
  assert.match(validateMacroInput({ ...base, sex: undefined }), /płeć/);
});
