import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { TrainingPlan, Exercise, Workout } from "@shared/schema";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type PlanWithDetails = TrainingPlan & {
  workouts: (Workout & { exercises: Exercise[] })[];
  assignmentCount: number;
};

export default function TrainingPlans() {
  const { toast } = useToast();

  const { data: plans, isLoading } = useQuery<PlanWithDetails[]>({
    queryKey: ["/api/plans"],
  });

  const deletePlanMutation = useMutation({
    mutationFn: async (planId: string) => {
      await apiRequest("DELETE", `/api/plans/${planId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/stats"] });
      toast({
        title: "Plan usunięty",
        description: "Plan treningowy został pomyślnie usunięty",
      });
    },
    onError: () => {
      toast({
        title: "Błąd",
        description: "Nie udało się usunąć planu",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-4xl mb-2" data-testid="text-plans-title">
            Plany treningowe
          </h1>
          <p className="text-muted-foreground">Zarządzaj swoimi planami treningowymi</p>
        </div>
        <Button asChild data-testid="button-create-plan">
          <Link href="/plans/new">
            <Plus className="w-4 h-4 mr-2" />
            Utwórz plan
          </Link>
        </Button>
      </div>

      {!plans || plans.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center space-y-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
              <Plus className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-xl mb-2">Brak planów treningowych</h3>
              <p className="text-muted-foreground mb-4">
                Utwórz swój pierwszy plan treningowy dla podopiecznych
              </p>
              <Button asChild data-testid="button-create-first-plan">
                <Link href="/plans/new">
                  <Plus className="w-4 h-4 mr-2" />
                  Utwórz pierwszy plan
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card key={plan.id} className="flex flex-col" data-testid={`card-plan-${plan.id}`}>
              <CardHeader>
                <CardTitle className="font-heading" data-testid={`text-plan-name-${plan.id}`}>
                  {plan.name}
                </CardTitle>
                {plan.description && (
                  <CardDescription>{plan.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="flex-1">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="font-medium" data-testid={`text-workout-count-${plan.id}`}>
                      {plan.workouts.length} {plan.workouts.length === 1 ? 'trening' : 'treningów'}
                    </span>
                    <span>•</span>
                    <span className="font-medium" data-testid={`text-exercise-count-${plan.id}`}>
                      {plan.workouts.reduce((sum, w) => sum + w.exercises.length, 0)} ćwiczeń
                    </span>
                  </div>
                  {plan.workouts.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Treningi:</p>
                      <ul className="text-sm space-y-1">
                        {plan.workouts.slice(0, 3).map((workout) => (
                          <li key={workout.id} className="truncate">
                            • {workout.name} ({workout.exercises.length} {workout.exercises.length === 1 ? 'ćwiczenie' : 'ćwiczeń'})
                          </li>
                        ))}
                        {plan.workouts.length > 3 && (
                          <li className="text-xs text-muted-foreground">
                            +{plan.workouts.length - 3} więcej
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm pt-2">
                    <Users className="w-4 h-4" />
                    <span data-testid={`text-assignment-count-${plan.id}`}>
                      {plan.assignmentCount} przypisań
                    </span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  data-testid={`button-edit-${plan.id}`}
                >
                  <Link href={`/plans/${plan.id}/edit`}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Edytuj
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  data-testid={`button-assign-${plan.id}`}
                >
                  <Link href={`/plans/${plan.id}/assign`}>
                    <Users className="w-4 h-4 mr-2" />
                    Przypisz
                  </Link>
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      data-testid={`button-delete-${plan.id}`}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Usuń
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Czy na pewno?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Ta operacja jest nieodwracalna. Plan treningowy zostanie trwale usunięty.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel data-testid={`button-cancel-delete-${plan.id}`}>
                        Anuluj
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deletePlanMutation.mutate(plan.id)}
                        data-testid={`button-confirm-delete-${plan.id}`}
                      >
                        Usuń plan
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
