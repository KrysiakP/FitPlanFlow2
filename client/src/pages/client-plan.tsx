import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Dumbbell } from "lucide-react";
import type { PlanAssignment, TrainingPlan, Exercise } from "@shared/schema";

type AssignmentWithPlan = PlanAssignment & {
  plan: TrainingPlan & { exercises: Exercise[] };
};

export default function ClientPlan() {
  const { data: assignment, isLoading } = useQuery<AssignmentWithPlan>({
    queryKey: ["/api/client/assignment"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <h3 className="font-heading font-semibold text-xl mb-2">Brak przypisanego planu</h3>
          <p className="text-muted-foreground">
            Skontaktuj się z trenerem, aby otrzymać swój plan treningowy
          </p>
        </CardContent>
      </Card>
    );
  }

  const { plan } = assignment;

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="font-heading font-bold text-4xl mb-2" data-testid="text-plan-name">
          {plan.name}
        </h1>
        {plan.description && (
          <p className="text-muted-foreground">{plan.description}</p>
        )}
        <p className="text-sm text-muted-foreground mt-2">
          Przypisany {new Date(assignment.assignedAt).toLocaleDateString("pl-PL")}
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="font-heading font-semibold text-2xl">Ćwiczenia</h2>
        <div className="space-y-4">
          {plan.exercises.map((exercise, index) => (
            <Card key={exercise.id} data-testid={`card-exercise-${exercise.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge variant="outline" className="font-mono">
                        #{index + 1}
                      </Badge>
                      <CardTitle className="font-heading" data-testid={`text-exercise-name-${exercise.id}`}>
                        {exercise.name}
                      </CardTitle>
                    </div>
                    {exercise.description && (
                      <CardDescription>{exercise.description}</CardDescription>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <Dumbbell className="w-4 h-4 text-muted-foreground" />
                    <span className="text-lg font-medium" data-testid={`text-exercise-sets-${exercise.id}`}>
                      {exercise.sets} serie
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-medium" data-testid={`text-exercise-reps-${exercise.id}`}>
                      {exercise.reps} powtórzeń
                    </span>
                  </div>
                  {exercise.restTime && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground" data-testid={`text-exercise-rest-${exercise.id}`}>
                        Odpoczynek: {exercise.restTime}s
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {plan.exercises.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">
              Ten plan nie zawiera jeszcze żadnych ćwiczeń
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
