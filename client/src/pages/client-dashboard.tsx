import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList, Calendar } from "lucide-react";
import { Link } from "wouter";
import type { PlanAssignment, TrainingPlan, Workout, Exercise } from "@shared/schema";

type AssignmentWithPlan = PlanAssignment & {
  plan: TrainingPlan & { 
    workouts: (Workout & { exercises: Exercise[] })[];
  };
};

export default function ClientDashboard() {
  const { user } = useAuth();

  const { data: assignment } = useQuery<AssignmentWithPlan>({
    queryKey: ["/api/client/assignment"],
  });

  const getTotalExercises = () => {
    if (!assignment?.plan.workouts) return 0;
    return assignment.plan.workouts.reduce((total, workout) => {
      return total + (workout.exercises?.length || 0);
    }, 0);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading font-bold text-4xl mb-2" data-testid="text-dashboard-title">
          Witaj, {user?.firstName || "Podopieczny"}!
        </h1>
        <p className="text-muted-foreground">
          Sprawdź swój plan treningowy i zacznij trenować
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card data-testid="card-stat-plan">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktywny plan</CardTitle>
            <ClipboardList className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-plan-status">
              {assignment ? "Przypisany" : "Brak"}
            </div>
            <p className="text-xs text-muted-foreground">
              {assignment ? assignment.plan.name : "Nie masz przypisanego planu"}
            </p>
          </CardContent>
        </Card>

        {assignment && (
          <Card data-testid="card-stat-exercises">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ćwiczenia</CardTitle>
              <Calendar className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-exercise-count">
                {getTotalExercises()}
              </div>
              <p className="text-xs text-muted-foreground">Łączna liczba ćwiczeń</p>
            </CardContent>
          </Card>
        )}
      </div>

      {assignment ? (
        <Link href="/my-plan">
          <Card className="hover-elevate cursor-pointer" data-testid="card-current-plan">
            <CardHeader>
              <CardTitle className="font-heading">{assignment.plan.name}</CardTitle>
              {assignment.plan.description && (
                <CardDescription>{assignment.plan.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">
                    Przypisany {new Date(assignment.assignedAt).toLocaleDateString("pl-PL")}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ClipboardList className="w-4 h-4" />
                  <span>{getTotalExercises()} ćwiczeń</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ) : (
        <Card>
          <CardContent className="p-12 text-center space-y-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
              <ClipboardList className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-xl mb-2">Brak przypisanego planu</h3>
              <p className="text-muted-foreground">
                Skontaktuj się z trenerem, aby otrzymać swój plan treningowy
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
