import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertCircle, Copy, Mail, Trash2, UserCheck, UserX, Users, Activity, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface GymMe {
  id: string;
  name: string;
  planTier: string;
  maxTrainers: number;
  contactEmail: string | null;
  phone: string | null;
  address: string | null;
  stats: { activeTrainers: number; invitedTrainers: number; totalClients: number };
}

interface GymTrainerRow {
  id: string;
  status: "invited" | "active" | "suspended";
  inviteEmail: string;
  inviteCode: string | null;
  trainerFirstName: string | null;
  trainerLastName: string | null;
  trainerEmail: string | null;
  trainerClientCount: number | null;
  sessionsLast30Days: number;
}

interface GymAnalytics {
  totalClients: number;
  totalSessions: number;
  totalPlans: number;
  trainerBreakdown: { trainerId: string; name: string; activeClients: number; sessionCount: number; plansCount: number }[];
}

const STATUS_LABELS: Record<GymTrainerRow["status"], string> = {
  invited: "Zaproszony",
  active: "Aktywny",
  suspended: "Zawieszony",
};

function errorMessage(error: unknown, fallback: string) {
  const raw = error instanceof Error ? error.message : "";
  const idx = raw.indexOf(": ");
  if (idx > -1) {
    try {
      const parsed = JSON.parse(raw.slice(idx + 2));
      if (parsed?.message) return String(parsed.message);
    } catch {
      /* not JSON */
    }
  }
  return fallback;
}

export default function StudioDashboard() {
  const { toast } = useToast();
  const [inviteEmail, setInviteEmail] = useState("");

  const gymQuery = useQuery<GymMe>({ queryKey: ["/api/gym/me"] });
  const trainersQuery = useQuery<GymTrainerRow[]>({ queryKey: ["/api/gym/trainers"] });
  const analyticsQuery = useQuery<GymAnalytics>({ queryKey: ["/api/gym/analytics"] });

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/gym/me"] });
    queryClient.invalidateQueries({ queryKey: ["/api/gym/trainers"] });
    queryClient.invalidateQueries({ queryKey: ["/api/gym/analytics"] });
  };

  const inviteMutation = useMutation({
    mutationFn: async (email: string) => apiRequest("POST", "/api/gym/trainers/invite", { email }),
    onSuccess: (result) => {
      toast({
        title: "Zaproszenie utworzone",
        description: result?.emailSent
          ? "Wysłaliśmy trenerowi e-mail z kodem. Kod znajdziesz też na liście poniżej."
          : "Nie udało się wysłać e-maila — przekaż trenerowi kod z listy poniżej.",
      });
      setInviteEmail("");
      refreshAll();
    },
    onError: (error) =>
      toast({ title: "Błąd", description: errorMessage(error, "Nie udało się zaprosić trenera"), variant: "destructive" }),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "active" | "suspended" }) =>
      apiRequest("PATCH", `/api/gym/trainers/${id}/status`, { status }),
    onSuccess: refreshAll,
    onError: (error) =>
      toast({ title: "Błąd", description: errorMessage(error, "Nie udało się zmienić statusu"), variant: "destructive" }),
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/gym/trainers/${id}`),
    onSuccess: () => {
      toast({ title: "Trener usunięty ze studia" });
      refreshAll();
    },
    onError: (error) =>
      toast({ title: "Błąd", description: errorMessage(error, "Nie udało się usunąć trenera"), variant: "destructive" }),
  });

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast({ title: "Skopiowano kod", description: code });
    } catch {
      toast({ title: "Nie udało się skopiować", description: "Zaznacz kod i skopiuj ręcznie.", variant: "destructive" });
    }
  };

  if (gymQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      </div>
    );
  }

  if (gymQuery.isError || !gymQuery.data) {
    return (
      <Alert variant="destructive" data-testid="alert-studio-error">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Błąd ładowania</AlertTitle>
        <AlertDescription>Nie udało się pobrać danych studia. Odśwież stronę, aby spróbować ponownie.</AlertDescription>
      </Alert>
    );
  }

  const gym = gymQuery.data;
  const trainers = trainersQuery.data ?? [];
  const slotsUsed = gym.stats.activeTrainers + gym.stats.invitedTrainers;
  const limitReached = slotsUsed >= gym.maxTrainers;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading font-bold text-3xl md:text-4xl mb-1" data-testid="text-studio-name">
          {gym.name}
        </h1>
        <p className="text-muted-foreground">Panel zarządzania studiem</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card data-testid="card-stat-trainers">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trenerzy</CardTitle>
            <Dumbbell className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {gym.stats.activeTrainers} / {gym.maxTrainers}
            </div>
            <p className="text-xs text-muted-foreground">
              Aktywni trenerzy{gym.stats.invitedTrainers > 0 ? `, ${gym.stats.invitedTrainers} zaproszonych` : ""}
            </p>
          </CardContent>
        </Card>
        <Card data-testid="card-stat-clients">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Podopieczni</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{gym.stats.totalClients}</div>
            <p className="text-xs text-muted-foreground">Aktywni podopieczni wszystkich trenerów</p>
          </CardContent>
        </Card>
        <Card data-testid="card-stat-sessions">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Treningi</CardTitle>
            <Activity className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {analyticsQuery.isError ? (
              <p className="text-sm text-destructive">Brak danych</p>
            ) : (
              <div className="text-2xl font-bold">{analyticsQuery.data?.totalSessions ?? "…"}</div>
            )}
            <p className="text-xs text-muted-foreground">Zapisane treningi podopiecznych (łącznie)</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Zaproś trenera
          </CardTitle>
          <CardDescription>
            Wpisz e-mail trenera. Dostanie kod, który wpisze w swoim profilu w aplikacji, żeby dołączyć do studia.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col sm:flex-row gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              const email = inviteEmail.trim();
              if (email) inviteMutation.mutate(email);
            }}
          >
            <Input
              type="email"
              placeholder="trener@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              disabled={limitReached}
              data-testid="input-invite-trainer-email"
            />
            <Button
              type="submit"
              disabled={limitReached || inviteMutation.isPending || !inviteEmail.trim()}
              data-testid="button-invite-trainer"
            >
              {inviteMutation.isPending ? "Wysyłanie..." : "Zaproś"}
            </Button>
          </form>
          {limitReached && (
            <p className="text-sm text-muted-foreground mt-3" data-testid="text-trainer-limit">
              Osiągnięto limit trenerów ({gym.maxTrainers}) dla Twojego pakietu. Skontaktuj się z nami, aby go zwiększyć.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading">Trenerzy w studiu</CardTitle>
          <CardDescription>
            Widzisz wyłącznie liczby zbiorcze. Dane i treści podopiecznych pozostają prywatne dla ich trenera.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {trainersQuery.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : trainersQuery.isError ? (
            <Alert variant="destructive" data-testid="alert-trainers-error">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Nie udało się pobrać listy trenerów. Odśwież stronę, aby spróbować ponownie.</AlertDescription>
            </Alert>
          ) : trainers.length === 0 ? (
            <p className="text-muted-foreground text-sm" data-testid="text-no-trainers">
              Nie masz jeszcze żadnych trenerów. Zaproś pierwszego powyżej.
            </p>
          ) : (
            <div className="space-y-3">
              {trainers.map((t) => {
                const name = [t.trainerFirstName, t.trainerLastName].filter(Boolean).join(" ") || t.inviteEmail;
                return (
                  <div
                    key={t.id}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-lg border p-4"
                    data-testid={`row-trainer-${t.id}`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium truncate">{name}</p>
                        <Badge variant={t.status === "active" ? "default" : t.status === "suspended" ? "destructive" : "secondary"}>
                          {STATUS_LABELS[t.status]}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{t.trainerEmail ?? t.inviteEmail}</p>
                      {t.status !== "invited" && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {t.trainerClientCount ?? 0} podopiecznych · {t.sessionsLast30Days} treningów w ostatnich 30 dniach
                        </p>
                      )}
                      {t.status === "invited" && t.inviteCode && (
                        <button
                          type="button"
                          onClick={() => copyCode(t.inviteCode!)}
                          className="mt-1 inline-flex items-center gap-1 text-sm font-mono text-primary hover:underline"
                          data-testid={`button-copy-code-${t.id}`}
                        >
                          Kod: {t.inviteCode}
                          <Copy className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {t.status === "active" && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={statusMutation.isPending}
                          onClick={() => statusMutation.mutate({ id: t.id, status: "suspended" })}
                          data-testid={`button-suspend-${t.id}`}
                        >
                          <UserX className="w-4 h-4 mr-1" />
                          Zawieś
                        </Button>
                      )}
                      {t.status === "suspended" && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={statusMutation.isPending}
                          onClick={() => statusMutation.mutate({ id: t.id, status: "active" })}
                          data-testid={`button-activate-${t.id}`}
                        >
                          <UserCheck className="w-4 h-4 mr-1" />
                          Aktywuj
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" data-testid={`button-remove-${t.id}`}>
                            <Trash2 className="w-4 h-4 mr-1" />
                            Usuń
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Usunąć trenera ze studia?</AlertDialogTitle>
                            <AlertDialogDescription>
                              {name} przestanie należeć do studia. Jego podopieczni i plany pozostaną u niego bez zmian.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Anuluj</AlertDialogCancel>
                            <AlertDialogAction onClick={() => removeMutation.mutate(t.id)} data-testid={`button-confirm-remove-${t.id}`}>
                              Usuń ze studia
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
