import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { 
  TrendingUp, 
  TrendingDown, 
  Dumbbell,
  Calendar,
  Weight,
  Ruler,
  AlertCircle,
  Activity,
  ArrowLeft,
  BarChart3,
  Clock,
  CheckCircle2,
  Play
} from "lucide-react";
import { format, startOfWeek, endOfWeek, eachWeekOfInterval, subWeeks, parseISO } from "date-fns";
import { pl } from "date-fns/locale";
import { Link } from "wouter";
import type { WeeklyReport, ExerciseLog, User, Exercise, WorkoutSession } from "@shared/schema";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  BarChart,
  Bar,
  ResponsiveContainer,
  Tooltip,
  Legend,
  Area,
  AreaChart
} from "recharts";
import { useMemo } from "react";

function parseNumericValue(value: string | null | undefined): number {
  if (!value) return 0;
  const normalized = value.replace(',', '.');
  return parseFloat(normalized) || 0;
}

function parseLoadToKg(load: string | null | undefined): number {
  if (!load) return 0;
  const normalized = load.toLowerCase().replace(',', '.');
  const match = normalized.match(/(\d+(?:\.\d+)?)/);
  if (match) {
    return parseFloat(match[1]);
  }
  return 0;
}

const weightChartConfig = {
  waga: {
    label: "Waga (kg)",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

const measurementChartConfig = {
  klatka: {
    label: "Klatka piersiowa",
    color: "hsl(var(--chart-1))",
  },
  talia: {
    label: "Talia",
    color: "hsl(var(--chart-2))",
  },
  biodro: {
    label: "Biodro",
    color: "hsl(var(--chart-4))",
  },
  "ramię": {
    label: "Ramię",
    color: "hsl(var(--chart-3))",
  },
  udo: {
    label: "Udo",
    color: "hsl(var(--chart-5))",
  },
} satisfies ChartConfig;

const workoutChartConfig = {
  treningi: {
    label: "Treningi",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

const performanceChartConfig = {
  obciazenie: {
    label: "Max obciążenie (kg)",
    color: "hsl(var(--chart-1))",
  },
  powtorzenia: {
    label: "Powtórzenia",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig;

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

  const { data: workoutSessions } = useQuery<WorkoutSession[]>({
    queryKey: [`/api/trainer/clients/${clientId}/workout-sessions`],
    enabled: !!clientId,
  });

  const sortedReports = useMemo(() => {
    if (!reports) return [];
    return [...reports].sort((a, b) => new Date(a.reportDate).getTime() - new Date(b.reportDate).getTime());
  }, [reports]);

  const oldestReport = sortedReports[0];
  const newestReport = sortedReports[sortedReports.length - 1];

  const weightData = useMemo(() => {
    return sortedReports
      .filter(r => r.weight)
      .map(r => ({
        date: format(new Date(r.reportDate), "dd.MM", { locale: pl }),
        fullDate: format(new Date(r.reportDate), "d MMMM yyyy", { locale: pl }),
        waga: parseNumericValue(r.weight),
      }));
  }, [sortedReports]);

  const measurementData = useMemo(() => {
    return sortedReports
      .filter(r => r.chest || r.waist || r.hips || r.arm || r.leg)
      .map(r => ({
        date: format(new Date(r.reportDate), "dd.MM", { locale: pl }),
        fullDate: format(new Date(r.reportDate), "d MMMM yyyy", { locale: pl }),
        klatka: r.chest ? parseNumericValue(r.chest) : null,
        talia: r.waist ? parseNumericValue(r.waist) : null,
        biodro: r.hips ? parseNumericValue(r.hips) : null,
        ramię: r.arm ? parseNumericValue(r.arm) : null,
        udo: r.leg ? parseNumericValue(r.leg) : null,
      }));
  }, [sortedReports]);

  const workoutConsistencyData = useMemo(() => {
    if (!exerciseLogs || exerciseLogs.length === 0) return [];
    
    const sortedLogs = [...exerciseLogs].sort((a, b) => 
      new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime()
    );
    
    if (sortedLogs.length === 0) return [];
    
    const firstLogDate = new Date(sortedLogs[0].loggedAt);
    const lastLogDate = new Date(sortedLogs[sortedLogs.length - 1].loggedAt);
    
    const weeks = eachWeekOfInterval(
      { start: firstLogDate, end: lastLogDate },
      { weekStartsOn: 1 }
    );
    
    const weeklyData = weeks.map(weekStart => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      
      const uniqueWorkoutDays = new Set<string>();
      sortedLogs.forEach(log => {
        const logDate = new Date(log.loggedAt);
        if (logDate >= weekStart && logDate <= weekEnd) {
          uniqueWorkoutDays.add(format(logDate, 'yyyy-MM-dd'));
        }
      });
      
      return {
        tydzien: format(weekStart, "dd.MM", { locale: pl }),
        fullDate: `${format(weekStart, "d MMM", { locale: pl })} - ${format(weekEnd, "d MMM", { locale: pl })}`,
        treningi: uniqueWorkoutDays.size,
      };
    });
    
    return weeklyData.slice(-12);
  }, [exerciseLogs]);

  const exercisePerformanceData = useMemo(() => {
    if (!exerciseLogs || exerciseLogs.length === 0) return [];
    
    const exerciseGroups = new Map<string, { 
      exerciseId: string;
      logs: Array<{ date: Date; load: number; reps: number }>;
    }>();
    
    exerciseLogs.forEach(log => {
      const key = log.exerciseId;
      if (!exerciseGroups.has(key)) {
        exerciseGroups.set(key, {
          exerciseId: log.exerciseId,
          logs: [],
        });
      }
      exerciseGroups.get(key)!.logs.push({
        date: new Date(log.loggedAt),
        load: parseLoadToKg(log.load),
        reps: log.reps,
      });
    });
    
    const topExercises = Array.from(exerciseGroups.entries())
      .map(([id, data]) => ({
        exerciseId: id,
        totalLogs: data.logs.length,
        maxLoad: Math.max(...data.logs.map(l => l.load)),
        logs: data.logs.sort((a, b) => a.date.getTime() - b.date.getTime()),
      }))
      .sort((a, b) => b.totalLogs - a.totalLogs)
      .slice(0, 5);
    
    return topExercises;
  }, [exerciseLogs]);

  const recentExerciseLogs = useMemo(() => {
    if (!exerciseLogs) return [];
    return exerciseLogs.slice(0, 10);
  }, [exerciseLogs]);

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
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

  const hasReportData = reports && reports.length > 0;
  const hasExerciseData = exerciseLogs && exerciseLogs.length > 0;
  const hasAnyData = hasReportData || hasExerciseData;

  const totalWorkouts = workoutConsistencyData.reduce((sum, w) => sum + w.treningi, 0);
  const avgWorkoutsPerWeek = workoutConsistencyData.length > 0 
    ? (totalWorkouts / workoutConsistencyData.length).toFixed(1)
    : "0";

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

      {!hasAnyData ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Brak danych</AlertTitle>
          <AlertDescription>
            Podopieczny nie ma jeszcze żadnych zarejestrowanych danych progresowych.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card data-testid="card-stats-reports">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{reports?.length || 0}</p>
                    <p className="text-sm text-muted-foreground">Raportów tygodniowych</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card data-testid="card-stats-workouts">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Dumbbell className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalWorkouts}</p>
                    <p className="text-sm text-muted-foreground">Dni treningowych</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card data-testid="card-stats-avg">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <BarChart3 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{avgWorkoutsPerWeek}</p>
                    <p className="text-sm text-muted-foreground">Śr. treningów/tydzień</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {oldestReport && newestReport && (
            <Card data-testid="card-measurement-changes">
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

          <Tabs defaultValue="weight" className="w-full">
            <TabsList className="grid w-full grid-cols-3 lg:grid-cols-5">
              <TabsTrigger value="weight" data-testid="tab-weight">
                <Weight className="w-4 h-4 mr-2" />
                Waga
              </TabsTrigger>
              <TabsTrigger value="measurements" data-testid="tab-measurements">
                <Ruler className="w-4 h-4 mr-2" />
                Obwody
              </TabsTrigger>
              <TabsTrigger value="consistency" data-testid="tab-consistency">
                <Calendar className="w-4 h-4 mr-2" />
                Regularność
              </TabsTrigger>
              <TabsTrigger value="performance" data-testid="tab-performance">
                <Dumbbell className="w-4 h-4 mr-2" />
                Siła
              </TabsTrigger>
              <TabsTrigger value="sessions" data-testid="tab-sessions">
                <Play className="w-4 h-4 mr-2" />
                Sesje
              </TabsTrigger>
            </TabsList>

            <TabsContent value="weight" className="mt-6">
              {weightData.length > 1 ? (
                <Card data-testid="card-weight-chart">
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
                    <ChartContainer config={weightChartConfig} className="h-[300px] w-full">
                      <AreaChart data={weightData} accessibilityLayer>
                        <defs>
                          <linearGradient id="fillWeight" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--color-waga)" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="var(--color-waga)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis 
                          dataKey="date" 
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                        />
                        <YAxis 
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          domain={['dataMin - 2', 'dataMax + 2']}
                        />
                        <ChartTooltip
                          cursor={false}
                          content={
                            <ChartTooltipContent
                              labelFormatter={(value, payload) => {
                                if (payload && payload[0]) {
                                  return payload[0].payload.fullDate;
                                }
                                return value;
                              }}
                            />
                          }
                        />
                        <Area
                          type="monotone"
                          dataKey="waga"
                          stroke="var(--color-waga)"
                          fill="url(#fillWeight)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ChartContainer>
                  </CardContent>
                </Card>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Niewystarczające dane</AlertTitle>
                  <AlertDescription>
                    Potrzebne są co najmniej 2 raporty z wagą, aby wyświetlić wykres.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            <TabsContent value="measurements" className="mt-6">
              {measurementData.length > 1 ? (
                <Card data-testid="card-measurements-chart">
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
                    <ChartContainer config={measurementChartConfig} className="h-[300px] w-full">
                      <LineChart data={measurementData} accessibilityLayer>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis 
                          dataKey="date" 
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                        />
                        <YAxis 
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                        />
                        <ChartTooltip
                          content={
                            <ChartTooltipContent
                              labelFormatter={(value, payload) => {
                                if (payload && payload[0]) {
                                  return payload[0].payload.fullDate;
                                }
                                return value;
                              }}
                            />
                          }
                        />
                        <ChartLegend content={<ChartLegendContent />} />
                        {measurementData.some(d => d.klatka) && (
                          <Line 
                            type="monotone" 
                            dataKey="klatka" 
                            stroke="var(--color-klatka)" 
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            activeDot={{ r: 5 }}
                          />
                        )}
                        {measurementData.some(d => d.talia) && (
                          <Line 
                            type="monotone" 
                            dataKey="talia" 
                            stroke="var(--color-talia)" 
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            activeDot={{ r: 5 }}
                          />
                        )}
                        {measurementData.some(d => d.biodro) && (
                          <Line 
                            type="monotone" 
                            dataKey="biodro" 
                            stroke="var(--color-biodro)" 
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            activeDot={{ r: 5 }}
                          />
                        )}
                        {measurementData.some(d => d["ramię"]) && (
                          <Line 
                            type="monotone" 
                            dataKey="ramię" 
                            stroke="var(--color-ramię)" 
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            activeDot={{ r: 5 }}
                          />
                        )}
                        {measurementData.some(d => d.udo) && (
                          <Line 
                            type="monotone" 
                            dataKey="udo" 
                            stroke="var(--color-udo)" 
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            activeDot={{ r: 5 }}
                          />
                        )}
                      </LineChart>
                    </ChartContainer>
                  </CardContent>
                </Card>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Niewystarczające dane</AlertTitle>
                  <AlertDescription>
                    Potrzebne są co najmniej 2 raporty z obwodami, aby wyświetlić wykres.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            <TabsContent value="consistency" className="mt-6">
              {workoutConsistencyData.length > 0 ? (
                <Card data-testid="card-consistency-chart">
                  <CardHeader>
                    <CardTitle className="font-heading flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Regularność treningów
                    </CardTitle>
                    <CardDescription>
                      Liczba dni treningowych w każdym tygodniu (ostatnie 12 tygodni)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={workoutChartConfig} className="h-[300px] w-full">
                      <BarChart data={workoutConsistencyData} accessibilityLayer>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis 
                          dataKey="tydzien" 
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                        />
                        <YAxis 
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          domain={[0, 7]}
                          ticks={[0, 1, 2, 3, 4, 5, 6, 7]}
                        />
                        <ChartTooltip
                          content={
                            <ChartTooltipContent
                              labelFormatter={(value, payload) => {
                                if (payload && payload[0]) {
                                  return payload[0].payload.fullDate;
                                }
                                return value;
                              }}
                              formatter={(value, name) => [
                                `${value} ${Number(value) === 1 ? 'dzień' : 'dni'}`,
                                'Treningi'
                              ]}
                            />
                          }
                        />
                        <Bar 
                          dataKey="treningi" 
                          fill="var(--color-treningi)" 
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ChartContainer>
                  </CardContent>
                </Card>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Brak danych o treningach</AlertTitle>
                  <AlertDescription>
                    Podopieczny nie zarejestrował jeszcze żadnych treningów.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            <TabsContent value="performance" className="mt-6">
              {exercisePerformanceData.length > 0 ? (
                <div className="space-y-6">
                  <Card data-testid="card-performance-overview">
                    <CardHeader>
                      <CardTitle className="font-heading flex items-center gap-2">
                        <Dumbbell className="w-5 h-5" />
                        Progres siłowy
                      </CardTitle>
                      <CardDescription>
                        Najczęściej wykonywane ćwiczenia i maksymalne obciążenia
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {exercisePerformanceData.map((exercise, index) => {
                          const firstLoad = exercise.logs[0]?.load || 0;
                          const lastLoad = exercise.logs[exercise.logs.length - 1]?.load || 0;
                          const progress = lastLoad - firstLoad;
                          
                          return (
                            <div 
                              key={exercise.exerciseId} 
                              className="p-4 rounded-lg border"
                              data-testid={`exercise-performance-${exercise.exerciseId}`}
                            >
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-muted-foreground">
                                    #{index + 1}
                                  </span>
                                  <span className="font-medium truncate max-w-[200px]">
                                    Ćwiczenie
                                  </span>
                                </div>
                                <div className="flex items-center gap-4">
                                  <div className="text-right">
                                    <p className="text-sm text-muted-foreground">Max obciążenie</p>
                                    <p className="font-semibold">{exercise.maxLoad} kg</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm text-muted-foreground">Sesji</p>
                                    <p className="font-semibold">{exercise.totalLogs}</p>
                                  </div>
                                </div>
                              </div>
                              
                              {exercise.logs.length > 1 && (
                                <div className="h-[80px]">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={exercise.logs.map(l => ({
                                      date: format(l.date, "dd.MM"),
                                      obciazenie: l.load,
                                    }))}>
                                      <defs>
                                        <linearGradient id={`fill-${exercise.exerciseId}`} x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                                          <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                                        </linearGradient>
                                      </defs>
                                      <Area
                                        type="monotone"
                                        dataKey="obciazenie"
                                        stroke="hsl(var(--chart-1))"
                                        fill={`url(#fill-${exercise.exerciseId})`}
                                        strokeWidth={2}
                                      />
                                    </AreaChart>
                                  </ResponsiveContainer>
                                </div>
                              )}
                              
                              {progress !== 0 && (
                                <div className={`flex items-center gap-1 text-sm mt-2 ${
                                  progress > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                                }`}>
                                  {progress > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                  <span>
                                    {progress > 0 ? "+" : ""}{progress.toFixed(1)} kg od pierwszego wpisu
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  <Card data-testid="card-recent-exercises">
                    <CardHeader>
                      <CardTitle className="font-heading flex items-center gap-2">
                        <Activity className="w-5 h-5" />
                        Ostatnie ćwiczenia
                      </CardTitle>
                      <CardDescription>
                        Najnowsze zarejestrowane wyniki
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {recentExerciseLogs.map((log) => (
                          <div 
                            key={log.id} 
                            className="flex items-center justify-between p-3 rounded-lg border" 
                            data-testid={`exercise-log-${log.id}`}
                          >
                            <div className="flex-1">
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(log.loggedAt), "d MMMM yyyy, HH:mm", { locale: pl })}
                              </p>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="font-semibold" data-testid={`text-exercise-reps-${log.id}`}>
                                  {log.reps} powt.
                                </p>
                              </div>
                              {log.load && (
                                <div className="text-right min-w-[60px]">
                                  <p className="font-semibold text-primary" data-testid={`text-exercise-load-${log.id}`}>
                                    {log.load}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Brak danych o ćwiczeniach</AlertTitle>
                  <AlertDescription>
                    Podopieczny nie zarejestrował jeszcze żadnych ćwiczeń z obciążeniem.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            <TabsContent value="sessions" className="mt-6">
              {!workoutSessions || workoutSessions.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Brak sesji treningowych</AlertTitle>
                  <AlertDescription>
                    Podopieczny nie ukończył jeszcze żadnej sesji treningowej w aplikacji mobilnej.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <CheckCircle2 className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold">{workoutSessions.length}</p>
                            <p className="text-sm text-muted-foreground">Ukończonych sesji</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Clock className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold">
                              {Math.round(
                                workoutSessions.reduce((sum, s) => sum + (s.durationSeconds ?? 0), 0) / 60
                              )} min
                            </p>
                            <p className="text-sm text-muted-foreground">Łączny czas</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Dumbbell className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold">
                              {Math.round(
                                workoutSessions.reduce((s, sess) =>
                                  s + (sess.totalExercises > 0 ? (sess.exercisesCompleted / sess.totalExercises) * 100 : 0), 0
                                ) / workoutSessions.length
                              )}%
                            </p>
                            <p className="text-sm text-muted-foreground">Śr. ukończenie</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {workoutSessions.map((session) => {
                    const completionPct = session.totalExercises > 0
                      ? Math.round((session.exercisesCompleted / session.totalExercises) * 100)
                      : 0;
                    const durationMin = Math.round((session.durationSeconds ?? 0) / 60);
                    return (
                      <Card key={session.id} data-testid={`card-session-${session.id}`}>
                        <CardContent className="pt-4 pb-4">
                          <div className="flex items-center justify-between gap-4 flex-wrap">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-primary/10">
                                <Play className="w-4 h-4 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">
                                  {session.completedAt
                                    ? format(new Date(session.completedAt), "d MMM yyyy, HH:mm", { locale: pl })
                                    : "—"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {durationMin} min · {session.exercisesCompleted}/{session.totalExercises} ćwiczeń
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full"
                                  style={{ width: `${completionPct}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium w-10 text-right">{completionPct}%</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
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
