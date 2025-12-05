import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  TrendingDown, 
  Image as ImageIcon,
  Dumbbell,
  Calendar,
  Weight,
  Ruler,
  AlertCircle,
  ArrowRight,
  Activity,
  ArrowLeft
} from "lucide-react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { Link } from "wouter";
import type { WeeklyReport, ExerciseLog, User } from "@shared/schema";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

function parseNumericValue(value: string | null | undefined): number {
  if (!value) return 0;
  const normalized = value.replace(',', '.');
  return parseFloat(normalized) || 0;
}

export default function TrainerClientProgress() {
  const [, params] = useRoute("/trainer/clients/:clientId/progress");
  const clientId = params?.clientId;

  const { data: client, isLoading: isLoadingClient, error: clientError } = useQuery<User>({
    queryKey: [`/api/clients/${clientId}`],
    enabled: !!clientId,
  });

  const { data: reports, isLoading: isLoadingReports, error: reportsError } = useQuery<WeeklyReport[]>({
    queryKey: [`/api/clients/${clientId}/reports`],
    enabled: !!clientId,
  });

  const { data: exerciseLogs, isLoading: isLoadingLogs, error: logsError } = useQuery<ExerciseLog[]>({
    queryKey: [`/api/trainer/clients/${clientId}/exercise-logs`],
    enabled: !!clientId,
  });

  const sortedReports = reports 
    ? [...reports].sort((a, b) => new Date(a.reportDate).getTime() - new Date(b.reportDate).getTime())
    : [];

  const oldestReport = sortedReports[0];
  const newestReport = sortedReports[sortedReports.length - 1];

  const weightData = sortedReports
    .filter(r => r.weight)
    .map(r => ({
      date: format(new Date(r.reportDate), "dd.MM", { locale: pl }),
      waga: parseNumericValue(r.weight),
    }));

  const measurementData = sortedReports
    .filter(r => r.chest || r.waist || r.hips)
    .map(r => ({
      date: format(new Date(r.reportDate), "dd.MM", { locale: pl }),
      klatka: r.chest ? parseNumericValue(r.chest) : null,
      talia: r.waist ? parseNumericValue(r.waist) : null,
      biodro: r.hips ? parseNumericValue(r.hips) : null,
    }));

  if (isLoadingClient || isLoadingReports || isLoadingLogs) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="flex-1">
            <Skeleton className="h-10 w-64 mb-2" />
            <Skeleton className="h-5 w-96" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (clientError || reportsError || logsError) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon" data-testid="button-back">
            <Link href="/clients">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="font-heading font-bold text-4xl mb-2">Progres podopiecznego</h1>
          </div>
        </div>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Błąd</AlertTitle>
          <AlertDescription>
            Nie udało się załadować danych podopiecznego. Spróbuj ponownie później.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon" data-testid="button-back">
            <Link href="/clients">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="font-heading font-bold text-4xl mb-2">Progres podopiecznego</h1>
          </div>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Nie znaleziono podopiecznego</AlertTitle>
          <AlertDescription>
            Podopieczny o podanym ID nie istnieje lub nie masz do niego dostępu.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon" data-testid="button-back">
          <Link href="/clients">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="font-heading font-bold text-4xl mb-2" data-testid="text-progress-title">
            Progres: {client.firstName} {client.lastName}
          </h1>
          <p className="text-muted-foreground">
            Śledź postępy swojego podopiecznego w treningu i transformacji
          </p>
        </div>
      </div>

      {!reports || reports.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Brak danych</AlertTitle>
          <AlertDescription>
            Podopieczny nie wypełnił jeszcze żadnego raportu tygodniowego.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          {oldestReport && newestReport && (
            <Card>
              <CardHeader>
                <CardTitle className="font-heading flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Zmiana w pomiarach
                </CardTitle>
                <CardDescription>
                  Porównanie pomiarów między pierwszym a ostatnim raportem
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {oldestReport.weight && newestReport.weight && (
                    <MeasurementChange
                      label="Waga"
                      icon={<Weight className="w-4 h-4" />}
                      before={parseNumericValue(oldestReport.weight)}
                      after={parseNumericValue(newestReport.weight)}
                      unit="kg"
                    />
                  )}
                  {oldestReport.chest && newestReport.chest && (
                    <MeasurementChange
                      label="Klatka"
                      icon={<Ruler className="w-4 h-4" />}
                      before={parseNumericValue(oldestReport.chest)}
                      after={parseNumericValue(newestReport.chest)}
                      unit="cm"
                    />
                  )}
                  {oldestReport.waist && newestReport.waist && (
                    <MeasurementChange
                      label="Talia"
                      icon={<Ruler className="w-4 h-4" />}
                      before={parseNumericValue(oldestReport.waist)}
                      after={parseNumericValue(newestReport.waist)}
                      unit="cm"
                    />
                  )}
                  {oldestReport.hips && newestReport.hips && (
                    <MeasurementChange
                      label="Biodro"
                      icon={<Ruler className="w-4 h-4" />}
                      before={parseNumericValue(oldestReport.hips)}
                      after={parseNumericValue(newestReport.hips)}
                      unit="cm"
                    />
                  )}
                  {oldestReport.arm && newestReport.arm && (
                    <MeasurementChange
                      label="Ramię"
                      icon={<Ruler className="w-4 h-4" />}
                      before={parseNumericValue(oldestReport.arm)}
                      after={parseNumericValue(newestReport.arm)}
                      unit="cm"
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {weightData.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="font-heading flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Wykres wagi
                </CardTitle>
                <CardDescription>
                  Zmiana wagi w czasie na podstawie raportów tygodniowych
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={weightData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="waga" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      name="Waga (kg)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {measurementData.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="font-heading flex items-center gap-2">
                  <Ruler className="w-5 h-5" />
                  Wykres obwodów
                </CardTitle>
                <CardDescription>
                  Zmiana obwodów ciała w czasie
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={measurementData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {measurementData.some(d => d.klatka) && (
                      <Line 
                        type="monotone" 
                        dataKey="klatka" 
                        stroke="#8884d8" 
                        strokeWidth={2}
                        name="Klatka (cm)"
                      />
                    )}
                    {measurementData.some(d => d.talia) && (
                      <Line 
                        type="monotone" 
                        dataKey="talia" 
                        stroke="#82ca9d" 
                        strokeWidth={2}
                        name="Talia (cm)"
                      />
                    )}
                    {measurementData.some(d => d.biodro) && (
                      <Line 
                        type="monotone" 
                        dataKey="biodro" 
                        stroke="#ffc658" 
                        strokeWidth={2}
                        name="Biodro (cm)"
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {exerciseLogs && exerciseLogs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="font-heading flex items-center gap-2">
                  <Dumbbell className="w-5 h-5" />
                  Progres w ćwiczeniach
                </CardTitle>
                <CardDescription>
                  Ostatnie wyniki podopiecznego w poszczególnych ćwiczeniach
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {exerciseLogs.slice(0, 5).map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-3 rounded-lg border" data-testid={`exercise-log-${log.id}`}>
                      <div className="flex-1">
                        <p className="font-medium" data-testid={`text-exercise-name-${log.id}`}>{log.exerciseId}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(log.loggedAt), "d MMMM yyyy", { locale: pl })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-lg" data-testid={`text-exercise-reps-${log.id}`}>{log.reps} powtórzeń</p>
                        {log.load && <p className="text-sm text-muted-foreground" data-testid={`text-exercise-load-${log.id}`}>{log.load}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function MeasurementChange({
  label,
  icon,
  before,
  after,
  unit
}: {
  label: string;
  icon: React.ReactNode;
  before: number;
  after: number;
  unit: string;
}) {
  const change = after - before;
  const isPositive = change > 0;
  const isNegative = change < 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="space-y-1">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold">{after.toFixed(1)}</span>
          <span className="text-sm text-muted-foreground">{unit}</span>
        </div>
        {change !== 0 && (
          <div className={`flex items-center gap-1 text-sm font-medium ${
            isPositive ? "text-green-600 dark:text-green-400" : 
            isNegative ? "text-red-600 dark:text-red-400" : 
            "text-muted-foreground"
          }`}>
            {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span>{isPositive ? "+" : ""}{change.toFixed(1)} {unit}</span>
          </div>
        )}
      </div>
    </div>
  );
}
