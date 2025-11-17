import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { FileText, User, Calendar, Weight, Ruler, Activity, Heart, Pill, MessageSquare, Image as ImageIcon } from "lucide-react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import type { User as UserType, WeeklyReport } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

type ClientWithReports = UserType & {
  assignment?: any;
};

export default function TrainerReports() {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const { data: clients, isLoading: isLoadingClients } = useQuery<ClientWithReports[]>({
    queryKey: ["/api/trainer/clients"],
  });

  const { data: reports, isLoading: isLoadingReports } = useQuery<WeeklyReport[]>({
    queryKey: [`/api/clients/${selectedClientId}/reports`],
    enabled: !!selectedClientId,
  });

  useEffect(() => {
    if (reports && reports.length > 0) {
      const markReportsAsViewed = async () => {
        const unviewedReports = reports.filter(report => !report.viewedByTrainer);
        
        if (unviewedReports.length === 0) {
          return;
        }

        try {
          await Promise.all(
            unviewedReports.map(report =>
              apiRequest("POST", `/api/reports/${report.id}/mark-as-viewed`)
            )
          );
          
          queryClient.invalidateQueries({ queryKey: ["/api/trainer/unread-reports-count"] });
          queryClient.invalidateQueries({ queryKey: [`/api/clients/${selectedClientId}/reports`] });
        } catch (error) {
          console.error("Error marking reports as viewed:", error);
        }
      };

      markReportsAsViewed();
    }
  }, [reports, selectedClientId]);

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const first = firstName?.charAt(0) || "";
    const last = lastName?.charAt(0) || "";
    return (first + last).toUpperCase() || "?";
  };

  const selectedClient = clients?.find(c => c.id === selectedClientId);

  const sortedReports = reports
    ? [...reports].sort((a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime())
    : [];

  const clientsWithReportCounts = clients?.map(client => ({
    ...client,
    reportCount: 0,
  })) || [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading font-bold text-4xl mb-2" data-testid="text-reports-title">
          Raporty Tygodniowe
        </h1>
        <p className="text-muted-foreground" data-testid="text-reports-description">
          Przeglądaj cotygodniowe raporty postępów swoich podopiecznych
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Wybierz podopiecznego
              </label>
              {isLoadingClients ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select
                  value={selectedClientId || undefined}
                  onValueChange={setSelectedClientId}
                  data-testid="select-client"
                >
                  <SelectTrigger data-testid="button-select-client">
                    <SelectValue placeholder="Wybierz podopiecznego..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clientsWithReportCounts.map((client) => (
                      <SelectItem
                        key={client.id}
                        value={client.id}
                        data-testid={`option-client-${client.id}`}
                      >
                        <div className="flex items-center gap-2">
                          <span>{client.firstName} {client.lastName}</span>
                          <span className="text-muted-foreground text-xs">
                            ({client.email})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                    {clientsWithReportCounts.length === 0 && (
                      <SelectItem value="no-clients" disabled>
                        Brak podopiecznych
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>

            {selectedClient && (
              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={selectedClient.profileImageDisplayUrl || selectedClient.profileImageUrl || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary font-medium">
                    {getInitials(selectedClient.firstName, selectedClient.lastName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium" data-testid={`text-selected-client-name`}>
                    {selectedClient.firstName} {selectedClient.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground" data-testid={`text-selected-client-email`}>
                    {selectedClient.email}
                  </p>
                </div>
                <Badge variant="secondary" data-testid="badge-reports-count">
                  {sortedReports.length} {sortedReports.length === 1 ? 'raport' : 'raportów'}
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {!selectedClientId && (
        <Card>
          <CardContent className="p-12 text-center space-y-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-xl mb-2" data-testid="text-empty-state">
                Wybierz podopiecznego
              </h3>
              <p className="text-muted-foreground">
                Wybierz podopiecznego z listy powyżej, aby zobaczyć jego raporty tygodniowe
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedClientId && isLoadingReports && (
        <div className="space-y-4">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      )}

      {selectedClientId && !isLoadingReports && sortedReports.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center space-y-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-xl mb-2" data-testid="text-no-reports">
                Brak raportów
              </h3>
              <p className="text-muted-foreground">
                Ten podopieczny nie wysłał jeszcze żadnych raportów tygodniowych
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-6">
        {sortedReports.map((report) => (
          <Card key={report.id} data-testid={`card-report-${report.id}`}>
            <CardHeader>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle className="font-heading flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Raport z {format(new Date(report.reportDate), "d MMMM yyyy", { locale: pl })}
                  </CardTitle>
                  <CardDescription className="mt-1" data-testid={`text-report-date-${report.id}`}>
                    Dodano {format(new Date(report.createdAt), "d MMM yyyy, HH:mm", { locale: pl })}
                  </CardDescription>
                </div>
                <Badge variant="secondary" data-testid={`badge-report-date-${report.id}`}>
                  {format(new Date(report.reportDate), "dd.MM.yyyy")}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {report.weight && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Weight className="w-4 h-4" />
                      Waga
                    </div>
                    <p className="text-lg font-medium" data-testid={`text-weight-${report.id}`}>
                      {report.weight}
                    </p>
                  </div>
                )}

                {report.saturation && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Activity className="w-4 h-4" />
                      Poziom nasycenia
                    </div>
                    <p className="text-lg font-medium" data-testid={`text-saturation-${report.id}`}>
                      {report.saturation}
                    </p>
                  </div>
                )}
              </div>

              {(report.chest || report.waist || report.hips || report.arm || report.leg) && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-heading font-semibold text-lg mb-4 flex items-center gap-2">
                      <Ruler className="w-5 h-5" />
                      Pomiary (cm)
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                      {report.chest && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Klatka</p>
                          <p className="text-base font-medium" data-testid={`text-chest-${report.id}`}>
                            {report.chest} cm
                          </p>
                        </div>
                      )}
                      {report.waist && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Talia</p>
                          <p className="text-base font-medium" data-testid={`text-waist-${report.id}`}>
                            {report.waist} cm
                          </p>
                        </div>
                      )}
                      {report.hips && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Biodro</p>
                          <p className="text-base font-medium" data-testid={`text-hips-${report.id}`}>
                            {report.hips} cm
                          </p>
                        </div>
                      )}
                      {report.arm && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Ramię</p>
                          <p className="text-base font-medium" data-testid={`text-arm-${report.id}`}>
                            {report.arm} cm
                          </p>
                        </div>
                      )}
                      {report.leg && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Udo</p>
                          <p className="text-base font-medium" data-testid={`text-leg-${report.id}`}>
                            {report.leg} cm
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {report.cardio && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Activity className="w-4 h-4" />
                      Cardio
                    </div>
                    <p className="text-base" data-testid={`text-cardio-${report.id}`}>
                      {report.cardio}
                    </p>
                  </div>
                </>
              )}

              {report.supplements && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Pill className="w-4 h-4" />
                      Suplementacja
                    </div>
                    <p className="text-base" data-testid={`text-supplements-${report.id}`}>
                      {report.supplements}
                    </p>
                  </div>
                </>
              )}

              {report.mood && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Heart className="w-4 h-4" />
                      Samopoczucie
                    </div>
                    <p className="text-base" data-testid={`text-mood-${report.id}`}>
                      {report.mood}
                    </p>
                  </div>
                </>
              )}

              {report.thoughts && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <MessageSquare className="w-4 h-4" />
                      Ogólne przemyślenia
                    </div>
                    <p className="text-base" data-testid={`text-thoughts-${report.id}`}>
                      {report.thoughts}
                    </p>
                  </div>
                </>
              )}

              {report.photoUrl && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <ImageIcon className="w-4 h-4" />
                      Zdjęcie raportowe
                    </div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <button
                          className="block overflow-hidden rounded-lg border hover-elevate active-elevate-2 transition-all"
                          data-testid={`button-view-photo-${report.id}`}
                        >
                          <img
                            src={report.photoUrl}
                            alt="Zdjęcie raportowe"
                            className="h-48 w-auto object-cover"
                            data-testid={`img-report-photo-${report.id}`}
                          />
                        </button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl">
                        <img
                          src={report.photoUrl}
                          alt="Zdjęcie raportowe"
                          className="w-full h-auto"
                          data-testid={`img-report-photo-full-${report.id}`}
                        />
                      </DialogContent>
                    </Dialog>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
