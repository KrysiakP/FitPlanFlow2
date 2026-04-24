import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, getDay, startOfWeek, addDays } from "date-fns";
import { pl } from "date-fns/locale";
import { Calendar as CalendarIcon, Droplet, Loader2, Pill, Apple, Clock, Utensils } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { DietPlan, DietMeal, DailyHabitLog, MealCheckmark, DietSupplement } from "@shared/schema";
import { cn } from "@/lib/utils";

type DietPlanWithMeals = DietPlan & {
  meals: DietMeal[];
};

type DailyHabitLogWithCheckmarks = DailyHabitLog & {
  mealCheckmarks: MealCheckmark[];
};

const logFormSchema = z.object({
  waterLiters: z.number().min(0).max(10),
  hitCalories: z.boolean(),
  hitProtein: z.boolean(),
  hitFat: z.boolean(),
  hitCarbs: z.boolean(),
  mealCheckmarks: z.array(z.object({
    mealId: z.string(),
    completed: z.boolean(),
  })),
});

type LogFormValues = z.infer<typeof logFormSchema>;

const POLISH_DAY_NAMES = [
  "Poniedziałek",
  "Wtorek",
  "Środa",
  "Czwartek",
  "Piątek",
  "Sobota",
  "Niedziela",
];

const POLISH_DAY_SHORT = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"];

function getPolishDayOfWeek(date: Date): number {
  const jsDay = getDay(date);
  return jsDay === 0 ? 7 : jsDay;
}

function getPolishDayName(dayOfWeek: number): string {
  return POLISH_DAY_NAMES[dayOfWeek - 1] || "";
}

export default function ClientDiet() {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const { data: dietPlan, isLoading: isPlanLoading, error: planError } = useQuery<DietPlanWithMeals>({
    queryKey: ["/api/client/diet"],
  });

  const { data: supplements, isLoading: isSupplementsLoading } = useQuery<DietSupplement[]>({
    queryKey: ["/api/diet-plans", dietPlan?.id, "supplements"],
    enabled: !!dietPlan?.id,
  });

  const { data: existingLogs, isLoading: isLogLoading } = useQuery<DailyHabitLogWithCheckmarks[]>({
    queryKey: ["/api/client/diet/logs", { 
      startDate: format(selectedDate, "yyyy-MM-dd"),
      endDate: format(selectedDate, "yyyy-MM-dd"),
      planId: dietPlan?.id 
    }],
    enabled: !!dietPlan?.id,
  });

  const existingLog = existingLogs?.[0];

  const selectedDayOfWeek = useMemo(() => getPolishDayOfWeek(selectedDate), [selectedDate]);
  const selectedDayName = useMemo(() => getPolishDayName(selectedDayOfWeek), [selectedDayOfWeek]);

  const filteredMeals = useMemo(() => {
    if (!dietPlan?.meals) return [];
    return dietPlan.meals
      .filter(meal => meal.dayOfWeek === selectedDayOfWeek)
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }, [dietPlan?.meals, selectedDayOfWeek]);

  const dailyMacroSummary = useMemo(() => {
    return filteredMeals.reduce(
      (acc, meal) => ({
        calories: acc.calories + (meal.calories || 0),
        protein: acc.protein + (meal.protein || 0),
        fat: acc.fat + (meal.fat || 0),
        carbs: acc.carbs + (meal.carbs || 0),
      }),
      { calories: 0, protein: 0, fat: 0, carbs: 0 }
    );
  }, [filteredMeals]);

  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [selectedDate]);

  const form = useForm<LogFormValues>({
    resolver: zodResolver(logFormSchema),
    defaultValues: {
      waterLiters: 0,
      hitCalories: false,
      hitProtein: false,
      hitFat: false,
      hitCarbs: false,
      mealCheckmarks: [],
    },
  });

  useEffect(() => {
    if (existingLog && filteredMeals.length > 0) {
      form.reset({
        waterLiters: parseFloat(existingLog.waterLiters) || 0,
        hitCalories: existingLog.hitCalories,
        hitProtein: existingLog.hitProtein,
        hitFat: existingLog.hitFat,
        hitCarbs: existingLog.hitCarbs,
        mealCheckmarks: filteredMeals.map(meal => {
          const checkmark = existingLog.mealCheckmarks?.find(mc => mc.mealId === meal.id);
          return {
            mealId: meal.id,
            completed: checkmark?.completed || false,
          };
        }),
      });
    } else if (filteredMeals.length > 0) {
      form.reset({
        waterLiters: 0,
        hitCalories: false,
        hitProtein: false,
        hitFat: false,
        hitCarbs: false,
        mealCheckmarks: filteredMeals.map(meal => ({
          mealId: meal.id,
          completed: false,
        })),
      });
    } else {
      form.reset({
        waterLiters: existingLog ? parseFloat(existingLog.waterLiters) || 0 : 0,
        hitCalories: existingLog?.hitCalories || false,
        hitProtein: existingLog?.hitProtein || false,
        hitFat: existingLog?.hitFat || false,
        hitCarbs: existingLog?.hitCarbs || false,
        mealCheckmarks: [],
      });
    }
  }, [existingLog, filteredMeals, form]);

  const saveMutation = useMutation({
    mutationFn: async (data: LogFormValues) => {
      if (!dietPlan?.id) {
        throw new Error("Brak aktywnego planu dietetycznego");
      }

      return await apiRequest("POST", "/api/client/diet/log", {
        planId: dietPlan.id,
        date: format(selectedDate, "yyyy-MM-dd"),
        waterLiters: data.waterLiters,
        hitCalories: data.hitCalories,
        hitProtein: data.hitProtein,
        hitFat: data.hitFat,
        hitCarbs: data.hitCarbs,
        mealCheckmarks: data.mealCheckmarks,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client/diet/logs"] });
      toast({
        title: "Dziennik zapisany!",
        description: "Twój dzienny dziennik został pomyślnie zapisany.",
      });
    },
    onError: () => {
      toast({
        title: "Błąd",
        description: "Nie udało się zapisać dziennika. Spróbuj ponownie.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LogFormValues) => {
    saveMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-4xl mb-2" data-testid="text-diet-title">
          Moja dieta
        </h1>
        <p className="text-muted-foreground">
          Śledź swoje nawyki żywieniowe i odhaczaj posiłki
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Active Diet Plan */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-heading">Aktywny plan dietetyczny</CardTitle>
              <CardDescription>Twój bieżący plan żywieniowy</CardDescription>
            </CardHeader>
            <CardContent>
              {isPlanLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              ) : planError || !dietPlan ? (
                <Alert data-testid="alert-no-diet-plan">
                  <AlertDescription>
                    Nie masz jeszcze przypisanego planu dietetycznego. Skontaktuj się ze swoim trenerem.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-heading font-semibold text-lg mb-2" data-testid="text-plan-name">
                      {dietPlan.name}
                    </h3>
                    {dietPlan.description && (
                      <p className="text-sm text-muted-foreground" data-testid="text-plan-description">
                        {dietPlan.description}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Kalorie</p>
                      <p className="font-medium" data-testid="text-target-calories">
                        {dietPlan.targetCalories} kcal
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Białko</p>
                      <p className="font-medium" data-testid="text-target-protein">
                        {dietPlan.targetProtein}g
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Tłuszcz</p>
                      <p className="font-medium" data-testid="text-target-fat">
                        {dietPlan.targetFat}g
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Węglowodany</p>
                      <p className="font-medium" data-testid="text-target-carbs">
                        {dietPlan.targetCarbs}g
                      </p>
                    </div>
                  </div>

                  {dietPlan.mode === 'full_plan' && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Liczba posiłków dziennie</p>
                      <p className="font-medium" data-testid="text-meals-per-day">
                        {dietPlan.mealsPerDay}
                      </p>
                    </div>
                  )}

                  {(dietPlan.startDate || dietPlan.endDate) && (
                    <div className="grid grid-cols-2 gap-4">
                      {dietPlan.startDate && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Data rozpoczęcia</p>
                          <p className="font-medium" data-testid="text-start-date">
                            {format(new Date(dietPlan.startDate), "d MMMM yyyy", { locale: pl })}
                          </p>
                        </div>
                      )}
                      {dietPlan.endDate && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Data zakończenia</p>
                          <p className="font-medium" data-testid="text-end-date">
                            {format(new Date(dietPlan.endDate), "d MMMM yyyy", { locale: pl })}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {dietPlan.mode === 'full_plan' && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Utensils className="w-4 h-4" />
                        <h4 className="font-heading font-semibold" data-testid="text-meals-day-header">
                          Posiłki na {selectedDayName}, {format(selectedDate, "d MMMM", { locale: pl })}
                        </h4>
                      </div>

                      <div className="flex gap-1 flex-wrap" data-testid="week-calendar">
                        {weekDays.map((day, index) => {
                          const dayOfWeek = getPolishDayOfWeek(day);
                          const isSelected = format(day, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");
                          const isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
                          return (
                            <Button
                              key={index}
                              variant={isSelected ? "default" : "outline"}
                              size="sm"
                              className={cn(
                                "flex-1 min-w-[40px] px-2",
                                isToday && !isSelected && "border-primary"
                              )}
                              onClick={() => setSelectedDate(day)}
                              data-testid={`btn-day-${dayOfWeek}`}
                            >
                              <div className="flex flex-col items-center">
                                <span className="text-xs">{POLISH_DAY_SHORT[index]}</span>
                                <span className="text-xs font-medium">{format(day, "d")}</span>
                              </div>
                            </Button>
                          );
                        })}
                      </div>

                      {filteredMeals.length === 0 ? (
                        <Alert data-testid="alert-no-meals-for-day">
                          <AlertDescription>
                            Brak posiłków zaplanowanych na {selectedDayName.toLowerCase()}.
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <>
                          <div className="space-y-3">
                            {filteredMeals.map((meal) => (
                              <Card key={meal.id} data-testid={`meal-item-${meal.id}`}>
                                <CardContent className="p-4">
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      {meal.suggestedTime && (
                                        <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground" data-testid={`meal-time-${meal.id}`}>
                                          <Clock className="w-3 h-3" />
                                          {meal.suggestedTime}
                                        </span>
                                      )}
                                      <h5 className="font-medium" data-testid={`meal-name-${meal.id}`}>{meal.name}</h5>
                                    </div>
                                    {meal.description && (
                                      <p className="text-sm text-muted-foreground" data-testid={`meal-description-${meal.id}`}>
                                        {meal.description}
                                      </p>
                                    )}
                                    {(meal.calories || meal.protein || meal.fat || meal.carbs) && (
                                      <div className="flex gap-3 flex-wrap text-xs" data-testid={`meal-macros-${meal.id}`}>
                                        {meal.calories && (
                                          <span className="text-muted-foreground">
                                            <span className="font-medium text-foreground">{meal.calories}</span> kcal
                                          </span>
                                        )}
                                        {meal.protein && (
                                          <span className="text-muted-foreground">
                                            B: <span className="font-medium text-foreground">{meal.protein}g</span>
                                          </span>
                                        )}
                                        {meal.fat && (
                                          <span className="text-muted-foreground">
                                            T: <span className="font-medium text-foreground">{meal.fat}g</span>
                                          </span>
                                        )}
                                        {meal.carbs && (
                                          <span className="text-muted-foreground">
                                            W: <span className="font-medium text-foreground">{meal.carbs}g</span>
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>

                          {(dailyMacroSummary.calories > 0 || dailyMacroSummary.protein > 0 || dailyMacroSummary.fat > 0 || dailyMacroSummary.carbs > 0) && (
                            <div className="p-3 bg-muted/50 rounded-lg" data-testid="daily-macro-summary">
                              <p className="text-sm font-medium mb-2">Podsumowanie dnia:</p>
                              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                                <div>
                                  <p className="font-medium" data-testid="summary-calories">{dailyMacroSummary.calories}</p>
                                  <p className="text-muted-foreground">kcal</p>
                                </div>
                                <div>
                                  <p className="font-medium" data-testid="summary-protein">{dailyMacroSummary.protein}g</p>
                                  <p className="text-muted-foreground">białko</p>
                                </div>
                                <div>
                                  <p className="font-medium" data-testid="summary-fat">{dailyMacroSummary.fat}g</p>
                                  <p className="text-muted-foreground">tłuszcz</p>
                                </div>
                                <div>
                                  <p className="font-medium" data-testid="summary-carbs">{dailyMacroSummary.carbs}g</p>
                                  <p className="text-muted-foreground">węgle</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {supplements && supplements.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Pill className="w-4 h-4" />
                        <h4 className="font-heading font-semibold">Suplementacja</h4>
                      </div>
                      <div className="space-y-2">
                        {supplements
                          .sort((a, b) => a.orderIndex - b.orderIndex)
                          .map((supplement, index) => (
                            <Card key={supplement.id} data-testid={`supplement-item-${index}`}>
                              <CardContent className="p-4">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium" data-testid={`text-supplement-name-${index}`}>
                                      {supplement.name}
                                    </span>
                                    <span className="text-sm text-muted-foreground" data-testid={`text-supplement-dose-${index}`}>
                                      {supplement.dose} {supplement.unit}
                                    </span>
                                    <span className={cn(
                                      "text-xs px-2 py-0.5 rounded-full",
                                      supplement.frequency === "daily" && "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
                                      supplement.frequency === "e2d" && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
                                      supplement.frequency === "e3d" && "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
                                      supplement.frequency === "weekly" && "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100"
                                    )} data-testid={`badge-supplement-frequency-${index}`}>
                                      {supplement.frequency === "daily" && "Codziennie"}
                                      {supplement.frequency === "e2d" && "Co 2 dni"}
                                      {supplement.frequency === "e3d" && "Co 3 dni"}
                                      {supplement.frequency === "weekly" && "Raz w tygodniu"}
                                    </span>
                                  </div>
                                  {supplement.timing && (
                                    <p className="text-sm text-muted-foreground" data-testid={`text-supplement-timing-${index}`}>
                                      Pora: {supplement.timing}
                                    </p>
                                  )}
                                  {supplement.notes && (
                                    <p className="text-sm text-muted-foreground" data-testid={`text-supplement-notes-${index}`}>
                                      {supplement.notes}
                                    </p>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Daily Habit Log */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-heading">Dzienny dziennik nawyków</CardTitle>
              <CardDescription>Śledź swoje nawyki dla wybranego dnia</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Date Picker */}
              <div className="space-y-2">
                <Label>Wybierz dzień</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                      data-testid="datepicker-log-date"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(selectedDate, "d MMMM yyyy", { locale: pl })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => date && setSelectedDate(date)}
                      initialFocus
                      locale={pl}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {!dietPlan ? (
                <Alert data-testid="alert-no-plan-for-log">
                  <AlertDescription>
                    Potrzebujesz aktywnego planu dietetycznego, aby zapisywać dziennik.
                  </AlertDescription>
                </Alert>
              ) : (
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Meals Section - only for full_plan mode */}
                  {dietPlan.mode === 'full_plan' && (
                    <div className="space-y-4">
                      <h4 className="font-heading font-semibold" data-testid="text-checkmarks-header">
                        Posiłki - {selectedDayName}
                      </h4>
                      {isLogLoading ? (
                        <div className="space-y-3">
                          <Skeleton className="h-8 w-full" />
                          <Skeleton className="h-8 w-full" />
                          <Skeleton className="h-8 w-full" />
                        </div>
                      ) : filteredMeals.length === 0 ? (
                        <p className="text-sm text-muted-foreground" data-testid="text-no-meals-checkmarks">
                          Brak posiłków na ten dzień.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {filteredMeals.map((meal, index) => (
                            <div key={meal.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`meal-${meal.id}`}
                                checked={form.watch(`mealCheckmarks.${index}.completed`) || false}
                                onCheckedChange={(checked) => {
                                  form.setValue(`mealCheckmarks.${index}`, {
                                    mealId: meal.id,
                                    completed: checked as boolean,
                                  });
                                }}
                                data-testid={`checkbox-meal-${meal.id}`}
                              />
                              <Label
                                htmlFor={`meal-${meal.id}`}
                                className="text-sm font-normal cursor-pointer flex items-center gap-2"
                              >
                                {meal.suggestedTime && (
                                  <span className="text-muted-foreground text-xs">{meal.suggestedTime}</span>
                                )}
                                {meal.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Water Section */}
                  <div className="space-y-2">
                    <Label htmlFor="water" className="flex items-center gap-2">
                      <Droplet className="w-4 h-4 text-blue-500" />
                      Wypita woda (litry)
                    </Label>
                    <Input
                      id="water"
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      placeholder="np. 2.5"
                      {...form.register("waterLiters", { valueAsNumber: true })}
                      data-testid="input-water"
                    />
                  </div>

                  {/* Macros Section */}
                  <div className="space-y-4">
                    <h4 className="font-heading font-semibold">Makroskładniki</h4>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="hitCalories"
                          checked={form.watch("hitCalories")}
                          onCheckedChange={(checked) => form.setValue("hitCalories", checked as boolean)}
                          data-testid="checkbox-hit-calories"
                        />
                        <Label htmlFor="hitCalories" className="text-sm font-normal cursor-pointer">
                          Trzymałem się kalorii
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="hitProtein"
                          checked={form.watch("hitProtein")}
                          onCheckedChange={(checked) => form.setValue("hitProtein", checked as boolean)}
                          data-testid="checkbox-hit-protein"
                        />
                        <Label htmlFor="hitProtein" className="text-sm font-normal cursor-pointer">
                          Trzymałem się białka
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="hitFat"
                          checked={form.watch("hitFat")}
                          onCheckedChange={(checked) => form.setValue("hitFat", checked as boolean)}
                          data-testid="checkbox-hit-fat"
                        />
                        <Label htmlFor="hitFat" className="text-sm font-normal cursor-pointer">
                          Trzymałem się tłuszczu
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="hitCarbs"
                          checked={form.watch("hitCarbs")}
                          onCheckedChange={(checked) => form.setValue("hitCarbs", checked as boolean)}
                          data-testid="checkbox-hit-carbs"
                        />
                        <Label htmlFor="hitCarbs" className="text-sm font-normal cursor-pointer">
                          Trzymałem się węglowodanów
                        </Label>
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={saveMutation.isPending || !dietPlan}
                    data-testid="button-save-log"
                  >
                    {saveMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Zapisywanie...
                      </>
                    ) : (
                      "Zapisz dziennik"
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
