import { useQuery } from "@tanstack/react-query";
import { Flame } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface WorkoutSessionItem {
  completedAt: string;
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Monday first
  return d;
}

/** Weeks in a row (ending this week, or last week if this one is still empty) with at least one workout. */
export function weeklyStreak(sessions: WorkoutSessionItem[], now: Date = new Date()): number {
  const weeks = new Set(sessions.map((s) => startOfWeek(new Date(s.completedAt)).getTime()));
  const cursor = startOfWeek(now);
  if (!weeks.has(cursor.getTime())) cursor.setDate(cursor.getDate() - 7);
  let streak = 0;
  while (weeks.has(cursor.getTime())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 7);
  }
  return streak;
}

function weekWord(n: number): string {
  if (n === 1) return "tydzień";
  const lastTwo = n % 100;
  const last = n % 10;
  return last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14) ? "tygodnie" : "tygodni";
}

/** Motivation for the client's home page: workouts this week and the weekly streak. Hidden until the first workout. */
export function TrainingStreakCard() {
  const { data } = useQuery<WorkoutSessionItem[]>({ queryKey: ["/api/workout-sessions"] });
  const sessions = data ?? [];
  if (sessions.length === 0) return null;

  const weekStart = startOfWeek(new Date()).getTime();
  const thisWeek = sessions.filter((s) => new Date(s.completedAt).getTime() >= weekStart).length;
  const streak = weeklyStreak(sessions);

  return (
    <Card data-testid="card-training-streak">
      <CardContent className="flex flex-wrap items-center gap-x-8 gap-y-3 pt-6">
        <div className="flex items-center gap-3">
          <Flame className={`w-8 h-8 ${streak > 0 ? "text-orange-500" : "text-muted-foreground"}`} />
          <div>
            <p className="text-2xl font-bold" data-testid="text-streak-weeks">
              {streak} {weekWord(streak)}
            </p>
            <p className="text-sm text-muted-foreground">
              {streak > 0 ? "treningów z rzędu, co tydzień" : "Zrób trening, żeby zacząć serię"}
            </p>
          </div>
        </div>
        <div>
          <p className="text-2xl font-bold" data-testid="text-workouts-this-week">
            {thisWeek}
          </p>
          <p className="text-sm text-muted-foreground">{thisWeek === 1 ? "trening w tym tygodniu" : "treningów w tym tygodniu"}</p>
        </div>
      </CardContent>
    </Card>
  );
}
