import { useState, useEffect } from "react";
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
import { Plus, Trash2, CalendarIcon, UtensilsCrossed, Apple, ChefHat, Pill } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation, useParams, Link } from "wouter";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { DietPlan, DietMeal, User, DietSupplement } from "@shared/schema";

const mealSchema = z.object({
  name: z.string().min(1, "Nazwa posiłku jest wymagana"),
  description: z.string().default(""),
  orderIndex: z.number(),
});

const planSchema = z.object({
  name: z.string().min(1, "Nazwa planu jest wymagana"),
  description: z.string().optional(),
  clientId: z.string().uuid().optional().nullable(),
  mode: z.enum(['macro_only', 'macro_with_meals', 'full_plan']),
  targetCalories: z.coerce.number().min(1, "Kalorie muszą być większe od 0"),
  targetProtein: z.coerce.number().min(1, "Białko musi być większe od 0"),
  targetFat: z.coerce.number().min(1, "Tłuszcze muszą być większe od 0"),
  targetCarbs: z.coerce.number().min(1, "Węglowodany muszą być większe od 0"),
  mealsPerDay: z.coerce.number().int().min(3, "Minimum 3 posiłki").max(6, "Maksimum 6 posiłków").optional(),
  recommendedProducts: z.string().optional(),
  status: z.enum(["draft", "active", "completed"]),
  startDate: z.date().optional().nullable(),
  endDate: z.date().optional().nullable(),
  meals: z.array(mealSchema).optional(),
}).refine((data) => {
  // For macro_with_meals and full_plan, mealsPerDay is required
  if ((data.mode === 'macro_with_meals' || data.mode === 'full_plan') && !data.mealsPerDay) {
    return false;
  }
  return true;
}, {
  message: "Liczba posiłków jest wymagana dla tego trybu",
  path: ["mealsPerDay"],
}).refine((data) => {
  // For full_plan, meals array is required with at least one meal
  if (data.mode === 'full_plan') {
    if (!data.meals || data.meals.length === 0) {
      return false;
    }
    // Check that all meals have names
    for (const meal of data.meals) {
      if (!meal.name || meal.name.trim() === '') {
        return false;
      }
    }
  }
  return true;
}, {
  message: "Dodaj przynajmniej jeden posiłek z nazwą dla pełnej rozpiski",
  path: ["meals"],
}).refine((data) => {
  // Check meals count doesn't exceed mealsPerDay
  if (data.meals && data.mealsPerDay && data.meals.length > data.mealsPerDay) {
    return false;
  }
  return true;
}, {
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

  // Supplements state and queries
  const [supplements, setSupplements] = useState<DietSupplement[]>([]);
  const [supplementForm, setSupplementForm] = useState({
    name: "",
    dose: "",
    unit: "mg",
    timing: "",
    frequency: "daily",
    notes: "",
    orderIndex: 0,
  });
  const [editingSupplementId, setEditingSupplementId] = useState<string | null>(null);

  // Sort supplements by timing (time of day)
  const sortedSupplements = [...supplements].sort((a, b) => {
    const timingOrder: Record<string, number> = {
      'rano': 1,
      'przed treningiem': 2,
      'z posiłkiem': 3,
      'pomiędzy posiłkami': 4,
      'po treningu': 5,
      'wieczór': 6,
    };
    const orderA = a.timing ? (timingOrder[a.timing] || 999) : 999;
    const orderB = b.timing ? (timingOrder[b.timing] || 999) : 999;
    return orderA - orderB;
  });

  const { data: existingSupplements, isLoading: isLoadingSupplements } = useQuery<DietSupplement[]>({
    queryKey: ["/api/diet-plans", id, "supplements"],
    enabled: isEdit && !!id,
  });

  const form = useForm<PlanFormData>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      name: "",
      description: "",
      clientId: null,
      mode: 'macro_only',
      targetCalories: 2000,
      targetProtein: 150,
      targetFat: 65,
      targetCarbs: 200,
      mealsPerDay: 5,
      recommendedProducts: "",
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
      mode: (existingPlan.mode || 'macro_only') as 'macro_only' | 'macro_with_meals' | 'full_plan',
      targetCalories: existingPlan.targetCalories,
      targetProtein: existingPlan.targetProtein,
      targetFat: existingPlan.targetFat,
      targetCarbs: existingPlan.targetCarbs,
      mealsPerDay: existingPlan.mealsPerDay,
      recommendedProducts: existingPlan.recommendedProducts || "",
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
      let planId = id;
      
      if (isEdit) {
        await apiRequest("PUT", `/api/diets/plans/${id}`, {
          name: data.name,
          description: data.description,
          clientId: data.clientId,
          mode: data.mode,
          targetCalories: data.targetCalories,
          targetProtein: data.targetProtein,
          targetFat: data.targetFat,
          targetCarbs: data.targetCarbs,
          mealsPerDay: data.mealsPerDay,
          recommendedProducts: data.recommendedProducts,
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
          mode: data.mode,
          targetCalories: data.targetCalories,
          targetProtein: data.targetProtein,
          targetFat: data.targetFat,
          targetCarbs: data.targetCarbs,
          mealsPerDay: data.mealsPerDay,
          recommendedProducts: data.recommendedProducts,
          status: data.status,
          startDate: data.startDate,
          endDate: data.endDate,
          meals: data.meals,
        });
        planId = result.id;
      }

      // Save supplements for all diet modes
      if (planId) {
        // Get existing supplements if editing
        const existingSups = isEdit ? existingSupplements || [] : [];
        
        // Delete removed supplements
        const existingIds = existingSups.map(s => s.id);
        const currentIds = supplements.map(s => s.id).filter(id => !id.startsWith('temp-'));
        const toDelete = existingIds.filter(id => !currentIds.includes(id));
        
        for (const suppId of toDelete) {
          await apiRequest("DELETE", `/api/diet-supplements/${suppId}`, { dietPlanId: planId });
        }
        
        // Sort supplements by timing and reassign orderIndex
        const timingOrder: Record<string, number> = {
          'rano': 1,
          'przed treningiem': 2,
          'z posiłkiem': 3,
          'pomiędzy posiłkami': 4,
          'po treningu': 5,
          'wieczór': 6,
        };
        const sortedForSave = [...supplements].sort((a, b) => {
          const orderA = a.timing ? (timingOrder[a.timing] || 999) : 999;
          const orderB = b.timing ? (timingOrder[b.timing] || 999) : 999;
          return orderA - orderB;
        });
        
        // Create or update supplements with correct orderIndex
        for (let i = 0; i < sortedForSave.length; i++) {
          const supplement = sortedForSave[i];
          if (supplement.id.startsWith('temp-')) {
            // Create new supplement
            await apiRequest("POST", `/api/diet-plans/${planId}/supplements`, {
              name: supplement.name,
              dose: supplement.dose,
              unit: supplement.unit,
              timing: supplement.timing,
              frequency: supplement.frequency,
              notes: supplement.notes,
              orderIndex: i,
            });
          } else {
            // Update existing supplement
            await apiRequest("PATCH", `/api/diet-supplements/${supplement.id}`, {
              dietPlanId: planId,
              name: supplement.name,
              dose: supplement.dose,
              unit: supplement.unit,
              timing: supplement.timing,
              frequency: supplement.frequency,
              notes: supplement.notes,
              orderIndex: i,
            });
          }
        }
      }
      
      return planId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/diets/plans"] });
      if (isEdit) {
        queryClient.invalidateQueries({ queryKey: ["/api/diets/plans", id] });
        queryClient.invalidateQueries({ queryKey: ["/api/diet-plans", id, "supplements"] });
      }
      toast({
        title: isEdit ? "Plan zaktualizowany" : "Plan utworzony",
        description: isEdit ? "Plan dietetyczny został zaktualizowany" : "Nowy plan dietetyczny został utworzony",
      });
      setLocation("/trainer/diets");
    },
    onError: (error: Error) => {
      console.error("Diet plan save error:", error);
      let errorMessage = "Nie udało się zapisać planu";
      
      // Try to extract more specific error message
      if (error.message) {
        if (error.message.includes("401")) {
          errorMessage = "Sesja wygasła. Zaloguj się ponownie.";
        } else if (error.message.includes("400")) {
          errorMessage = "Nieprawidłowe dane formularza. Sprawdź wszystkie pola.";
        } else if (error.message.includes("403")) {
          errorMessage = "Brak uprawnień do tej operacji.";
        } else {
          // Try to parse JSON error from response
          try {
            const match = error.message.match(/\d+:\s*(.+)/);
            if (match && match[1]) {
              const parsed = JSON.parse(match[1]);
              if (parsed.message) {
                errorMessage = parsed.message;
              }
            }
          } catch {
            // Keep default message
          }
        }
      }
      
      toast({
        title: "Błąd",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const addMeal = () => {
    const currentMeals = form.getValues("meals") || [];
    const mealsPerDay = form.getValues("mealsPerDay") || 5;
    
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
    const currentMeals = form.getValues("meals") || [];
    form.setValue(
      "meals",
      currentMeals.filter((_, i) => i !== mealIndex).map((meal, i) => ({ ...meal, orderIndex: i }))
    );
  };

  // Supplement management functions
  const addSupplement = () => {
    if (!supplementForm.name || !supplementForm.dose || !supplementForm.unit || !supplementForm.frequency) {
      toast({
        title: "Uzupełnij wymagane pola",
        description: "Nazwa, dawka, jednostka i częstotliwość są wymagane",
        variant: "destructive",
      });
      return;
    }

    const newSupplement = {
      ...supplementForm,
      id: editingSupplementId || `temp-${Date.now()}`,
      dietPlanId: id || "",
      orderIndex: supplements.length,
    } as DietSupplement;

    if (editingSupplementId) {
      setSupplements(supplements.map(s => s.id === editingSupplementId ? newSupplement : s));
      setEditingSupplementId(null);
    } else {
      setSupplements([...supplements, newSupplement]);
    }

    setSupplementForm({
      name: "",
      dose: "",
      unit: "mg",
      timing: "",
      frequency: "daily",
      notes: "",
      orderIndex: 0,
    });
  };

  const editSupplement = (supplement: DietSupplement) => {
    setSupplementForm({
      name: supplement.name,
      dose: supplement.dose,
      unit: supplement.unit,
      timing: supplement.timing || "",
      frequency: supplement.frequency,
      notes: supplement.notes || "",
      orderIndex: supplement.orderIndex,
    });
    setEditingSupplementId(supplement.id);
  };

  const removeSupplement = (supplementId: string) => {
    setSupplements(supplements.filter(s => s.id !== supplementId));
    if (editingSupplementId === supplementId) {
      setEditingSupplementId(null);
      setSupplementForm({
        name: "",
        dose: "",
        unit: "mg",
        timing: "",
        frequency: "daily",
        notes: "",
        orderIndex: 0,
      });
    }
  };

  // Sync supplements from query when editing
  useEffect(() => {
    if (existingSupplements) {
      setSupplements(existingSupplements);
    }
  }, [existingSupplements]);

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
        <form onSubmit={form.handleSubmit(
          (data) => {
            console.log("[DIET FORM] Submitting data:", data);
            createPlanMutation.mutate(data);
          },
          (errors) => {
            console.error("[DIET FORM] Validation errors:", errors);
          }
        )} className="space-y-6">
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
                name="mode"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Tryb diety</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="grid grid-cols-1 md:grid-cols-3 gap-4"
                        data-testid="radio-diet-mode"
                      >
                        <label 
                          htmlFor="macro_only" 
                          onClick={() => field.onChange("macro_only")}
                          className="flex items-start space-x-3 border rounded-md p-4 hover-elevate cursor-pointer"
                        >
                          <RadioGroupItem value="macro_only" id="macro_only" data-testid="radio-mode-macro-only" className="mt-1" />
                          <span className="flex-1 flex flex-col">
                            <span className="font-medium flex items-center gap-2">
                              <Apple className="w-4 h-4" />
                              Tylko makro
                            </span>
                            <span className="text-sm text-muted-foreground mt-1">
                              Wyłącznie cele kaloryczne i makroskładniki
                            </span>
                          </span>
                        </label>
                        <label 
                          htmlFor="macro_with_meals" 
                          onClick={() => field.onChange("macro_with_meals")}
                          className="flex items-start space-x-3 border rounded-md p-4 hover-elevate cursor-pointer"
                        >
                          <RadioGroupItem value="macro_with_meals" id="macro_with_meals" data-testid="radio-mode-macro-with-meals" className="mt-1" />
                          <span className="flex-1 flex flex-col">
                            <span className="font-medium flex items-center gap-2">
                              <UtensilsCrossed className="w-4 h-4" />
                              Makro z posiłkami
                            </span>
                            <span className="text-sm text-muted-foreground mt-1">
                              Cele + liczba posiłków bez szczegółowych przepisów
                            </span>
                          </span>
                        </label>
                        <label 
                          htmlFor="full_plan" 
                          onClick={() => field.onChange("full_plan")}
                          className="flex items-start space-x-3 border rounded-md p-4 hover-elevate cursor-pointer"
                        >
                          <RadioGroupItem value="full_plan" id="full_plan" data-testid="radio-mode-full-plan" className="mt-1" />
                          <span className="flex-1 flex flex-col">
                            <span className="font-medium flex items-center gap-2">
                              <ChefHat className="w-4 h-4" />
                              Pełna rozpiska
                            </span>
                            <span className="text-sm text-muted-foreground mt-1">
                              Szczegółowy plan żywienia z opisami posiłków
                            </span>
                          </span>
                        </label>
                      </RadioGroup>
                    </FormControl>
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

              {(form.watch("mode") === 'macro_with_meals' || form.watch("mode") === 'full_plan') && (
                <FormField
                  control={form.control}
                  name="mealsPerDay"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Liczba posiłków dziennie</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value?.toString() || "5"}
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
                      <FormDescription>
                        {form.watch("mode") === 'macro_with_meals' 
                          ? "Liczba posiłków bez szczegółowych przepisów"
                          : "Liczba posiłków w szczegółowym planie"
                        }
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {form.watch("mode") === 'macro_with_meals' && (
                <FormField
                  control={form.control}
                  name="recommendedProducts"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lista polecanych produktów</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="np. kurczak, ryż, brokuły, jajka, owoce, orzechy, jogurt naturalny, awokado..."
                          className="resize-none min-h-[120px]"
                          {...field}
                          data-testid="textarea-recommended-products"
                        />
                      </FormControl>
                      <FormDescription>
                        Wpisz polecane produkty oddzielone przecinkami
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
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
            <CardHeader>
              <div className="flex items-center gap-2">
                <Pill className="w-5 h-5" />
                <CardTitle className="font-heading">Suplementacja</CardTitle>
              </div>
              <CardDescription>Dodaj suplementy z dawkowaniem i częstotliwością</CardDescription>
            </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="supplement-name">Nazwa suplementu *</Label>
                    <Input
                      id="supplement-name"
                      placeholder="np. Witamina D3"
                      value={supplementForm.name}
                      onChange={(e) => setSupplementForm({ ...supplementForm, name: e.target.value })}
                      data-testid="input-supplement-name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="supplement-dose">Dawka *</Label>
                    <Input
                      id="supplement-dose"
                      placeholder="np. 2000 lub 10-20"
                      value={supplementForm.dose}
                      onChange={(e) => setSupplementForm({ ...supplementForm, dose: e.target.value })}
                      data-testid="input-supplement-dose"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="supplement-unit">Jednostka *</Label>
                    <Select
                      value={supplementForm.unit}
                      onValueChange={(value) => setSupplementForm({ ...supplementForm, unit: value })}
                    >
                      <SelectTrigger id="supplement-unit" data-testid="select-supplement-unit">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mg">mg</SelectItem>
                        <SelectItem value="mcg">mcg</SelectItem>
                        <SelectItem value="μg">μg</SelectItem>
                        <SelectItem value="IU">IU</SelectItem>
                        <SelectItem value="ml">ml</SelectItem>
                        <SelectItem value="g">g</SelectItem>
                        <SelectItem value="tabletki">tabletki</SelectItem>
                        <SelectItem value="kapsułki">kapsułki</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="supplement-timing">Pora zażywania</Label>
                    <Select
                      value={supplementForm.timing}
                      onValueChange={(value) => setSupplementForm({ ...supplementForm, timing: value })}
                    >
                      <SelectTrigger id="supplement-timing" data-testid="select-supplement-timing">
                        <SelectValue placeholder="Wybierz porę" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rano">Rano</SelectItem>
                        <SelectItem value="wieczór">Wieczór</SelectItem>
                        <SelectItem value="przed treningiem">Przed treningiem</SelectItem>
                        <SelectItem value="po treningu">Po treningu</SelectItem>
                        <SelectItem value="z posiłkiem">Z posiłkiem</SelectItem>
                        <SelectItem value="pomiędzy posiłkami">Pomiędzy posiłkami</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="supplement-frequency">Częstotliwość *</Label>
                    <Select
                      value={supplementForm.frequency}
                      onValueChange={(value) => setSupplementForm({ ...supplementForm, frequency: value })}
                    >
                      <SelectTrigger id="supplement-frequency" data-testid="select-supplement-frequency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Codziennie</SelectItem>
                        <SelectItem value="e2d">Co 2 dni</SelectItem>
                        <SelectItem value="e3d">Co 3 dni</SelectItem>
                        <SelectItem value="weekly">Raz w tygodniu</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 md:col-span-2 lg:col-span-3">
                    <Label htmlFor="supplement-notes">Notatki (opcjonalne)</Label>
                    <Textarea
                      id="supplement-notes"
                      placeholder="Dodatkowe informacje o suplementie"
                      value={supplementForm.notes}
                      onChange={(e) => setSupplementForm({ ...supplementForm, notes: e.target.value })}
                      data-testid="textarea-supplement-notes"
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={addSupplement}
                  variant={editingSupplementId ? "default" : "outline"}
                  data-testid="button-add-supplement"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {editingSupplementId ? "Aktualizuj suplement" : "Dodaj suplement"}
                </Button>

                {supplements.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium">Dodane suplementy ({supplements.length})</h4>
                    <div className="space-y-2">
                      {sortedSupplements.map((supplement, index) => (
                        <Card key={supplement.id} data-testid={`card-supplement-${index}`}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium">{supplement.name}</span>
                                  <span className="text-sm text-muted-foreground">
                                    {supplement.dose} {supplement.unit}
                                  </span>
                                  <span className={cn(
                                    "text-xs px-2 py-0.5 rounded-full",
                                    supplement.frequency === "daily" && "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
                                    supplement.frequency === "e2d" && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
                                    supplement.frequency === "e3d" && "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
                                    supplement.frequency === "weekly" && "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100"
                                  )}>
                                    {supplement.frequency === "daily" && "Codziennie"}
                                    {supplement.frequency === "e2d" && "Co 2 dni"}
                                    {supplement.frequency === "e3d" && "Co 3 dni"}
                                    {supplement.frequency === "weekly" && "Raz w tygodniu"}
                                  </span>
                                </div>
                                {supplement.timing && (
                                  <p className="text-sm text-muted-foreground">
                                    Pora: {supplement.timing}
                                  </p>
                                )}
                                {supplement.notes && (
                                  <p className="text-sm text-muted-foreground">
                                    {supplement.notes}
                                  </p>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={() => editSupplement(supplement)}
                                  data-testid={`button-edit-supplement-${index}`}
                                >
                                  <Plus className="w-4 h-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={() => removeSupplement(supplement.id)}
                                  data-testid={`button-remove-supplement-${index}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

          {form.watch("mode") === 'full_plan' && (
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
                  disabled={(form.watch("meals")?.length || 0) >= (form.watch("mealsPerDay") || 6)}
                  data-testid="button-add-meal"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Dodaj posiłek
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {form.watch("meals")?.map((_, mealIndex) => (
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
                        disabled={(form.watch("meals")?.length || 0) === 1}
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
          )}

          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={createPlanMutation.isPending}
              data-testid="button-save-diet-plan"
              onClick={() => {
                console.log("[DIET FORM] Button clicked!");
                console.log("[DIET FORM] Form values:", form.getValues());
                console.log("[DIET FORM] Form errors:", form.formState.errors);
                console.log("[DIET FORM] Form isValid:", form.formState.isValid);
              }}
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
