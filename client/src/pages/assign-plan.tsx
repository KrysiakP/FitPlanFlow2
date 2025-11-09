import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPlanInvitationSchema } from "@shared/schema";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import type { TrainingPlan, Exercise, Workout, PlanInvitation, InsertPlanInvitationInput } from "@shared/schema";

type PlanWithDetails = TrainingPlan & {
  workouts: (Workout & { exercises: Exercise[] })[];
};

type InvitationWithPlan = PlanInvitation & {
  plan: TrainingPlan;
};

export default function AssignPlan() {
  const { id } = useParams();
  const { toast } = useToast();

  const { data: plan, isLoading: planLoading } = useQuery<PlanWithDetails>({
    queryKey: ["/api/plans", id],
  });

  const { data: allInvitations } = useQuery<InvitationWithPlan[]>({
    queryKey: ["/api/invitations"],
    enabled: !!id,
  });

  const planInvitations = allInvitations?.filter(inv => inv.planId === id) || [];

  const form = useForm<InsertPlanInvitationInput>({
    resolver: zodResolver(insertPlanInvitationSchema),
    defaultValues: {
      clientEmail: "",
      planId: id || "",
    },
  });

  const sendInvitationMutation = useMutation({
    mutationFn: async (data: InsertPlanInvitationInput) => {
      return await apiRequest("POST", "/api/invitations/send", data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/invitations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/stats"] });
      toast({
        title: "Zaproszenie wysłane",
        description: `Zaproszenie wysłane do ${variables.clientEmail}`,
      });
      form.reset({
        clientEmail: "",
        planId: id || "",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Błąd",
        description: error.message || "Nie udało się wysłać zaproszenia",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertPlanInvitationInput) => {
    sendInvitationMutation.mutate(data);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Oczekujące</Badge>;
      case "accepted":
        return <Badge variant="default">Zaakceptowane</Badge>;
      case "rejected":
        return <Badge variant="destructive">Odrzucone</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (planLoading) {
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
          Zaproś podopiecznego do planu
        </h1>
        <p className="text-muted-foreground">
          Wyślij zaproszenie do planu treningowego na adres email podopiecznego
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
              <p className="text-sm font-medium">
                {plan.workouts.length} {plan.workouts.length === 1 ? 'trening' : 'treningów'} • {plan.workouts.reduce((sum, w) => sum + w.exercises.length, 0)} ćwiczeń
              </p>
              {plan.workouts.length > 0 && (
                <div className="space-y-2">
                  {plan.workouts.slice(0, 2).map((workout) => (
                    <div key={workout.id}>
                      <p className="text-xs font-medium text-muted-foreground mb-1">{workout.name}:</p>
                      <ul className="text-sm space-y-1 ml-4">
                        {workout.exercises.slice(0, 3).map((exercise) => (
                          <li key={exercise.id} className="flex items-center gap-2">
                            <span className="w-1 h-1 rounded-full bg-primary" />
                            {exercise.name} - {exercise.sets}x{exercise.reps}
                          </li>
                        ))}
                        {workout.exercises.length > 3 && (
                          <li className="text-xs text-muted-foreground">+ {workout.exercises.length - 3} więcej</li>
                        )}
                      </ul>
                    </div>
                  ))}
                  {plan.workouts.length > 2 && (
                    <p className="text-xs text-muted-foreground">+ {plan.workouts.length - 2} więcej treningów</p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading">Zaproś podopiecznego</CardTitle>
            <CardDescription>
              Wpisz adres email podopiecznego aby wysłać mu zaproszenie do tego planu
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="clientEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email podopiecznego</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="email@podopiecznego.pl"
                          data-testid="input-client-email"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Podopieczny otrzyma zaproszenie na podany adres email
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="planId"
                  render={({ field }) => (
                    <FormItem className="hidden">
                      <FormControl>
                        <Input type="hidden" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  disabled={sendInvitationMutation.isPending}
                  data-testid="button-send-invitation"
                  className="w-full"
                >
                  {sendInvitationMutation.isPending
                    ? "Wysyłanie zaproszenia..."
                    : "Wyślij zaproszenie"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      {planInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading">Wysłane zaproszenia</CardTitle>
            <CardDescription>
              Lista zaproszeń wysłanych dla tego planu
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {planInvitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                  data-testid={`card-invitation-${invitation.id}`}
                >
                  <div className="flex-1">
                    <p className="font-medium">{invitation.clientEmail}</p>
                    <p className="text-sm text-muted-foreground">
                      Wysłano: {format(new Date(invitation.createdAt), "dd.MM.yyyy HH:mm")}
                    </p>
                  </div>
                  <div>
                    {getStatusBadge(invitation.status)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
