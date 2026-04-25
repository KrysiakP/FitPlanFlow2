import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPlanInvitationSchema } from "@shared/schema";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Crown, Send, CheckCircle, Mail } from "lucide-react";
import { Link } from "wouter";
import { useEffect, useRef } from "react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import type { TrainingPlan, InsertPlanInvitationInput, PlanInvitation } from "@shared/schema";

type InvitationWithPlan = PlanInvitation & {
  plan: TrainingPlan | null;
};

function getStatusBadge(status: string) {
  switch (status) {
    case "pending":
      return <Badge variant="secondary" data-testid="badge-status-pending">Oczekujące</Badge>;
    case "accepted":
      return <Badge variant="default" data-testid="badge-status-accepted">Zaakceptowane</Badge>;
    case "rejected":
      return <Badge variant="destructive" data-testid="badge-status-rejected">Odrzucone</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export default function InviteClient() {
  const { toast } = useToast();
  const { user } = useAuth();
  const knownStatuses = useRef<Map<string, string> | null>(null);
  const invitationsInitialized = useRef(false);

  const { data: plans, isLoading: plansLoading } = useQuery<TrainingPlan[]>({
    queryKey: ["/api/plans"],
  });

  const { data: invitations = [], isLoading: invitationsLoading, isSuccess: invitationsSuccess } =
    useQuery<InvitationWithPlan[]>({
      queryKey: ["/api/invitations"],
      refetchInterval: () =>
        typeof document !== "undefined" && document.visibilityState === "visible"
          ? 30_000
          : false,
      refetchIntervalInBackground: false,
    });

  useEffect(() => {
    if (!invitationsSuccess) return;

    if (!invitationsInitialized.current) {
      invitationsInitialized.current = true;
      knownStatuses.current = new Map(invitations.map((inv) => [inv.id, inv.status]));
      return;
    }

    const known = knownStatuses.current!;
    invitations.forEach((inv) => {
      const prev = known.get(inv.id);
      if (prev === "pending" && inv.status === "accepted") {
        toast({
          title: "Zaproszenie zaakceptowane",
          description: `${inv.clientEmail} zaakceptował Twoje zaproszenie.`,
          duration: 6000,
        });
      }
    });

    knownStatuses.current = new Map(invitations.map((inv) => [inv.id, inv.status]));
  }, [invitations, invitationsSuccess, toast]);

  const form = useForm<InsertPlanInvitationInput>({
    resolver: zodResolver(insertPlanInvitationSchema),
    defaultValues: {
      clientEmail: "",
      planId: null,
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
        planId: null,
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

  const isStartTier = !user?.subscriptionTier || user?.subscriptionTier === "start";

  if (plansLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="font-heading font-bold text-4xl mb-2" data-testid="text-invite-title">
          Zaproś podopiecznego
        </h1>
        <p className="text-muted-foreground">
          Wyślij zaproszenie do wybranego planu treningowego na adres email podopiecznego
        </p>
      </div>

      {isStartTier && (
        <Alert data-testid="alert-free-tier-limit">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Plan START - Limit 3 podopiecznych</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>
              Korzystasz z darmowego planu START. Możesz mieć maksymalnie 3 aktywnych podopiecznych.
            </p>
            <Button variant="outline" size="sm" className="gap-2" data-testid="button-upgrade-premium" asChild>
              <Link href="/pricing">
                <Crown className="w-4 h-4" />
                Upgrade do SOLO/PRO/ELITE
              </Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Card data-testid="card-invite-form">
        <CardHeader>
          <CardTitle className="font-heading flex items-center gap-2">
            <Send className="w-5 h-5" />
            Wyślij zaproszenie
          </CardTitle>
          <CardDescription>
            Wypełnij formularz aby wysłać zaproszenie do swojego planu treningowego
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="clientEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email podopiecznego</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="jan.kowalski@example.com"
                        data-testid="input-client-email"
                      />
                    </FormControl>
                    <FormDescription>
                      Adres email osoby, którą chcesz zaprosić do planu treningowego
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="planId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plan treningowy (opcjonalnie)</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(value === "NO_PLAN" ? null : value)} 
                      value={field.value || "NO_PLAN"}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-plan">
                          <SelectValue placeholder="Wybierz plan lub pomiń" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="NO_PLAN" data-testid="option-no-plan">
                          Bez planu (przypisz później)
                        </SelectItem>
                        {plans && plans.length > 0 && (
                          plans.map((plan) => (
                            <SelectItem key={plan.id} value={plan.id} data-testid={`option-plan-${plan.id}`}>
                              {plan.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Możesz zaprosić podopiecznego bez przypisywania planu. Plan można przypisać później z listy podopiecznych.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3">
                <Button
                    type="submit"
                    disabled={sendInvitationMutation.isPending}
                    className="gap-2"
                    data-testid="button-send-invitation"
                  >
                    {sendInvitationMutation.isPending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                        Wysyłanie...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Wyślij zaproszenie
                      </>
                    )}
                  </Button>
                <Button type="button" variant="outline" data-testid="button-back-to-plans" asChild>
                  <Link href="/plans">
                    Anuluj
                  </Link>
                </Button>
              </div>
              </form>
            </Form>
        </CardContent>
      </Card>

      <Card data-testid="card-sent-invitations">
        <CardHeader>
          <CardTitle className="font-heading flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Wysłane zaproszenia
          </CardTitle>
          <CardDescription>
            Lista Twoich zaproszeń i ich aktualny status — odświeżana automatycznie co 30 sekund
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invitationsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : invitations.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center" data-testid="text-no-invitations">
              Nie wysłałeś jeszcze żadnych zaproszeń.
            </p>
          ) : (
            <div className="space-y-3">
              {invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-4 rounded-lg border gap-4 flex-wrap"
                  data-testid={`card-invitation-${invitation.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate" data-testid={`text-invitation-email-${invitation.id}`}>
                      {invitation.clientEmail}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {invitation.plan ? invitation.plan.name : "Bez planu"} &middot;{" "}
                      {format(new Date(invitation.createdAt), "d MMM yyyy, HH:mm", { locale: pl })}
                    </p>
                  </div>
                  <div>{getStatusBadge(invitation.status)}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Jak to działa?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
              1
            </div>
            <div>
              <p className="font-medium">Wyślij zaproszenie</p>
              <p className="text-sm text-muted-foreground">
                Podaj email podopiecznego i wybierz plan treningowy (lub przypisz go później)
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
              2
            </div>
            <div>
              <p className="font-medium">Podopieczny otrzyma zaproszenie</p>
              <p className="text-sm text-muted-foreground">
                Po zalogowaniu zobaczy zaproszenie na swoim panelu
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
              3
            </div>
            <div>
              <p className="font-medium">Akceptacja i rozpoczęcie treningu</p>
              <p className="text-sm text-muted-foreground">
                Po akceptacji plan zostanie automatycznie przypisany
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
