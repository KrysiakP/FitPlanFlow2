/** Milestones a client can earn, computed from their own history (nothing is stored, so rules can change safely). */

export interface AchievementInput {
  workoutDates: (Date | string)[]; // finished workouts
  reportCount: number;
  reportsWithPhoto: number;
  strengthGains: number; // exercises whose estimated 1RM went up between first and latest training day
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  earned: boolean;
  progress: number; // 0..1, 1 when earned
  current: number;
  target: number;
}

function startOfWeekUtc(date: Date): number {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); // Monday first
  return d.getTime();
}

/** Longest run of consecutive calendar weeks (Monday-based) with at least one workout. */
export function longestWeeklyStreak(dates: (Date | string)[]): number {
  const weeks = [...new Set(dates.map((value) => startOfWeekUtc(new Date(value))))].sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  let previous: number | null = null;
  for (const week of weeks) {
    run = previous !== null && week - previous === 7 * 24 * 3600 * 1000 ? run + 1 : 1;
    best = Math.max(best, run);
    previous = week;
  }
  return best;
}

const milestone = (id: string, title: string, description: string, current: number, target: number): Achievement => ({
  id,
  title,
  description,
  current: Math.min(current, target),
  target,
  earned: current >= target,
  progress: Math.min(1, current / target),
});

export function computeAchievements(input: AchievementInput): Achievement[] {
  const workouts = input.workoutDates.length;
  const streak = longestWeeklyStreak(input.workoutDates);
  return [
    milestone("first_workout", "Pierwszy trening", "Zapisz swój pierwszy ukończony trening", workouts, 1),
    milestone("workouts_10", "10 treningów", "Ukończ 10 treningów", workouts, 10),
    milestone("workouts_50", "50 treningów", "Ukończ 50 treningów", workouts, 50),
    milestone("streak_4", "Miesiąc regularności", "Trenuj co tydzień przez 4 tygodnie z rzędu", streak, 4),
    milestone("first_report", "Pierwszy raport", "Wyślij swój pierwszy raport tygodniowy", input.reportCount, 1),
    milestone("reports_8", "8 raportów", "Wyślij 8 raportów tygodniowych", input.reportCount, 8),
    milestone("first_photo", "Zdjęcie sylwetki", "Dodaj zdjęcie do raportu, żeby zobaczyć zmianę", input.reportsWithPhoto, 1),
    milestone("strength_gain", "Silniejszy niż na początku", "Zwiększ szacowane maksimum w którymkolwiek ćwiczeniu", input.strengthGains, 1),
  ];
}
