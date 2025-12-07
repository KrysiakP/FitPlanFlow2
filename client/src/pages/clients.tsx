import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Search, 
  User, 
  Calendar, 
  TrendingUp, 
  Target, 
  Heart, 
  CheckCircle2, 
  MessageSquare,
  ChevronDown,
  UserPlus,
  X,
  FileText,
  Pill,
  Activity,
  Download,
  Users,
  Dumbbell,
  Check,
  Plus,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import type { User as UserType, PlanAssignment, TrainingPlan, ClientProgress, WeeklyReport, UserProfile, MedicalTest } from "@shared/schema";

type ClientWithAssignment = UserType & {
  assignment?: PlanAssignment & { plan: TrainingPlan };
};

type PlanWithDetails = TrainingPlan & {
  workouts: { id: string; name: string; exercises: { id: string }[] }[];
  assignmentCount: number;
};

function ClientDetails({ client }: { client: ClientWithAssignment }) {
  const [isProgressOpen, setIsProgressOpen] = useState(true);
  const [isMedicalOpen, setIsMedicalOpen] = useState(false);
  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: clientProgress, isLoading: isLoadingProgress } = useQuery<ClientProgress | null>({
    queryKey: [`/api/trainer/clients/${client.id}/progress`],
    enabled: !!client.id,
  });

  const { data: reports, isLoading: isLoadingReports } = useQuery<WeeklyReport[]>({
    queryKey: [`/api/clients/${client.id}/reports`],
    enabled: !!client.id,
  });

  const { data: clientProfile, isLoading: isLoadingProfile } = useQuery<UserProfile | null>({
    queryKey: [`/api/clients/${client.id}/profile`],
    enabled: !!client.id,
  });

  const { data: medicalTests, isLoading: isLoadingMedicalTests } = useQuery<MedicalTest[]>({
    queryKey: ["/api/clients", client.id, "medical-tests"],
    enabled: !!client.id,
  });

  const { data: availablePlans = [], isLoading: isLoadingPlans } = useQuery<PlanWithDetails[]>({
    queryKey: ["/api/plans"],
    enabled: isPlanDialogOpen,
  });

  const latestReport = reports && reports.length > 0 
    ? [...reports].sort((a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime())[0]
    : null;

  const assignPlanMutation = useMutation({
    mutationFn: async (planId: string) => {
      return await apiRequest("POST", "/api/assignments/bulk", {
        planId,
        clientIds: [client.id],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/plans"] });
      setIsPlanDialogOpen(false);
      toast({
        title: "Plan przypisany",
        description: `Plan został przypisany do ${client.firstName} ${client.lastName}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Błąd",
        description: error.message || "Nie udało się przypisać planu",
        variant: "destructive",
      });
    },
  });

  const unassignPlanMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", `/api/assignments/client/${client.id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/plans"] });
      toast({
        title: "Plan usunięty",
        description: `Usunięto przypisanie planu od ${client.firstName} ${client.lastName}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Błąd",
        description: error.message || "Nie udało się usunąć przypisania",
        variant: "destructive",
      });
    },
  });

  const archiveClientMutation = useMutation({
    mutationFn: async (clientId: string) => {
      return await apiRequest("POST", `/api/clients/${clientId}/archive`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/stats"] });
      toast({
        title: "Współpraca zakończona",
        description: `Relacja z ${client.firstName} ${client.lastName} została zarchiwizowana`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Błąd",
        description: error.message || "Nie udało się zakończyć współpracy",
        variant: "destructive",
      });
    },
  });

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const first = firstName?.charAt(0) || "";
    const last = lastName?.charAt(0) || "";
    return (first + last).toUpperCase() || "?";
  };

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6" data-testid={`details-client-${client.id}`}>
      <div className="flex items-start gap-3 md:gap-4">
        <Avatar className="w-12 h-12 md:w-16 md:h-16">
          <AvatarImage src={client.profileImageDisplayUrl || client.profileImageUrl || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary font-medium text-base md:text-lg">
            {getInitials(client.firstName, client.lastName)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h2 className="font-heading font-bold text-xl md:text-2xl truncate" data-testid={`text-client-name-${client.id}`}>
            {client.firstName} {client.lastName}
          </h2>
          <p className="text-muted-foreground text-sm md:text-base mt-1 truncate" data-testid={`text-client-email-${client.id}`}>
            {client.email}
          </p>
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="font-heading font-semibold text-base md:text-lg mb-2 md:mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4 md:w-5 md:h-5" />
          Przypisany plan
        </h3>
        {client.assignment ? (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <Badge variant="secondary" className="text-base mb-2" data-testid={`badge-assigned-plan-${client.id}`}>
                  {client.assignment.plan.name}
                </Badge>
                <p className="text-sm text-muted-foreground" data-testid={`text-assignment-date-${client.id}`}>
                  Przypisano {new Date(client.assignment.assignedAt).toLocaleDateString("pl-PL")}
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button asChild variant="outline" size="sm" data-testid={`button-view-plan-${client.id}`}>
                  <Link href={`/plans/${client.assignment.plan.id}/edit`}>
                    Zobacz plan
                  </Link>
                </Button>
                <Button 
                  size="sm" 
                  onClick={() => setIsPlanDialogOpen(true)}
                  data-testid={`button-change-plan-${client.id}`}
                >
                  Zmień plan
                </Button>
                <Button 
                  variant="outline"
                  size="sm" 
                  onClick={() => unassignPlanMutation.mutate()}
                  disabled={unassignPlanMutation.isPending}
                  className="text-destructive hover:bg-destructive/10"
                  data-testid={`button-unassign-plan-${client.id}`}
                >
                  {unassignPlanMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-destructive border-t-transparent rounded-full animate-spin mr-1" />
                      Usuwanie...
                    </>
                  ) : (
                    <>
                      <X className="w-4 h-4 mr-1" />
                      Usuń plan
                    </>
                  )}
                </Button>
              </div>
            </div>
            {client.assignment.plan.description && (
              <p className="text-sm text-muted-foreground" data-testid={`text-plan-description-${client.id}`}>
                {client.assignment.plan.description}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <Badge variant="outline" data-testid={`badge-no-plan-${client.id}`}>
              Brak przypisanego planu
            </Badge>
            <div>
              <Button 
                size="sm" 
                onClick={() => setIsPlanDialogOpen(true)}
                data-testid={`button-assign-plan-${client.id}`}
              >
                Przypisz plan
              </Button>
            </div>
          </div>
        )}
      </div>

      <Separator />

      <Collapsible open={isProgressOpen} onOpenChange={setIsProgressOpen}>
        <CollapsibleTrigger asChild>
          <Button 
            variant="ghost" 
            className="w-full justify-between p-0 h-auto hover:bg-transparent"
            data-testid={`button-toggle-progress-${client.id}`}
          >
            <h3 className="font-heading font-semibold text-base md:text-lg flex items-center gap-2">
              <TrendingUp className="w-4 h-4 md:w-5 md:h-5" />
              Postępy podopiecznego
            </h3>
            <ChevronDown className={`w-5 h-5 transition-transform ${isProgressOpen ? "rotate-180" : ""}`} />
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="mt-3">
          {isLoadingProgress || isLoadingReports || isLoadingProfile ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          ) : clientProgress || latestReport || clientProfile?.pharmacologicalSupport || clientProfile?.injuries || clientProfile?.healthIssues ? (
            <div className="space-y-6">
              {clientProgress && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid={`section-progress-${client.id}`}>
                  {clientProgress.weight && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Waga</p>
                      <p className="font-medium" data-testid={`text-weight-${client.id}`}>
                        {clientProgress.weight}
                      </p>
                    </div>
                  )}
                  {clientProgress.height && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Wzrost</p>
                      <p className="font-medium" data-testid={`text-height-${client.id}`}>
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
                      <p className="font-medium" data-testid={`text-goal-${client.id}`}>
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
                      <p className="font-medium" data-testid={`text-mood-${client.id}`}>
                        {clientProgress.mood}
                      </p>
                    </div>
                  )}
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      Ukończone treningi
                    </p>
                    <p className="font-medium text-primary text-xl" data-testid={`text-completed-workouts-${client.id}`}>
                      {clientProgress.completedWorkouts || 0}
                    </p>
                  </div>
                  {clientProgress.notes && (
                    <div className="space-y-1 md:col-span-2">
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MessageSquare className="w-4 h-4" />
                        Notatki motywacyjne
                      </p>
                      <p className="font-medium" data-testid={`text-notes-${client.id}`}>
                        {clientProgress.notes}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {clientProfile?.pharmacologicalSupport && (
                <>
                  {clientProgress && <Separator />}
                  <div className="space-y-3" data-testid={`section-pharmacological-${client.id}`}>
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <Pill className="w-4 h-4" />
                      Wsparcie farmakologiczne/Suplementacja
                    </h4>
                    <p className="text-sm whitespace-pre-wrap" data-testid={`text-pharmacological-support-${client.id}`}>
                      {clientProfile.pharmacologicalSupport}
                    </p>
                  </div>
                </>
              )}

              {(clientProfile?.injuries || clientProfile?.healthIssues) && (
                <>
                  {(clientProgress || clientProfile?.pharmacologicalSupport) && <Separator />}
                  <div className="space-y-4" data-testid={`section-medical-profile-${client.id}`}>
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <Heart className="w-4 h-4" />
                      Profil medyczny
                    </h4>
                    
                    {clientProfile.injuries && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Kontuzje i urazy</p>
                        <p className="text-sm whitespace-pre-wrap" data-testid={`text-injuries-${client.id}`}>
                          {clientProfile.injuries}
                        </p>
                      </div>
                    )}
                    
                    {clientProfile.healthIssues && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Problemy zdrowotne</p>
                        <p className="text-sm whitespace-pre-wrap" data-testid={`text-health-issues-${client.id}`}>
                          {clientProfile.healthIssues}
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {latestReport && (
                <>
                  {(clientProgress || clientProfile?.pharmacologicalSupport || clientProfile?.injuries || clientProfile?.healthIssues) && <Separator />}
                  <div className="space-y-3" data-testid={`section-latest-report-${client.id}`}>
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <h4 className="text-sm font-medium flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Ostatni raport tygodniowy
                      </h4>
                      <Badge variant="secondary">
                        {format(new Date(latestReport.reportDate), "d MMMM yyyy", { locale: pl })}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      {latestReport.weight && (
                        <div>
                          <span className="text-muted-foreground">Waga: </span>
                          <span className="font-medium">{latestReport.weight}</span>
                        </div>
                      )}
                      {latestReport.mood && (
                        <div>
                          <span className="text-muted-foreground">Samopoczucie: </span>
                          <span className="font-medium">{latestReport.mood}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <Button asChild variant="outline" size="sm" className="flex-1" data-testid={`button-view-all-reports-${client.id}`}>
                        <Link href="/trainer/reports">
                          <FileText className="w-4 h-4 mr-2" />
                          Raporty ({reports?.length || 0})
                        </Link>
                      </Button>
                      <Button asChild variant="outline" size="sm" className="flex-1" data-testid={`button-view-profile-${client.id}`}>
                        <Link href={`/profile/${client.id}`}>
                          <User className="w-4 h-4 mr-2" />
                          Profil
                        </Link>
                      </Button>
                      <Button asChild size="sm" className="flex-1" data-testid={`button-view-progress-${client.id}`}>
                        <Link href={`/trainer/clients/${client.id}/progress`}>
                          <TrendingUp className="w-4 h-4 mr-2" />
                          Progres
                        </Link>
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {(clientProgress || latestReport) && (
                <>
                  <Separator />
                  <Button asChild variant="default" size="sm" className="w-full" data-testid={`button-view-full-progress-${client.id}`}>
                    <Link href={`/trainer/clients/${client.id}/progress`}>
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Zobacz pełny progres
                    </Link>
                  </Button>
                </>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground" data-testid={`text-no-progress-${client.id}`}>
              Podopieczny nie uzupełnił jeszcze swoich postępów
            </p>
          )}
        </CollapsibleContent>
      </Collapsible>

      <Separator />

      <Collapsible open={isMedicalOpen} onOpenChange={setIsMedicalOpen}>
        <CollapsibleTrigger asChild>
          <Button 
            variant="ghost" 
            className="w-full justify-between p-0 h-auto hover:bg-transparent"
            data-testid={`button-toggle-medical-${client.id}`}
          >
            <h3 className="font-heading font-semibold text-base md:text-lg flex items-center gap-2">
              <Activity className="w-4 h-4 md:w-5 md:h-5" />
              Badania medyczne
              {medicalTests && medicalTests.length > 0 && (
                <Badge variant="secondary" className="ml-2">{medicalTests.length}</Badge>
              )}
            </h3>
            <ChevronDown className={`w-5 h-5 transition-transform ${isMedicalOpen ? "rotate-180" : ""}`} />
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-3">
          {isLoadingMedicalTests ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : !medicalTests || medicalTests.length === 0 ? (
            <p className="text-muted-foreground text-sm" data-testid={`text-no-tests-${client.id}`}>
              Podopieczny nie dodał jeszcze żadnych badań medycznych.
            </p>
          ) : (
            <div className="space-y-3">
              {medicalTests.map((test) => (
                <Card
                  key={test.id}
                  className="hover-elevate"
                  data-testid={`card-medical-test-${test.id}`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Badge 
                            variant={
                              test.testType === "blood" ? "default" :
                              test.testType === "hormone" ? "secondary" : 
                              "outline"
                            }
                            data-testid={`badge-test-type-${test.id}`}
                          >
                            {test.testType === "blood" && "Badanie krwi"}
                            {test.testType === "hormone" && "Badanie hormonalne"}
                            {test.testType === "cardio" && "Badanie kardiologiczne"}
                            {test.testType === "other" && "Inne"}
                            {!test.testType && "Nie określono"}
                          </Badge>
                        </div>
                        <CardTitle className="text-base mb-1" data-testid={`text-test-name-${test.id}`}>
                          {test.testName}
                        </CardTitle>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          <span data-testid={`text-test-date-${test.id}`}>
                            {format(new Date(test.testDate), "d MMMM yyyy", { locale: pl })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-2">
                    {test.resultValue && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Wynik:</p>
                        <p className="text-base" data-testid={`text-result-${test.id}`}>
                          {test.resultValue} {test.unit || ""}
                        </p>
                      </div>
                    )}
                    {test.referenceRange && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Zakres referencyjny:</p>
                        <p className="text-base" data-testid={`text-range-${test.id}`}>
                          {test.referenceRange}
                        </p>
                      </div>
                    )}
                    {test.orderingProvider && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Lekarz zlecający:</p>
                        <p className="text-base" data-testid={`text-provider-${test.id}`}>
                          {test.orderingProvider}
                        </p>
                      </div>
                    )}
                    {test.notes && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Notatki:</p>
                        <p className="text-base" data-testid={`text-notes-${test.id}`}>
                          {test.notes}
                        </p>
                      </div>
                    )}
                    {test.attachments && Array.isArray(test.attachments) && test.attachments.length > 0 ? (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">Załączniki:</p>
                        <div className="flex flex-wrap gap-2">
                          {(test.attachments as Array<{ id: string; name: string; url: string; size: number; uploadedAt: Date }>).map((attachment, idx) => (
                            <Button
                              key={idx}
                              asChild
                              variant="outline"
                              size="sm"
                              data-testid={`button-download-attachment-${test.id}-${idx}`}
                            >
                              <a href={attachment.url} target="_blank" rel="noopener noreferrer">
                                <Download className="w-4 h-4 mr-2" />
                                {attachment.name}
                              </a>
                            </Button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      <Separator />

      <div className="flex justify-end">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              variant="outline" 
              size="sm"
              className="gap-2 text-destructive hover:bg-destructive/10"
              disabled={archiveClientMutation.isPending}
              data-testid={`button-archive-${client.id}`}
            >
              {archiveClientMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-destructive border-t-transparent rounded-full animate-spin" />
                  Kończenie...
                </>
              ) : (
                <>
                  <X className="w-4 h-4" />
                  Zakończ współpracę
                </>
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Czy na pewno chcesz zakończyć współpracę?</AlertDialogTitle>
              <AlertDialogDescription>
                Ta akcja zarchiwizuje relację z {client.firstName} {client.lastName}. 
                Będziesz mógł nadal przeglądać historię współpracy, ale nie będziesz mógł dodawać nowych planów treningowych ani dietetycznych.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-archive">Anuluj</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => archiveClientMutation.mutate(client.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                data-testid="button-confirm-archive"
              >
                Zakończ współpracę
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <Dialog open={isPlanDialogOpen} onOpenChange={setIsPlanDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Wybierz plan treningowy</DialogTitle>
            <DialogDescription>
              Wybierz plan, który chcesz przypisać do {client.firstName} {client.lastName}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 -mx-6 px-6">
            {isLoadingPlans ? (
              <div className="space-y-3 py-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : availablePlans.length === 0 ? (
              <div className="py-8 text-center">
                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                  <Dumbbell className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground mb-4">
                  Nie masz jeszcze żadnych planów treningowych
                </p>
                <Button asChild size="sm">
                  <Link href="/plans/new">Utwórz pierwszy plan</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-2 py-4">
                {availablePlans.map((plan) => {
                  const totalExercises = plan.workouts.reduce(
                    (sum, w) => sum + w.exercises.length,
                    0
                  );
                  const isCurrentPlan = client.assignment?.planId === plan.id;
                  
                  return (
                    <button
                      type="button"
                      key={plan.id}
                      onClick={() => {
                        if (!isCurrentPlan) {
                          assignPlanMutation.mutate(plan.id);
                        }
                      }}
                      disabled={assignPlanMutation.isPending || isCurrentPlan}
                      className={`w-full text-left p-4 rounded-md border transition-colors ${
                        isCurrentPlan 
                          ? "bg-primary/5 border-primary cursor-default" 
                          : "hover-elevate cursor-pointer"
                      } ${assignPlanMutation.isPending ? "opacity-50" : ""}`}
                      data-testid={`plan-option-${plan.id}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">{plan.name}</p>
                            {isCurrentPlan && (
                              <Badge variant="default" className="shrink-0">
                                <Check className="w-3 h-3 mr-1" />
                                Aktualny
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {plan.workouts.length} {plan.workouts.length === 1 ? "trening" : "treningów"} • {totalExercises} {totalExercises === 1 ? "ćwiczenie" : "ćwiczeń"}
                          </p>
                          {plan.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {plan.description}
                            </p>
                          )}
                        </div>
                        {!isCurrentPlan && (
                          <Dumbbell className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                        )}
                      </div>
                    </button>
                  );
                })}
                
                <Button 
                  asChild 
                  variant="outline" 
                  className="w-full mt-4 gap-2"
                  data-testid="button-create-new-plan"
                >
                  <Link href={`/plans/new?assignTo=${client.id}`}>
                    <Plus className="w-4 h-4" />
                    Utwórz nowy plan
                  </Link>
                </Button>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ClientListItem({ 
  client, 
  isSelected, 
  onClick,
}: { 
  client: ClientWithAssignment; 
  isSelected: boolean;
  onClick: () => void;
}) {
  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const first = firstName?.charAt(0) || "";
    const last = lastName?.charAt(0) || "";
    return (first + last).toUpperCase() || "?";
  };

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-md text-left transition-colors hover-elevate ${
        isSelected ? "bg-accent" : ""
      }`}
      data-testid={`list-item-client-${client.id}`}
    >
      <Avatar className="w-10 h-10 shrink-0">
        <AvatarImage src={client.profileImageDisplayUrl || client.profileImageUrl || undefined} />
        <AvatarFallback className="bg-primary/10 text-primary font-medium text-sm">
          {getInitials(client.firstName, client.lastName)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate text-sm">
          {client.firstName} {client.lastName}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {client.email}
        </p>
      </div>
      <Badge 
        variant={client.assignment ? "default" : "outline"} 
        className="shrink-0 text-xs"
      >
        {client.assignment ? "Ma plan" : "Bez planu"}
      </Badge>
    </button>
  );
}

function EmptyDetailsState() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-4 md:p-8 text-center">
      <div className="w-12 h-12 md:w-16 md:h-16 bg-muted rounded-full flex items-center justify-center mb-3 md:mb-4">
        <Users className="w-6 h-6 md:w-8 md:h-8 text-muted-foreground" />
      </div>
      <h3 className="font-heading font-semibold text-lg md:text-xl mb-2" data-testid="text-empty-details">
        Wybierz podopiecznego
      </h3>
      <p className="text-muted-foreground text-xs md:text-sm max-w-xs">
        Wybierz podopiecznego z listy po lewej stronie, aby zobaczyć szczegóły
      </p>
    </div>
  );
}

export default function Clients() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "with_plan" | "without_plan">("all");
  const [sortBy, setSortBy] = useState<"name" | "newest" | "oldest">("name");
  const [, navigate] = useLocation();

  const { data: clients = [], isLoading, error } = useQuery<ClientWithAssignment[]>({
    queryKey: ["/api/trainer/clients"],
  });

  const processedClients = useMemo(() => {
    let result = [...clients];
    
    if (filter === "with_plan") {
      result = result.filter(c => c.assignment);
    } else if (filter === "without_plan") {
      result = result.filter(c => !c.assignment);
    }
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c => 
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
      );
    }
    
    result.sort((a, b) => {
      if (sortBy === "name") {
        return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, "pl");
      } else if (sortBy === "newest") {
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      } else {
        return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      }
    });
    
    return result;
  }, [clients, filter, searchQuery, sortBy]);

  const selectedClient = useMemo(() => {
    if (!selectedClientId) return null;
    return processedClients.find(c => c.id === selectedClientId) || null;
  }, [processedClients, selectedClientId]);

  useEffect(() => {
    if (selectedClientId && processedClients.length > 0) {
      const stillInList = processedClients.some(c => c.id === selectedClientId);
      if (!stillInList) {
        setSelectedClientId(null);
      }
    }
  }, [processedClients, selectedClientId]);

  const clientsWithPlan = clients.filter(c => c.assignment).length;

  const clearSearch = () => setSearchQuery("");

  const handleClientClick = (client: ClientWithAssignment) => {
    const isDesktop = typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;
    if (isDesktop) {
      setSelectedClientId(client.id);
    } else {
      navigate(`/profile/${client.id}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)]">
        <div className="w-full lg:w-[400px] shrink-0 flex flex-col border-r p-4 space-y-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <div className="space-y-2 flex-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </div>
        <div className="flex-1 hidden lg:flex items-center justify-center">
          <Skeleton className="h-96 w-full max-w-lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-8">
        <Alert variant="destructive">
          <AlertDescription>
            Wystąpił błąd podczas ładowania listy podopiecznych. Spróbuj odświeżyć stronę.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)] p-4 md:p-8">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 md:p-12 text-center space-y-4 md:space-y-6">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-muted rounded-full flex items-center justify-center mx-auto">
              <User className="w-8 h-8 md:w-10 md:h-10 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-xl md:text-2xl mb-2" data-testid="text-empty-state">
                Nie masz jeszcze podopiecznych
              </h3>
              <p className="text-muted-foreground text-sm md:text-base mb-4 md:mb-6">
                Rozpocznij wysyłanie zaproszeń do planów treningowych, aby zacząć pracować z podopiecznymi
              </p>
              <Button asChild data-testid="button-invite-client">
                <Link href="/invite">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Zaproś podopiecznego
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <div className="w-full lg:w-[400px] shrink-0 flex flex-col border-r overflow-hidden">
        <div className="p-4 space-y-4 border-b">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-heading font-bold text-lg" data-testid="text-clients-count">
              {clients.length} {clients.length === 1 ? "podopieczny" : "podopiecznych"} 
              <span className="text-muted-foreground font-normal text-sm ml-1">
                ({clientsWithPlan} z planem)
              </span>
            </h2>
            <Button asChild size="icon" variant="ghost" data-testid="button-invite-client-header">
              <Link href="/invite">
                <UserPlus className="w-4 h-4" />
              </Link>
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Szukaj..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8"
              data-testid="input-search-clients"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                data-testid="button-clear-search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <TabsList className="w-full">
              <TabsTrigger value="all" className="flex-1" data-testid="tab-filter-all">
                Wszyscy
              </TabsTrigger>
              <TabsTrigger value="with_plan" className="flex-1" data-testid="tab-filter-with-plan">
                Z planem
              </TabsTrigger>
              <TabsTrigger value="without_plan" className="flex-1" data-testid="tab-filter-without-plan">
                Bez planu
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger data-testid="select-sort">
              <SelectValue placeholder="Sortuj..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name" data-testid="sort-name">Alfabetycznie A-Z</SelectItem>
              <SelectItem value="newest" data-testid="sort-newest">Najnowsi pierwsi</SelectItem>
              <SelectItem value="oldest" data-testid="sort-oldest">Najstarsi pierwsi</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {processedClients.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-muted-foreground text-sm" data-testid="text-no-results">
                  Brak wyników dla "{searchQuery}"
                </p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearSearch}
                  className="mt-2"
                  data-testid="button-clear-filter"
                >
                  Wyczyść wyszukiwanie
                </Button>
              </div>
            ) : (
              processedClients.map((client) => (
                <ClientListItem
                  key={client.id}
                  client={client}
                  isSelected={selectedClientId === client.id}
                  onClick={() => handleClientClick(client)}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="hidden lg:flex flex-1 overflow-auto bg-card rounded-lg border">
        {selectedClient ? (
          <ScrollArea className="w-full">
            <ClientDetails client={selectedClient} />
          </ScrollArea>
        ) : (
          <EmptyDetailsState />
        )}
      </div>
    </div>
  );
}
