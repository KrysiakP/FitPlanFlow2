import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { Calendar as CalendarIcon, Droplet, Loader2 } from "lucide-react";
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
import type { DietPlan, DietMeal, DailyHabitLog, MealCheckmark } from "@shared/schema";

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

export default function ClientDiet() {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const { data: dietPlan, isLoading: isPlanLoading, error: planError } = useQuery<DietPlanWithMeals>({
    queryKey: ["/api/client/diet"],
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

  // Update form when existing log or meals change
  useEffect(() => {
    if (existingLog) {
      form.reset({
        waterLiters: parseFloat(existingLog.waterLiters) || 0,
        hitCalories: existingLog.hitCalories,
        hitProtein: existingLog.hitProtein,
        hitFat: existingLog.hitFat,
        hitCarbs: existingLog.hitCarbs,
        mealCheckmarks: dietPlan?.meals.map(meal => {
          const checkmark = existingLog.mealCheckmarks?.find(mc => mc.mealId === meal.id);
          return {
            mealId: meal.id,
            completed: checkmark?.completed || false,
          };
        }) || [],
      });
    } else if (dietPlan?.meals) {
      form.reset({
        waterLiters: 0,
        hitCalories: false,
        hitProtein: false,
        hitFat: false,
        hitCarbs: false,
        mealCheckmarks: dietPlan.meals.map(meal => ({
          mealId: meal.id,
          completed: false,
        })),
      });
    }
  }, [existingLog, dietPlan?.meals, form]);

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

                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Liczba posiłków dziennie</p>
                    <p className="font-medium" data-testid="text-meals-per-day">
                      {dietPlan.mealsPerDay}
                    </p>
                  </div>

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

                  <div className="space-y-3">
                    <h4 className="font-heading font-semibold">Posiłki</h4>
                    <div className="space-y-2">
                      {dietPlan.meals
                        .sort((a, b) => a.orderIndex - b.orderIndex)
                        .map((meal) => (
                          <Card key={meal.id} data-testid={`meal-item-${meal.id}`}>
                            <CardContent className="p-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium text-muted-foreground">
                                    #{meal.orderIndex}
                                  </span>
                                  <h5 className="font-medium">{meal.name}</h5>
                                </div>
                                <p className="text-sm text-muted-foreground">{meal.description}</p>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                    </div>
                  </div>
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
                  {/* Meals Section */}
                  <div className="space-y-4">
                    <h4 className="font-heading font-semibold">Posiłki</h4>
                    {isLogLoading ? (
                      <div className="space-y-3">
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {dietPlan.meals
                          .sort((a, b) => a.orderIndex - b.orderIndex)
                          .map((meal, index) => (
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
                                className="text-sm font-normal cursor-pointer"
                              >
                                {meal.name}
                              </Label>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

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
