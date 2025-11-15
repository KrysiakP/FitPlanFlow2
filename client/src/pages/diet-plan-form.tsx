import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Plus, Trash2, CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation, useParams, Link } from "wouter";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { DietPlan, DietMeal, User } from "@shared/schema";

const mealSchema = z.object({
  name: z.string().min(1, "Nazwa posiłku jest wymagana"),
  description: z.string().min(1, "Opis posiłku jest wymagany"),
  orderIndex: z.number(),
});

const planSchema = z.object({
  name: z.string().min(1, "Nazwa planu jest wymagana"),
  description: z.string().optional(),
  clientId: z.string().uuid().optional().nullable(),
  targetCalories: z.coerce.number().min(1, "Kalorie muszą być większe od 0"),
  targetProtein: z.coerce.number().min(1, "Białko musi być większe od 0"),
  targetFat: z.coerce.number().min(1, "Tłuszcze muszą być większe od 0"),
  targetCarbs: z.coerce.number().min(1, "Węglowodany muszą być większe od 0"),
  mealsPerDay: z.coerce.number().int().min(3, "Minimum 3 posiłki").max(6, "Maksimum 6 posiłków"),
  status: z.enum(["draft", "active", "completed"]),
  startDate: z.date().optional().nullable(),
  endDate: z.date().optional().nullable(),
  meals: z.array(mealSchema).min(1, "Dodaj przynajmniej jeden posiłek"),
}).refine((data) => data.meals.length <= data.mealsPerDay, {
  message: "Liczba posiłków nie może przekraczać liczby posiłków dziennie",
  path: ["meals"],
});

type PlanFormData = z.infer<typeof planSchema>;

type DietPlanWithMeals = DietPlan & {
  meals: DietMeal[];
};

export default function DietPlanForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: existingPlan, isLoading: isLoadingPlan } = useQuery<DietPlanWithMeals>({
    queryKey: ["/api/diets/plans", id],
    enabled: isEdit,
  });

  const { data: clients, isLoading: isLoadingClients } = useQuery<User[]>({
    queryKey: ["/api/trainer/clients"],
  });

  const form = useForm<PlanFormData>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      name: "",
      description: "",
      clientId: null,
      targetCalories: 2000,
      targetProtein: 150,
      targetFat: 65,
      targetCarbs: 200,
      mealsPerDay: 5,
      status: "draft",
      startDate: null,
      endDate: null,
      meals: [
        { name: "Śniadanie", description: "", orderIndex: 0 },
        { name: "Drugie śniadanie", description: "", orderIndex: 1 },
        { name: "Obiad", description: "", orderIndex: 2 },
        { name: "Podwieczorek", description: "", orderIndex: 3 },
        { name: "Kolacja", description: "", orderIndex: 4 },
      ],
    },
    values: existingPlan ? {
      name: existingPlan.name,
      description: existingPlan.description || "",
      clientId: existingPlan.clientId || null,
      targetCalories: existingPlan.targetCalories,
      targetProtein: existingPlan.targetProtein,
      targetFat: existingPlan.targetFat,
      targetCarbs: existingPlan.targetCarbs,
      mealsPerDay: existingPlan.mealsPerDay,
      status: existingPlan.status as "draft" | "active" | "completed",
      startDate: existingPlan.startDate ? new Date(existingPlan.startDate) : null,
      endDate: existingPlan.endDate ? new Date(existingPlan.endDate) : null,
      meals: existingPlan.meals.map((meal) => ({
        name: meal.name,
        description: meal.description,
        orderIndex: meal.orderIndex,
      })),
    } : undefined,
  });

  const createPlanMutation = useMutation({
    mutationFn: async (data: PlanFormData) => {
      if (isEdit) {
        await apiRequest("PUT", `/api/diets/plans/${id}`, {
          name: data.name,
          description: data.description,
          clientId: data.clientId,
          targetCalories: data.targetCalories,
          targetProtein: data.targetProtein,
          targetFat: data.targetFat,
          targetCarbs: data.targetCarbs,
          mealsPerDay: data.mealsPerDay,
          status: data.status,
          startDate: data.startDate,
          endDate: data.endDate,
          meals: data.meals,
        });
      } else {
        const result = await apiRequest("POST", "/api/diets/plans", {
          name: data.name,
          description: data.description,
          clientId: data.clientId,
          targetCalories: data.targetCalories,
          targetProtein: data.targetProtein,
          targetFat: data.targetFat,
          targetCarbs: data.targetCarbs,
          mealsPerDay: data.mealsPerDay,
          status: data.status,
          startDate: data.startDate,
          endDate: data.endDate,
          meals: data.meals,
        });
        return result;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/diets/plans"] });
      if (isEdit) {
        queryClient.invalidateQueries({ queryKey: ["/api/diets/plans", id] });
      }
      toast({
        title: isEdit ? "Plan zaktualizowany" : "Plan utworzony",
        description: isEdit ? "Plan dietetyczny został zaktualizowany" : "Nowy plan dietetyczny został utworzony",
      });
      setLocation("/trainer/diets");
    },
    onError: () => {
      toast({
        title: "Błąd",
        description: "Nie udało się zapisać planu",
        variant: "destructive",
      });
    },
  });

  const addMeal = () => {
    const currentMeals = form.getValues("meals");
    const mealsPerDay = form.getValues("mealsPerDay");
    
    if (currentMeals.length >= mealsPerDay) {
      toast({
        title: "Maksymalna liczba posiłków",
        description: `Możesz dodać maksymalnie ${mealsPerDay} posiłków`,
        variant: "destructive",
      });
      return;
    }

    form.setValue("meals", [
      ...currentMeals,
      { name: "", description: "", orderIndex: currentMeals.length },
    ]);
  };

  const removeMeal = (mealIndex: number) => {
    const currentMeals = form.getValues("meals");
    form.setValue(
      "meals",
      currentMeals.filter((_, i) => i !== mealIndex).map((meal, i) => ({ ...meal, orderIndex: i }))
    );
  };

  if (isEdit && isLoadingPlan) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="font-heading font-bold text-4xl mb-2" data-testid="text-form-title">
          {isEdit ? "Edytuj plan dietetyczny" : "Utwórz plan dietetyczny"}
        </h1>
        <p className="text-muted-foreground">
          {isEdit ? "Zaktualizuj szczegóły planu dietetycznego" : "Stwórz nowy plan dietetyczny dla swoich podopiecznych"}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => createPlanMutation.mutate(data))} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-heading">Podstawowe informacje</CardTitle>
              <CardDescription>Podaj nazwę i opis planu dietetycznego</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nazwa planu</FormLabel>
                    <FormControl>
                      <Input placeholder="np. Plan odchudzający 2000 kcal" {...field} data-testid="input-plan-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Opis (opcjonalnie)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Opisz cel i zakres planu dietetycznego"
                        {...field}
                        data-testid="textarea-plan-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Podopieczny (opcjonalnie)</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value === "none" ? null : value)}
                      value={field.value || "none"}
                      disabled={isLoadingClients}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-client">
                          <SelectValue placeholder="Wybierz podopiecznego lub zostaw pusty dla szkicu" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Brak (szkic)</SelectItem>
                        {clients?.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.firstName} {client.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Możesz przypisać plan do konkretnego podopiecznego lub zostawić jako szkic
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Status</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex gap-4"
                        data-testid="radio-status"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="draft" id="draft" data-testid="radio-status-draft" />
                          <Label htmlFor="draft" className="cursor-pointer">Szkic</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="active" id="active" data-testid="radio-status-active" />
                          <Label htmlFor="active" className="cursor-pointer">Aktywny</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="completed" id="completed" data-testid="radio-status-completed" />
                          <Label htmlFor="completed" className="cursor-pointer">Zakończony</Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-heading">Makroskładniki docelowe</CardTitle>
              <CardDescription>Określ cele żywieniowe</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="targetCalories"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kalorie (kcal)</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" {...field} data-testid="input-target-calories" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="targetProtein"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Białko (g)</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" {...field} data-testid="input-target-protein" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="targetFat"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tłuszcze (g)</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" {...field} data-testid="input-target-fat" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="targetCarbs"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Węglowodany (g)</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" {...field} data-testid="input-target-carbs" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="mealsPerDay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Liczba posiłków dziennie</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      value={field.value.toString()}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-meals-per-day">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="3">3 posiłki</SelectItem>
                        <SelectItem value="4">4 posiłki</SelectItem>
                        <SelectItem value="5">5 posiłków</SelectItem>
                        <SelectItem value="6">6 posiłków</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-heading">Okres trwania (opcjonalnie)</CardTitle>
              <CardDescription>Określ daty rozpoczęcia i zakończenia planu</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data rozpoczęcia</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                              data-testid="datepicker-start-date"
                            >
                              {field.value ? (
                                format(field.value, "PPP", { locale: pl })
                              ) : (
                                <span>Wybierz datę</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value || undefined}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data zakończenia</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                              data-testid="datepicker-end-date"
                            >
                              {field.value ? (
                                format(field.value, "PPP", { locale: pl })
                              ) : (
                                <span>Wybierz datę</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value || undefined}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 gap-4">
              <div>
                <CardTitle className="font-heading">Posiłki</CardTitle>
                <CardDescription>Zdefiniuj posiłki w planie</CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={addMeal}
                disabled={form.watch("meals").length >= form.watch("mealsPerDay")}
                data-testid="button-add-meal"
              >
                <Plus className="w-4 h-4 mr-2" />
                Dodaj posiłek
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {form.watch("meals").map((_, mealIndex) => (
                <Card key={mealIndex} data-testid={`card-meal-${mealIndex}`}>
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-12 h-9 flex items-center justify-center bg-muted rounded-md font-medium">
                        {mealIndex + 1}
                      </div>
                      <div className="flex-1 space-y-4">
                        <FormField
                          control={form.control}
                          name={`meals.${mealIndex}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nazwa posiłku</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="np. Śniadanie"
                                  {...field}
                                  data-testid={`input-meal-name-${mealIndex}`}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`meals.${mealIndex}.description`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Opis posiłku</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Składniki i wskazówki dotyczące przygotowania"
                                  {...field}
                                  data-testid={`textarea-meal-description-${mealIndex}`}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removeMeal(mealIndex)}
                        disabled={form.watch("meals").length === 1}
                        data-testid={`button-remove-meal-${mealIndex}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {form.formState.errors.meals && !Array.isArray(form.formState.errors.meals) && (
                <p className="text-sm font-medium text-destructive">
                  {form.formState.errors.meals.message}
                </p>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={createPlanMutation.isPending}
              data-testid="button-save-diet-plan"
            >
              {createPlanMutation.isPending ? "Zapisywanie..." : isEdit ? "Zapisz zmiany" : "Utwórz plan"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocation("/trainer/diets")}
              data-testid="button-cancel-diet-plan"
            >
              Anuluj
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
