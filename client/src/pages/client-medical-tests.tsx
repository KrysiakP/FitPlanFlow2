import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Download, Calendar, FileText } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import type { MedicalTest } from "@shared/schema";

const testTypeLabels: Record<string, string> = {
  krew: "Krew",
  echo: "Echo serca",
  usg: "USG",
  inne: "Inne",
};

const testTypeVariants: Record<string, "default" | "secondary" | "outline"> = {
  krew: "default",
  echo: "secondary",
  usg: "outline",
  inne: "outline",
};

export default function ClientMedicalTests() {
  const { user } = useAuth();

  const { data: tests, isLoading } = useQuery<MedicalTest[]>({
    queryKey: ["/api/clients", user?.id, "medical-tests"],
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto p-6">
        <div className="space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-4xl font-heading font-bold mb-2" data-testid="heading-medical-tests">
          Moje badania medyczne
        </h1>
        <p className="text-muted-foreground text-lg">
          Przegląd wszystkich twoich badań dodanych przez trenera
        </p>
      </div>

      {!tests || tests.length === 0 ? (
        <Alert data-testid="alert-no-tests">
          <Activity className="h-5 w-5" />
          <AlertDescription className="text-base">
            Nie masz jeszcze żadnych przypisanych badań medycznych.
            Twój trener może dodać wyniki badań w panelu zarządzania.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-4">
          {tests.map((test) => (
            <Card key={test.id} data-testid={`card-medical-test-${test.id}`} className="hover-elevate">
              <CardHeader>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Activity className="w-5 h-5 text-primary flex-shrink-0" />
                      <Badge 
                        variant={testTypeVariants[test.testType] || "outline"}
                        data-testid={`badge-test-type-${test.id}`}
                        className="text-base"
                      >
                        {testTypeLabels[test.testType] || test.testType}
                      </Badge>
                    </div>
                    <CardTitle className="text-xl" data-testid={`text-test-date-${test.id}`}>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        {format(new Date(test.testDate), "d MMMM yyyy", { locale: pl })}
                      </div>
                    </CardTitle>
                  </div>
                  {test.fileUrl && (
                    <Button 
                      asChild 
                      variant="outline" 
                      size="sm"
                      data-testid={`button-download-${test.id}`}
                    >
                      <a href={test.fileUrl} target="_blank" rel="noopener noreferrer">
                        <Download className="w-4 h-4 mr-2" />
                        Pobierz wyniki
                      </a>
                    </Button>
                  )}
                </div>
              </CardHeader>
              {test.notes && (
                <CardContent>
                  <div className="flex items-start gap-2">
                    <FileText className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Notatki trenera:</p>
                      <p className="text-base" data-testid={`text-test-notes-${test.id}`}>
                        {test.notes}
                      </p>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
