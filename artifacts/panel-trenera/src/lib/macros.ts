/** Daily energy and macro targets from the Mifflin–St Jeor equation: a starting point, not a prescription. */

export type Sex = "female" | "male";
export type Activity = "low" | "light" | "moderate" | "high";
export type GoalKind = "lose" | "maintain" | "gain";

export interface MacroInput {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  activity: Activity;
  goal: GoalKind;
}

export interface MacroResult {
  bmr: number;
  tdee: number;
  calories: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
}

export const ACTIVITY_FACTORS: Record<Activity, number> = { low: 1.2, light: 1.375, moderate: 1.55, high: 1.725 };
export const GOAL_ADJUSTMENT: Record<GoalKind, number> = { lose: -0.15, maintain: 0, gain: 0.1 };

export function validateMacroInput(input: Partial<MacroInput>): string | null {
  if (!input.sex) return "Wybierz płeć";
  if (!(input.age! >= 14 && input.age! <= 90)) return "Wiek musi mieścić się między 14 a 90 lat";
  if (!(input.heightCm! >= 120 && input.heightCm! <= 230)) return "Wzrost musi mieścić się między 120 a 230 cm";
  if (!(input.weightKg! >= 35 && input.weightKg! <= 250)) return "Waga musi mieścić się między 35 a 250 kg";
  if (!input.activity || !input.goal) return "Wybierz aktywność i cel";
  return null;
}

export function calculateMacros(input: MacroInput): MacroResult {
  const bmr = 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age + (input.sex === "male" ? 5 : -161);
  const tdee = bmr * ACTIVITY_FACTORS[input.activity];
  const calories = Math.round(tdee * (1 + GOAL_ADJUSTMENT[input.goal]));
  // protein 1.8 g/kg (2.0 when cutting), fat 25% of calories, carbohydrates fill the rest
  const proteinG = Math.round(input.weightKg * (input.goal === "lose" ? 2.0 : 1.8));
  const fatG = Math.round((calories * 0.25) / 9);
  const carbsG = Math.max(0, Math.round((calories - proteinG * 4 - fatG * 9) / 4));
  return { bmr: Math.round(bmr), tdee: Math.round(tdee), calories, proteinG, fatG, carbsG };
}
