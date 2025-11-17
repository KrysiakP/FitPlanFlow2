import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
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
  Trash2,
  Plus,
  Download,
} from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { User as UserType, PlanAssignment, TrainingPlan, ClientProgress, WeeklyReport, UserProfile, MedicalTest } from "@shared/schema";

type ClientWithAssignment = UserType & {
  assignment?: PlanAssignment & { plan: TrainingPlan };
};

function ClientCard({ client }: { client: ClientWithAssignment }) {
  const [isOpen, setIsOpen] = useState(false);
  const [testType, setTestType] = useState<string>("krew");
  const [testDate, setTestDate] = useState<string>("");
  const [testNotes, setTestNotes] = useState<string>("");
  const [testFileUrl, setTestFileUrl] = useState<string>("");
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const { toast } = useToast();

  const { data: clientProgress, isLoading: isLoadingProgress } = useQuery<ClientProgress | null>({
    queryKey: [`/api/trainer/clients/${client.id}/progress`],
    enabled: isOpen && !!client.id,
  });

  const { data: reports, isLoading: isLoadingReports } = useQuery<WeeklyReport[]>({
    queryKey: [`/api/clients/${client.id}/reports`],
    enabled: isOpen && !!client.id,
  });

  const { data: clientProfile, isLoading: isLoadingProfile } = useQuery<UserProfile | null>({
    queryKey: [`/api/clients/${client.id}/profile`],
    enabled: isOpen && !!client.id,
  });

  const { data: medicalTests, isLoading: isLoadingMedicalTests } = useQuery<MedicalTest[]>({
    queryKey: ["/api/clients", client.id, "medical-tests"],
    enabled: isOpen && !!client.id,
  });

  const latestReport = reports && reports.length > 0 
    ? [...reports].sort((a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime())[0]
    : null;

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

  const createMedicalTestMutation = useMutation({
    mutationFn: async (data: { testType: string; testDate: string; notes: string; fileUrl: string }) => {
      return await apiRequest("POST", `/api/clients/${client.id}/medical-tests`, {
        testType: data.testType,
        testDate: new Date(data.testDate).toISOString(),
        notes: data.notes || null,
        fileUrl: data.fileUrl || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", client.id, "medical-tests"] });
      toast({
        title: "Badanie dodane",
        description: "Badanie medyczne zostało pomyślnie dodane",
      });
      setTestType("krew");
      setTestDate("");
      setTestNotes("");
      setTestFileUrl("");
    },
    onError: (error: any) => {
      toast({
        title: "Błąd",
        description: error.message || "Nie udało się dodać badania",
        variant: "destructive",
      });
    },
  });

  const deleteMedicalTestMutation = useMutation({
    mutationFn: async (testId: string) => {
      return await apiRequest("DELETE", `/api/medical-tests/${testId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", client.id, "medical-tests"] });
      toast({
        title: "Badanie usunięte",
        description: "Badanie medyczne zostało usunięte",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Błąd",
        description: error.message || "Nie udało się usunąć badania",
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
    <Card data-testid={`card-client-${client.id}`} className="hover-elevate">
      <CardHeader>
        <div className="flex items-start gap-4">
          <Avatar className="w-16 h-16">
            <AvatarImage src={client.profileImageDisplayUrl || client.profileImageUrl || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary font-medium text-lg">
              {getInitials(client.firstName, client.lastName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-2xl truncate" data-testid={`text-client-name-${client.id}`}>
              {client.firstName} {client.lastName}
            </CardTitle>
            <CardDescription className="text-base mt-1 truncate" data-testid={`text-client-email-${client.id}`}>
              {client.email}
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
                  <Button asChild size="sm" data-testid={`button-change-plan-${client.id}`}>
                    <Link href="/plans">
                      Zmień plan
                    </Link>
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
                <Button asChild size="sm" data-testid={`button-assign-plan-${client.id}`}>
                  <Link href="/plans">
                    Przypisz plan
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </div>

        <Separator />

        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              className="w-full justify-between p-0 h-auto hover:bg-transparent"
              data-testid={`button-toggle-progress-${client.id}`}
            >
              <h3 className="font-heading font-semibold text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Postępy podopiecznego
              </h3>
              <ChevronDown className={`w-5 h-5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
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
                            Zobacz wszystkie raporty ({reports?.length || 0})
                          </Link>
                        </Button>
                        <Button asChild size="sm" className="flex-1" data-testid={`button-view-progress-${client.id}`}>
                          <Link href={`/trainer/clients/${client.id}/progress`}>
                            <TrendingUp className="w-4 h-4 mr-2" />
                            Zobacz progres
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

        <div>
          <h3 className="font-heading font-semibold text-lg mb-3 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Badania medyczne
          </h3>

          {isLoadingMedicalTests ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 border rounded-lg space-y-4" data-testid={`form-add-medical-test-${client.id}`}>
                <h4 className="font-medium text-sm">Dodaj nowe badanie</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`test-type-${client.id}`}>Typ badania</Label>
                    <Select value={testType} onValueChange={setTestType}>
                      <SelectTrigger id={`test-type-${client.id}`} data-testid={`select-test-type-${client.id}`}>
                        <SelectValue placeholder="Wybierz typ badania" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="krew">Krew</SelectItem>
                        <SelectItem value="echo">Echo serca</SelectItem>
                        <SelectItem value="usg">USG</SelectItem>
                        <SelectItem value="inne">Inne</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`test-date-${client.id}`}>Data badania</Label>
                    <Input
                      id={`test-date-${client.id}`}
                      type="date"
                      value={testDate}
                      onChange={(e) => setTestDate(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      data-testid={`input-test-date-${client.id}`}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`test-notes-${client.id}`}>Notatki (opcjonalne)</Label>
                  <Textarea
                    id={`test-notes-${client.id}`}
                    value={testNotes}
                    onChange={(e) => setTestNotes(e.target.value)}
                    placeholder="Dodaj notatki dotyczące badania..."
                    data-testid={`textarea-test-notes-${client.id}`}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Plik z wynikami (opcjonalnie)</Label>
                  <ObjectUploader
                    maxNumberOfFiles={1}
                    maxFileSize={10485760}
                    onGetUploadParameters={async () => {
                      const response = await fetch("/api/objects/upload", {
                        method: "POST",
                        credentials: "include",
                      });
                      if (!response.ok) {
                        throw new Error("Nie udało się uzyskać URL uploadu");
                      }
                      const { url, method } = await response.json();
                      return { url, method };
                    }}
                    onComplete={(result) => {
                      const uploadedFile = result.successful?.[0];
                      if (uploadedFile && uploadedFile.uploadURL) {
                        const fileUrl = uploadedFile.uploadURL.split('?')[0];
                        setTestFileUrl(fileUrl);
                      }
                    }}
                    data-testid={`uploader-test-file-${client.id}`}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Prześlij plik
                  </ObjectUploader>
                  {testFileUrl && (
                    <p className="text-sm text-muted-foreground" data-testid={`text-file-uploaded-${client.id}`}>
                      Plik został przesłany
                    </p>
                  )}
                </div>

                <Button
                  onClick={() => createMedicalTestMutation.mutate({ testType, testDate, notes: testNotes, fileUrl: testFileUrl })}
                  disabled={!testDate || createMedicalTestMutation.isPending}
                  size="sm"
                  data-testid={`button-add-test-${client.id}`}
                >
                  {createMedicalTestMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Dodawanie...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Dodaj badanie
                    </>
                  )}
                </Button>
              </div>

              {medicalTests && medicalTests.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Istniejące badania ({medicalTests.length})</h4>
                  <div className="space-y-2">
                    {medicalTests.map((test) => (
                      <div
                        key={test.id}
                        className="p-3 border rounded-lg space-y-2"
                        data-testid={`card-medical-test-${test.id}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <Badge variant="outline" data-testid={`badge-test-type-${test.id}`}>
                                {test.testType === "krew" && "Krew"}
                                {test.testType === "echo" && "Echo serca"}
                                {test.testType === "usg" && "USG"}
                                {test.testType === "inne" && "Inne"}
                              </Badge>
                              <span className="text-sm text-muted-foreground" data-testid={`text-test-date-${test.id}`}>
                                {format(new Date(test.testDate), "d MMM yyyy", { locale: pl })}
                              </span>
                            </div>
                            {test.notes && (
                              <p className="text-sm" data-testid={`text-test-notes-${test.id}`}>
                                {test.notes}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {test.fileUrl && (
                              <Button
                                asChild
                                variant="outline"
                                size="sm"
                                data-testid={`button-download-test-${test.id}`}
                              >
                                <a href={test.fileUrl} target="_blank" rel="noopener noreferrer">
                                  <Download className="w-4 h-4" />
                                </a>
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteMedicalTestMutation.mutate(test.id)}
                              disabled={deleteMedicalTestMutation.isPending}
                              className="text-destructive hover:bg-destructive/10"
                              data-testid={`button-delete-test-${test.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <Separator />

        <div className="flex justify-end">
          <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
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
                  onClick={() => {
                    archiveClientMutation.mutate(client.id);
                    setShowArchiveDialog(false);
                  }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  data-testid="button-confirm-archive"
                >
                  Zakończ współpracę
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Clients() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: clients = [], isLoading, error } = useQuery<ClientWithAssignment[]>({
    queryKey: ["/api/trainer/clients"],
  });

  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return clients;
    
    const query = searchQuery.toLowerCase();
    return clients.filter((client) => {
      const fullName = `${client.firstName} ${client.lastName}`.toLowerCase();
      const email = client.email.toLowerCase();
      return fullName.includes(query) || email.includes(query);
    });
  }, [clients, searchQuery]);

  const clearSearch = () => setSearchQuery("");

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="font-heading font-bold text-4xl mb-2">
            Podopieczni
          </h1>
          <p className="text-muted-foreground">
            Zarządzaj swoimi podopiecznymi i śledź ich postępy
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <Skeleton className="w-16 h-16 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-64" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="font-heading font-bold text-4xl mb-2">
            Podopieczni
          </h1>
        </div>
        <Alert variant="destructive">
          <AlertDescription>
            Wystąpił błąd podczas ładowania listy podopiecznych. Spróbuj odświeżyć stronę.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading font-bold text-4xl mb-2" data-testid="text-clients-title">
          Podopieczni
        </h1>
        <p className="text-muted-foreground" data-testid="text-clients-description">
          Zarządzaj swoimi podopiecznymi i śledź ich postępy
        </p>
      </div>

      {clients.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Wyszukaj po imieniu lub emailu..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-filter-clients"
                />
              </div>
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearSearch}
                  data-testid="button-clear-filter"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {clients.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center space-y-6">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto">
              <User className="w-10 h-10 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-2xl mb-2" data-testid="text-empty-state">
                Nie masz jeszcze podopiecznych
              </h3>
              <p className="text-muted-foreground mb-6">
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
      ) : filteredClients.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center space-y-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-xl mb-2" data-testid="text-no-results">
                Brak wyników
              </h3>
              <p className="text-muted-foreground mb-4">
                Nie znaleziono podopiecznych pasujących do "{searchQuery}"
              </p>
              <Button variant="outline" onClick={clearSearch} data-testid="button-clear-search">
                Wyczyść wyszukiwanie
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              Wyświetlanie {filteredClients.length} {filteredClients.length === 1 ? 'podopiecznego' : 'podopiecznych'}
              {searchQuery && ` z ${clients.length}`}
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredClients.map((client) => (
              <ClientCard key={client.id} client={client} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
