import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ClipboardList, Calendar, AlertCircle, Bell, Mail, UserCheck, X, User as UserIcon } from "lucide-react";
import { Link } from "wouter";
import { startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { PlanAssignment, TrainingPlan, Workout, Exercise, WeeklyReport, PlanInvitation, User, ClientRelationship } from "@shared/schema";

type AssignmentWithPlan = PlanAssignment & {
  plan: TrainingPlan & { 
    workouts: (Workout & { exercises: Exercise[] })[];
  };
};

type InvitationWithDetails = PlanInvitation & {
  plan: TrainingPlan;
  trainer: User;
};

export default function ClientDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: assignment } = useQuery<AssignmentWithPlan>({
    queryKey: ["/api/client/assignment"],
  });

  const { data: reports } = useQuery<WeeklyReport[]>({
    queryKey: ["/api/reports"],
  });

  const { data: invitations } = useQuery<InvitationWithDetails[]>({
    queryKey: ["/api/invitations"],
  });

  const { data: relationship } = useQuery<ClientRelationship & { trainer: User }>({
    queryKey: ["/api/client/relationship"],
  });

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const first = firstName?.charAt(0) || "";
    const last = lastName?.charAt(0) || "";
    return (first + last).toUpperCase() || "?";
  };

  const acceptMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      return await apiRequest("POST", `/api/invitations/${invitationId}/accept`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invitations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/client/assignment"] });
      toast({
        title: "Zaproszenie zaakceptowane",
        description: "Plan treningowy został przypisany do Twojego konta",
      });
    },
    onError: () => {
      toast({
        title: "Błąd",
        description: "Nie udało się zaakceptować zaproszenia",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      return await apiRequest("POST", `/api/invitations/${invitationId}/reject`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invitations"] });
      toast({
        title: "Zaproszenie odrzucone",
        description: "Zaproszenie zostało odrzucone",
      });
    },
    onError: () => {
      toast({
        title: "Błąd",
        description: "Nie udało się odrzucić zaproszenia",
        variant: "destructive",
      });
    },
  });

  const getTotalExercises = () => {
    if (!assignment?.plan.workouts) return 0;
    return assignment.plan.workouts.reduce((total, workout) => {
      return total + (workout.exercises?.length || 0);
    }, 0);
  };

  const hasReportThisWeek = () => {
    if (!reports || reports.length === 0) return false;

    const sortedReports = [...reports].sort(
      (a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime()
    );

    const latestReport = sortedReports[0];
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    return isWithinInterval(new Date(latestReport.reportDate), {
      start: weekStart,
      end: weekEnd,
    });
  };

  const showWeeklyReportReminder = !hasReportThisWeek();

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

      {showWeeklyReportReminder && (
        <Alert data-testid="alert-weekly-report-reminder">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <span>
              Nie wypełniłeś jeszcze raportu w tym tygodniu. Wypełnij raport tygodniowy, aby śledzić swoje postępy.
            </span>
            <Link href="/weekly-report">
              <Button variant="default" size="sm" data-testid="button-fill-report">
                Wypełnij raport
              </Button>
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {invitations && invitations.length > 0 && (
        <Card className="border-primary/50 bg-primary/5" data-testid="card-invitations">
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              <div className="relative">
                <Mail className="w-5 h-5 text-primary" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground rounded-full text-xs flex items-center justify-center">
                  {invitations.length}
                </span>
              </div>
              Nowe zaproszenia
            </CardTitle>
            <CardDescription>
              Masz {invitations.length} {invitations.length === 1 ? "nowe zaproszenie" : "nowe zaproszenia"} do planu treningowego
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {invitations.map((invitation) => (
                <div 
                  key={invitation.id} 
                  className="border rounded-lg p-6 bg-background hover-elevate"
                  data-testid={`invitation-card-${invitation.id}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <UserCheck className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="font-heading font-semibold text-lg" data-testid={`text-plan-name-${invitation.id}`}>
                            {invitation.plan ? invitation.plan.name : "Współpraca treningowa"}
                          </p>
                          <p className="text-sm text-muted-foreground" data-testid={`text-trainer-name-${invitation.id}`}>
                            Od: {invitation.trainer.firstName} {invitation.trainer.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Wysłano: {new Date(invitation.createdAt).toLocaleDateString('pl-PL', { 
                              day: 'numeric', 
                              month: 'long', 
                              year: 'numeric' 
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-13">
                        <Button 
                          size="sm" 
                          onClick={() => acceptMutation.mutate(invitation.id)} 
                          disabled={acceptMutation.isPending || rejectMutation.isPending}
                          className="gap-2"
                          data-testid={`button-accept-${invitation.id}`}
                        >
                          {acceptMutation.isPending ? (
                            <>
                              <div className="w-3 h-3 border-2 border-background border-t-transparent rounded-full animate-spin" />
                              Akceptowanie...
                            </>
                          ) : (
                            <>
                              <UserCheck className="w-4 h-4" />
                              Akceptuj
                            </>
                          )}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => rejectMutation.mutate(invitation.id)} 
                          disabled={acceptMutation.isPending || rejectMutation.isPending}
                          className="gap-2"
                          data-testid={`button-reject-${invitation.id}`}
                        >
                          {rejectMutation.isPending ? (
                            <>
                              <div className="w-3 h-3 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
                              Odrzucanie...
                            </>
                          ) : (
                            <>
                              <X className="w-4 h-4" />
                              Odrzuć
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {relationship && relationship.trainer && relationship.status === "active" && (
        <Card data-testid="card-trainer-info" className="hover-elevate">
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              <UserIcon className="w-5 h-5" />
              Twój trener
            </CardTitle>
            <CardDescription>
              Sprawdź profil swojego trenera i skontaktuj się z nim
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <Avatar className="w-14 h-14">
                  <AvatarImage 
                    src={relationship.trainer.profileImageDisplayUrl || relationship.trainer.profileImageUrl || undefined} 
                    alt={`${relationship.trainer.firstName} ${relationship.trainer.lastName}`}
                  />
                  <AvatarFallback className="bg-primary/10 text-primary font-medium text-lg">
                    {getInitials(relationship.trainer.firstName, relationship.trainer.lastName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-heading font-semibold text-lg" data-testid="text-trainer-name">
                    {relationship.trainer.firstName} {relationship.trainer.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground" data-testid="text-trainer-email">
                    {relationship.trainer.email}
                  </p>
                </div>
              </div>
              <Button asChild variant="outline" size="sm" data-testid="button-view-trainer-profile">
                <Link href={`/profile/${relationship.trainerId}`}>
                  <UserIcon className="w-4 h-4 mr-2" />
                  Zobacz profil
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
