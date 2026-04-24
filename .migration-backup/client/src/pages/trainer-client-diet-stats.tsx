import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UtensilsCrossed, Flame, Droplet, ArrowLeft, AlertCircle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { DietPlan } from "@shared/schema";

interface DietStats {
  avgCompletedMealsPercent: number;
  streakDays: number;
  avgWaterLiters: number;
  totalDaysLogged: number;
  dailyStats?: Array<{
    date: string;
    completedMealsPercent: number;
    waterLiters: number;
  }>;
  dateRange: {
    start: string;
    end: string;
  };
}

export default function TrainerClientDietStats() {
  const { clientId } = useParams<{ clientId: string }>();
  const [selectedPeriod, setSelectedPeriod] = useState("30");

  // Fetch active diet plan
  const { data: activePlan, isLoading: isLoadingPlan, error: planError } = useQuery<DietPlan | null>({
    queryKey: [`/api/trainer/clients/${clientId}/active-diet`],
    enabled: !!clientId,
  });

  // Fetch diet stats
  const { data: stats, isLoading: isLoadingStats, error: statsError } = useQuery<DietStats>({
    queryKey: [`/api/trainer/clients/${clientId}/diet-stats`, { planId: activePlan?.id, days: selectedPeriod }],
    enabled: !!activePlan?.id,
  });

  const isLoading = isLoadingPlan || isLoadingStats;
  const error = planError || statsError;

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-6 max-w-7xl space-y-8">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-10 w-64" />
        </div>
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-80 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!activePlan) {
    return (
      <div className="container mx-auto py-8 px-6 max-w-7xl">
        <div className="mb-6">
          <Button asChild variant="ghost" data-testid="button-back-to-client">
            <Link href="/clients">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Powrót do podopiecznych
            </Link>
          </Button>
        </div>
        <Alert data-testid="alert-no-active-plan">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Ten podopieczny nie ma aktywnego planu diety. Przypisz plan diety, aby móc śledzić postępy żywieniowe.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-6 max-w-7xl">
        <div className="mb-6">
          <Button asChild variant="ghost" data-testid="button-back-to-client">
            <Link href="/clients">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Powrót do podopiecznych
            </Link>
          </Button>
        </div>
        <Alert variant="destructive" data-testid="alert-error">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Nie udało się pobrać statystyk żywieniowych. Spróbuj ponownie później.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-6 max-w-7xl space-y-8">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon" data-testid="button-back-to-client">
          <Link href="/clients">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div>
          <h1 className="font-heading font-bold text-4xl" data-testid="heading-page-title">
            Postępy żywieniowe
          </h1>
          <p className="text-muted-foreground mt-1" data-testid="text-plan-name">
            Plan: {activePlan.name}
          </p>
        </div>
      </div>

      {/* Section Header with Period Selector */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="font-heading font-semibold text-2xl" data-testid="heading-section-title">
          Statystyki
        </h2>
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-32" data-testid="select-period">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7" data-testid="select-option-7-days">7 dni</SelectItem>
            <SelectItem value="30" data-testid="select-option-30-days">30 dni</SelectItem>
            <SelectItem value="90" data-testid="select-option-90-days">90 dni</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {/* Card 1 - Meals Completion */}
        <Card data-testid="stat-meals-completion">
          <CardHeader className="gap-1 space-y-0 pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <UtensilsCrossed className="w-5 h-5 text-primary" />
              Średnia realizacja posiłków
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-3xl font-bold" data-testid="text-meals-completion-value">
              {stats?.avgCompletedMealsPercent.toFixed(1)}%
            </div>
            <Progress 
              value={stats?.avgCompletedMealsPercent || 0} 
              className="h-2"
              data-testid="progress-meals-completion"
            />
            <p className="text-sm text-muted-foreground">
              {stats?.totalDaysLogged || 0} dni z logami
            </p>
          </CardContent>
        </Card>

        {/* Card 2 - Streak Days */}
        <Card data-testid="stat-streak-days">
          <CardHeader className="gap-1 space-y-0 pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <Flame className="w-5 h-5 text-orange-500" />
              Dni z rzędu z logowaniem
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-3xl font-bold" data-testid="text-streak-days-value">
              {stats?.streakDays || 0} dni
            </div>
            {stats && stats.streakDays > 0 && (
              <Badge variant="secondary" data-testid="badge-active-streak">
                Aktywny streak
              </Badge>
            )}
            {(!stats || stats.streakDays === 0) && (
              <p className="text-sm text-muted-foreground">
                Brak aktywnego streaku
              </p>
            )}
          </CardContent>
        </Card>

        {/* Card 3 - Average Water */}
        <Card data-testid="stat-avg-water">
          <CardHeader className="gap-1 space-y-0 pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <Droplet className="w-5 h-5 text-blue-500" />
              Średnio dziennie
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-3xl font-bold" data-testid="text-avg-water-value">
              {stats?.avgWaterLiters.toFixed(1)} L
            </div>
            <p className="text-sm text-muted-foreground">
              Spożycie wody
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart Section (optional) */}
      {stats?.dailyStats && stats.dailyStats.length > 0 && (
        <Card data-testid="card-progress-chart">
          <CardHeader>
            <CardTitle className="font-heading text-xl">Wykres postępów</CardTitle>
            <CardDescription>
              Realizacja posiłków w okresie {stats.dateRange.start} - {stats.dateRange.end}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.dailyStats}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getDate()}/${date.getMonth() + 1}`;
                  }}
                />
                <YAxis 
                  domain={[0, 100]}
                  tick={{ fontSize: 12 }}
                  label={{ value: '% realizacji', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  formatter={(value: number) => [`${value.toFixed(1)}%`, 'Realizacja']}
                  labelFormatter={(label) => {
                    const date = new Date(label);
                    return date.toLocaleDateString('pl-PL');
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="completedMealsPercent" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
