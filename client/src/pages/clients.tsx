import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Search, User, Calendar, TrendingUp, Target, Heart, CheckCircle2, MessageSquare } from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import type { User as UserType, PlanAssignment, TrainingPlan, ClientProgress } from "@shared/schema";

type ClientWithAssignment = UserType & {
  assignment?: PlanAssignment & { plan: TrainingPlan };
};

export default function Clients() {
  const [searchEmail, setSearchEmail] = useState("");
  const [foundClient, setFoundClient] = useState<ClientWithAssignment | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const searchMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await apiRequest("POST", "/api/clients/search", { email });
      return await response.json() as ClientWithAssignment;
    },
    onSuccess: (data) => {
      setFoundClient(data);
      setSearchError(null);
    },
    onError: (error: any) => {
      setFoundClient(null);
      if (error?.message === "Client not found") {
        setSearchError("Nie znaleziono podopiecznego o podanym emailu. Upewnij się że użytkownik zarejestrował się jako podopieczny.");
      } else {
        setSearchError("Wystąpił błąd podczas wyszukiwania. Spróbuj ponownie.");
      }
    },
  });

  const { data: clientProgress, isLoading: isLoadingProgress } = useQuery<ClientProgress | null>({
    queryKey: ["/api/trainer/clients", foundClient?.id, "progress"],
    enabled: !!foundClient?.id,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchEmail.trim()) {
      searchMutation.mutate(searchEmail.trim());
    }
  };

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const first = firstName?.charAt(0) || "";
    const last = lastName?.charAt(0) || "";
    return (first + last).toUpperCase() || "?";
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading font-bold text-4xl mb-2" data-testid="text-clients-title">
          Podopieczni
        </h1>
        <p className="text-muted-foreground" data-testid="text-clients-description">
          Wyszukaj podopiecznego po emailu aby zobaczyć jego plan i postępy
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="flex-1">
              <Input
                type="email"
                placeholder="Wpisz adres email podopiecznego"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                data-testid="input-search-email"
                required
              />
            </div>
            <Button
              type="submit"
              disabled={searchMutation.isPending}
              data-testid="button-search-client"
            >
              {searchMutation.isPending ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                  Wyszukiwanie...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Wyszukaj
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {searchError && (
        <Alert variant="destructive" data-testid="alert-search-error">
          <AlertDescription>{searchError}</AlertDescription>
        </Alert>
      )}

      {!foundClient && !searchError && !searchMutation.isPending && (
        <Card>
          <CardContent className="p-12 text-center space-y-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
              <User className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-xl mb-2" data-testid="text-empty-state">
                Wyszukaj podopiecznego po emailu
              </h3>
              <p className="text-muted-foreground">
                Wprowadź adres email podopiecznego w polu wyszukiwania powyżej
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {searchMutation.isPending && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Skeleton className="w-12 h-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      )}

      {foundClient && (
        <Card data-testid={`card-client-${foundClient.id}`}>
          <CardHeader>
            <div className="flex items-start gap-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src={foundClient.profileImageUrl || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary font-medium text-lg">
                  {getInitials(foundClient.firstName, foundClient.lastName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <CardTitle className="text-2xl" data-testid={`text-client-name-${foundClient.id}`}>
                  {foundClient.firstName} {foundClient.lastName}
                </CardTitle>
                <CardDescription className="text-base mt-1" data-testid={`text-client-email-${foundClient.id}`}>
                  {foundClient.email}
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div>
              <h3 className="font-heading font-semibold text-lg mb-3 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Przypisany plan
              </h3>
              {foundClient.assignment ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <Badge variant="secondary" className="text-base" data-testid={`badge-assigned-plan-${foundClient.id}`}>
                        {foundClient.assignment.plan.name}
                      </Badge>
                      <p className="text-sm text-muted-foreground mt-2" data-testid={`text-assignment-date-${foundClient.id}`}>
                        Przypisano {new Date(foundClient.assignment.assignedAt).toLocaleDateString("pl-PL")}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button asChild variant="outline" size="sm" data-testid={`button-view-plan-${foundClient.id}`}>
                        <Link href={`/plans/${foundClient.assignment.plan.id}/edit`}>
                          Zobacz szczegóły planu
                        </Link>
                      </Button>
                      <Button asChild size="sm" data-testid={`button-change-plan-${foundClient.id}`}>
                        <Link href="/plans">
                          Zmień plan
                        </Link>
                      </Button>
                    </div>
                  </div>
                  {foundClient.assignment.plan.description && (
                    <p className="text-sm text-muted-foreground" data-testid={`text-plan-description-${foundClient.id}`}>
                      {foundClient.assignment.plan.description}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <Badge variant="outline" data-testid={`badge-no-plan-${foundClient.id}`}>
                    Brak przypisanego planu
                  </Badge>
                  <div>
                    <Button asChild size="sm" data-testid={`button-assign-plan-${foundClient.id}`}>
                      <Link href="/plans">
                        Przypisz plan
                      </Link>
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            <div>
              <h3 className="font-heading font-semibold text-lg mb-3 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Postępy podopiecznego
              </h3>
              
              {isLoadingProgress ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              ) : clientProgress ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid={`section-progress-${foundClient.id}`}>
                  {clientProgress.weight && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Waga</p>
                      <p className="font-medium" data-testid={`text-weight-${foundClient.id}`}>
                        {clientProgress.weight}
                      </p>
                    </div>
                  )}
                  {clientProgress.height && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Wzrost</p>
                      <p className="font-medium" data-testid={`text-height-${foundClient.id}`}>
                        {clientProgress.height}
                      </p>
                    </div>
                  )}
                  {clientProgress.goal && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Target className="w-4 h-4" />
                        Cel treningowy
                      </p>
                      <p className="font-medium" data-testid={`text-goal-${foundClient.id}`}>
                        {clientProgress.goal}
                      </p>
                    </div>
                  )}
                  {clientProgress.mood && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Heart className="w-4 h-4" />
                        Samopoczucie
                      </p>
                      <p className="font-medium" data-testid={`text-mood-${foundClient.id}`}>
                        {clientProgress.mood}
                      </p>
                    </div>
                  )}
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      Ukończone treningi
                    </p>
                    <p className="font-medium text-primary text-xl" data-testid={`text-completed-workouts-${foundClient.id}`}>
                      {clientProgress.completedWorkouts || 0}
                    </p>
                  </div>
                  {clientProgress.notes && (
                    <div className="space-y-1 md:col-span-2">
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MessageSquare className="w-4 h-4" />
                        Notatki motywacyjne
                      </p>
                      <p className="font-medium" data-testid={`text-notes-${foundClient.id}`}>
                        {clientProgress.notes}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground" data-testid={`text-no-progress-${foundClient.id}`}>
                  Podopieczny nie uzupełnił jeszcze swoich postępów
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
