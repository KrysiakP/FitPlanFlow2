import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPlanInvitationSchema } from "@shared/schema";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { AlertCircle, Crown, Users, Mail } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import type { TrainingPlan, Exercise, Workout, PlanInvitation, InsertPlanInvitationInput, User } from "@shared/schema";

type PlanWithDetails = TrainingPlan & {
  workouts: (Workout & { exercises: Exercise[] })[];
};

type InvitationWithPlan = PlanInvitation & {
  plan: TrainingPlan;
};

export default function AssignPlan() {
  const { id } = useParams();
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: plan, isLoading: planLoading } = useQuery<PlanWithDetails>({
    queryKey: ["/api/plans", id],
  });

  const { data: allInvitations } = useQuery<InvitationWithPlan[]>({
    queryKey: ["/api/invitations"],
    enabled: !!id,
    refetchInterval: () =>
      typeof document !== "undefined" && document.visibilityState === "visible"
        ? 30_000
        : false,
    refetchIntervalInBackground: false,
  });

  const { data: clients = [] } = useQuery<User[]>({
    queryKey: ["/api/trainer/clients"],
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

  const isPremium = user?.subscriptionTier === "premium" && user?.subscriptionStatus === "active";
  const isFree = !isPremium;

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

      {isFree && (
        <Alert data-testid="alert-free-tier-limit">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Plan Free - Limit 10 podopiecznych</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>
              W planie Free możesz mieć maksymalnie 10 aktywnych podopiecznych. 
              Jeśli potrzebujesz więcej, ulepsz swoje konto do Premium.
            </p>
            <Link href="/pricing">
              <Button variant="outline" size="sm" className="mt-2" data-testid="button-view-pricing">
                <Crown className="w-4 h-4 mr-2" />
                Zobacz plany cenowe
              </Button>
            </Link>
          </AlertDescription>
        </Alert>
      )}

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
            <CardTitle className="font-heading">Przypisz plan</CardTitle>
            <CardDescription>
              Wybierz podopiecznego z listy lub zaproś nową osobę
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={clients.length > 0 ? "existing" : "new"} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="existing" data-testid="tab-existing-clients">
                  <Users className="w-4 h-4 mr-2" />
                  Wybierz podopiecznego
                </TabsTrigger>
                <TabsTrigger value="new" data-testid="tab-new-client">
                  <Mail className="w-4 h-4 mr-2" />
                  Zaproś nową osobę
                </TabsTrigger>
              </TabsList>

              <TabsContent value="existing">
                {clients.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>Nie masz jeszcze żadnych podopiecznych</p>
                    <p className="text-sm mt-1">Zaproś pierwszą osobę używając zakładki "Zaproś nową osobę"</p>
                  </div>
                ) : (
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="clientEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Wybierz podopiecznego</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value || ""}
                            >
                              <FormControl>
                                <SelectTrigger data-testid="select-client">
                                  <SelectValue placeholder="Wybierz podopiecznego z listy..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {clients.map((client) => (
                                  <SelectItem
                                    key={client.id}
                                    value={client.email || ""}
                                    data-testid={`option-client-${client.id}`}
                                  >
                                    <div className="flex flex-col">
                                      <span className="font-medium">
                                        {client.firstName && client.lastName
                                          ? `${client.firstName} ${client.lastName}`
                                          : client.email}
                                      </span>
                                      {client.firstName && client.lastName && (
                                        <span className="text-xs text-muted-foreground">
                                          {client.email}
                                        </span>
                                      )}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Podopieczny otrzyma zaproszenie do tego planu
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
                              <Input type="hidden" {...field} value={field.value || ""} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <Button
                        type="submit"
                        disabled={sendInvitationMutation.isPending || !form.watch("clientEmail")}
                        data-testid="button-send-invitation-existing"
                        className="w-full"
                      >
                        {sendInvitationMutation.isPending
                          ? "Wysyłanie zaproszenia..."
                          : "Wyślij zaproszenie"}
                      </Button>
                    </form>
                  </Form>
                )}
              </TabsContent>

              <TabsContent value="new">
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
                              value={field.value || ""}
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
                            <Input type="hidden" {...field} value={field.value || ""} />
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
              </TabsContent>
            </Tabs>
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
