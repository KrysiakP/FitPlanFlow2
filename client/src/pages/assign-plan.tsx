import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import type { User, TrainingPlan, Exercise } from "@shared/schema";

type PlanWithExercises = TrainingPlan & { exercises: Exercise[] };

export default function AssignPlan() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedClients, setSelectedClients] = useState<string[]>([]);

  const { data: plan, isLoading: planLoading } = useQuery<PlanWithExercises>({
    queryKey: ["/api/plans", id],
  });

  const { data: availableClients, isLoading: clientsLoading } = useQuery<User[]>({
    queryKey: ["/api/clients/available"],
  });

  const assignMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/assignments/bulk", {
        planId: id,
        clientIds: selectedClients,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/stats"] });
      toast({
        title: "Plan przypisany",
        description: `Plan został przypisany do ${selectedClients.length} podopiecznych`,
      });
      setLocation("/plans");
    },
    onError: () => {
      toast({
        title: "Błąd",
        description: "Nie udało się przypisać planu",
        variant: "destructive",
      });
    },
  });

  const toggleClient = (clientId: string) => {
    setSelectedClients((prev) =>
      prev.includes(clientId)
        ? prev.filter((id) => id !== clientId)
        : [...prev, clientId]
    );
  };

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const first = firstName?.charAt(0) || "";
    const last = lastName?.charAt(0) || "";
    return (first + last).toUpperCase() || "?";
  };

  if (planLoading || clientsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!plan) {
    return <div>Plan nie znaleziony</div>;
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="font-heading font-bold text-4xl mb-2" data-testid="text-assign-title">
          Przypisz plan do podopiecznych
        </h1>
        <p className="text-muted-foreground">
          Wybierz podopiecznych, którym chcesz przypisać ten plan
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading">Plan treningowy</CardTitle>
            <CardDescription>Szczegóły planu do przypisania</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-heading font-semibold text-lg mb-2" data-testid="text-plan-name">
                {plan.name}
              </h3>
              {plan.description && (
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Ćwiczenia ({plan.exercises.length}):</p>
              <ul className="text-sm space-y-1">
                {plan.exercises.slice(0, 5).map((exercise) => (
                  <li key={exercise.id} className="flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-primary" />
                    {exercise.name} - {exercise.sets}x{exercise.reps}
                  </li>
                ))}
                {plan.exercises.length > 5 && (
                  <li className="text-muted-foreground">+ {plan.exercises.length - 5} więcej</li>
                )}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading">Wybierz podopiecznych</CardTitle>
            <CardDescription>
              Zaznacz osoby, którym chcesz przypisać ten plan
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!availableClients || availableClients.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Brak dostępnych podopiecznych</p>
                <p className="text-sm mt-2">
                  Podopieczni pojawią się tutaj po zalogowaniu do platformy
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {availableClients.map((client) => (
                  <div
                    key={client.id}
                    className="flex items-center gap-3 p-3 rounded-lg border hover-elevate cursor-pointer"
                    onClick={() => toggleClient(client.id)}
                    data-testid={`client-option-${client.id}`}
                  >
                    <Checkbox
                      checked={selectedClients.includes(client.id)}
                      onCheckedChange={() => toggleClient(client.id)}
                      data-testid={`checkbox-client-${client.id}`}
                    />
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={client.profileImageUrl || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getInitials(client.firstName, client.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium" data-testid={`text-client-name-${client.id}`}>
                        {client.firstName} {client.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">{client.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4">
        <Button
          onClick={() => assignMutation.mutate()}
          disabled={selectedClients.length === 0 || assignMutation.isPending}
          data-testid="button-confirm-assign"
        >
          {assignMutation.isPending
            ? "Przypisywanie..."
            : `Przypisz do ${selectedClients.length} ${selectedClients.length === 1 ? "osoby" : "osób"}`}
        </Button>
        <Button
          variant="outline"
          onClick={() => setLocation("/plans")}
          data-testid="button-cancel-assign"
        >
          Anuluj
        </Button>
      </div>
    </div>
  );
}
