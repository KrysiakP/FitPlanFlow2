import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, User, Apple, UtensilsCrossed, ChefHat, Pill } from "lucide-react";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { DietPlan, User as UserType, DietSupplement } from "@shared/schema";
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
import { Skeleton } from "@/components/ui/skeleton";

type DietPlanWithClient = DietPlan & {
  client?: UserType | null;
};

function SupplementCountBadge({ planId, mode }: { planId: string; mode: string | null }) {
  const { data: supplements } = useQuery<DietSupplement[]>({
    queryKey: ["/api/diet-plans", planId, "supplements"],
    enabled: mode === 'macro_with_meals' || mode === 'full_plan',
  });

  if (!supplements || supplements.length === 0) {
    return null;
  }

  return (
    <Badge variant="outline" className="flex items-center gap-1" data-testid={`badge-supplements-${planId}`}>
      <Pill className="w-3 h-3" />
      {supplements.length}
    </Badge>
  );
}

export default function TrainerDiets() {
  const { toast } = useToast();

  const { data: plans, isLoading } = useQuery<DietPlanWithClient[]>({
    queryKey: ["/api/diets/plans"],
  });

  const deletePlanMutation = useMutation({
    mutationFn: async (planId: string) => {
      await apiRequest("DELETE", `/api/diets/plans/${planId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/diets/plans"] });
      toast({
        title: "Plan usunięty",
        description: "Plan dietetyczny został pomyślnie usunięty",
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

  const getStatusBadgeVariant = (status: string) => {
    if (status === "draft") return "secondary";
    if (status === "active") return "default";
    if (status === "completed") return "outline";
    return "secondary";
  };

  const getStatusLabel = (status: string) => {
    if (status === "draft") return "Szkic";
    if (status === "active") return "Aktywny";
    if (status === "completed") return "Zakończony";
    return status;
  };

  const getModeLabel = (mode?: string | null) => {
    if (mode === "macro_only") return "Tylko makro";
    if (mode === "macro_with_meals") return "Makro z posiłkami";
    if (mode === "full_plan") return "Pełna rozpiska";
    return "Tylko makro"; // default for backward compatibility
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-10 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-9 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-4xl mb-2" data-testid="text-diets-title">
            Plany dietetyczne
          </h1>
          <p className="text-muted-foreground">Zarządzaj planami dietetycznymi dla swoich podopiecznych</p>
        </div>
        <Button asChild data-testid="button-new-diet-plan">
          <Link href="/trainer/diets/new">
            <Plus className="w-4 h-4 mr-2" />
            Nowy plan
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
              <h3 className="font-heading font-semibold text-xl mb-2">Brak planów dietetycznych</h3>
              <p className="text-muted-foreground mb-4">
                Utwórz swój pierwszy plan dietetyczny dla podopiecznych
              </p>
              <Button asChild data-testid="button-create-first-diet-plan">
                <Link href="/trainer/diets/new">
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
            <Card key={plan.id} className="flex flex-col" data-testid={`card-diet-plan-${plan.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="font-heading" data-testid={`text-plan-name-${plan.id}`}>
                    {plan.name}
                  </CardTitle>
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="outline" data-testid={`badge-mode-${plan.id}`} className="flex items-center gap-1">
                      {plan.mode === 'macro_only' && <Apple className="w-3 h-3" />}
                      {plan.mode === 'macro_with_meals' && <UtensilsCrossed className="w-3 h-3" />}
                      {plan.mode === 'full_plan' && <ChefHat className="w-3 h-3" />}
                      {!plan.mode && <Apple className="w-3 h-3" />}
                      {getModeLabel(plan.mode)}
                    </Badge>
                    <Badge variant={getStatusBadgeVariant(plan.status)} data-testid={`badge-status-${plan.id}`}>
                      {getStatusLabel(plan.status)}
                    </Badge>
                    <SupplementCountBadge planId={plan.id} mode={plan.mode} />
                  </div>
                </div>
                {plan.description && (
                  <CardDescription>{plan.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="flex-1">
                <div className="space-y-3">
                  {plan.client && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span data-testid={`text-client-${plan.id}`}>
                        {plan.client.firstName} {plan.client.lastName}
                      </span>
                    </div>
                  )}
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground font-medium">Makroskładniki:</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Kalorie:</span>{" "}
                        <span className="font-medium" data-testid={`text-calories-${plan.id}`}>
                          {plan.targetCalories} kcal
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Białko:</span>{" "}
                        <span className="font-medium" data-testid={`text-protein-${plan.id}`}>
                          {plan.targetProtein}g
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Tłuszcze:</span>{" "}
                        <span className="font-medium" data-testid={`text-fat-${plan.id}`}>
                          {plan.targetFat}g
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Węglowodany:</span>{" "}
                        <span className="font-medium" data-testid={`text-carbs-${plan.id}`}>
                          {plan.targetCarbs}g
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-sm pt-2">
                    <span className="text-muted-foreground">Liczba posiłków:</span>{" "}
                    <span className="font-medium" data-testid={`text-meals-${plan.id}`}>
                      {plan.mealsPerDay}
                    </span>
                  </div>
                  {(plan.startDate || plan.endDate) && (
                    <div className="text-xs text-muted-foreground pt-1">
                      {plan.startDate && (
                        <div>
                          Start: {new Date(plan.startDate).toLocaleDateString('pl-PL')}
                        </div>
                      )}
                      {plan.endDate && (
                        <div>
                          Koniec: {new Date(plan.endDate).toLocaleDateString('pl-PL')}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="gap-2 flex-wrap">
                {plan.clientId && (
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <Link
                      href={`/trainer/clients/${plan.clientId}/diet`}
                      data-testid={`link-view-diet-progress-${plan.id}`}
                    >
                      Zobacz postępy
                    </Link>
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  data-testid={`button-edit-diet-plan-${plan.id}`}
                >
                  <Link href={`/trainer/diets/${plan.id}/edit`}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Edytuj
                  </Link>
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      data-testid={`button-delete-diet-plan-${plan.id}`}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Usuń
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Czy na pewno?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Ta operacja jest nieodwracalna. Plan dietetyczny zostanie trwale usunięty.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel data-testid={`button-cancel-delete-${plan.id}`}>
                        Anuluj
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deletePlanMutation.mutate(plan.id)}
                        data-testid="button-confirm-delete-diet-plan"
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
