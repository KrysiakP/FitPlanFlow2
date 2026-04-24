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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, CalendarIcon, Apple, ChefHat, Pill, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation, useParams } from "wouter";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { DietPlan, DietMeal, User, DietSupplement } from "@shared/schema";

const mealSchema = z.object({
  name: z.string().min(1, "Nazwa posiłku jest wymagana"),
  description: z.string().default(""),
  dayOfWeek: z.number().min(1).max(7),
  orderIndex: z.number(),
  suggestedTime: z.string().optional(),
  calories: z.coerce.number().min(0).optional(),
  protein: z.coerce.number().min(0).optional(),
  fat: z.coerce.number().min(0).optional(),
  carbs: z.coerce.number().min(0).optional(),
});

const planSchema = z.object({
  name: z.string().min(1, "Nazwa planu jest wymagana"),
  description: z.string().optional(),
  clientId: z.string().uuid().optional().nullable(),
  mode: z.enum(['macro_only', 'full_plan']),
  targetCalories: z.coerce.number().min(1, "Kalorie muszą być większe od 0"),
  targetProtein: z.coerce.number().min(1, "Białko musi być większe od 0"),
  targetFat: z.coerce.number().min(1, "Tłuszcze muszą być większe od 0"),
  targetCarbs: z.coerce.number().min(1, "Węglowodany muszą być większe od 0"),
  mealsPerDay: z.coerce.number().int().min(1).max(10).optional(),
  recommendedProducts: z.string().optional(),
  status: z.enum(["active"]).default("active"),
  startDate: z.date().optional().nullable(),
  endDate: z.date().optional().nullable(),
});

type PlanFormData = z.infer<typeof planSchema>;
type MealFormData = z.infer<typeof mealSchema>;

type DietPlanWithMeals = DietPlan & {
  meals: DietMeal[];
};

interface WeeklyMeals {
  [dayOfWeek: number]: MealFormData[];
}

const DAYS_OF_WEEK = [
  { value: 1, label: "Poniedziałek", short: "Pn" },
  { value: 2, label: "Wtorek", short: "Wt" },
  { value: 3, label: "Środa", short: "Śr" },
  { value: 4, label: "Czwartek", short: "Cz" },
  { value: 5, label: "Piątek", short: "Pt" },
  { value: 6, label: "Sobota", short: "So" },
  { value: 7, label: "Niedziela", short: "Nd" },
];

export default function DietPlanForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeDay, setActiveDay] = useState("1");
  
  // Macro percentages state
  const [proteinPercent, setProteinPercent] = useState(30);
  const [fatPercent, setFatPercent] = useState(25);
  const [carbsPercent, setCarbsPercent] = useState(45);

  const { data: existingPlan, isLoading: isLoadingPlan } = useQuery<DietPlanWithMeals>({
    queryKey: ["/api/diets/plans", id],
    enabled: isEdit,
  });

  const { data: clients, isLoading: isLoadingClients } = useQuery<User[]>({
    queryKey: ["/api/trainer/clients"],
  });

  const [weeklyMeals, setWeeklyMeals] = useState<WeeklyMeals>(() => {
    const initial: WeeklyMeals = {};
    for (let i = 1; i <= 7; i++) {
      initial[i] = [];
    }
    return initial;
  });

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

  const { data: existingSupplements } = useQuery<DietSupplement[]>({
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
      targetProtein: 150, // 30% of 2000 kcal / 4 kcal per gram
      targetFat: 56, // 25% of 2000 kcal / 9 kcal per gram
      targetCarbs: 225, // 45% of 2000 kcal / 4 kcal per gram
      mealsPerDay: 5,
      recommendedProducts: "",
      status: "active",
      startDate: null,
      endDate: null,
    },
  });

  // Calculate grams from percentage and calories
  const calculateGramsFromPercent = (calories: number, percent: number, kcalPerGram: number) => {
    return Math.round((calories * (percent / 100)) / kcalPerGram);
  };

  // Calculate percentage from grams and calories
  const calculatePercentFromGrams = (calories: number, grams: number, kcalPerGram: number) => {
    if (calories <= 0) return 0;
    return Math.round((grams * kcalPerGram / calories) * 100);
  };

  // Handle percentage change - update grams
  const handlePercentChange = (macro: 'protein' | 'fat' | 'carbs', percent: number) => {
    const calories = form.getValues('targetCalories') || 0;
    const kcalPerGram = macro === 'fat' ? 9 : 4;
    const grams = calculateGramsFromPercent(calories, percent, kcalPerGram);
    
    if (macro === 'protein') {
      setProteinPercent(percent);
      form.setValue('targetProtein', grams);
    } else if (macro === 'fat') {
      setFatPercent(percent);
      form.setValue('targetFat', grams);
    } else {
      setCarbsPercent(percent);
      form.setValue('targetCarbs', grams);
    }
  };

  // Handle grams change - update percentage
  const handleGramsChange = (macro: 'protein' | 'fat' | 'carbs', grams: number) => {
    const calories = form.getValues('targetCalories') || 0;
    const kcalPerGram = macro === 'fat' ? 9 : 4;
    const percent = calculatePercentFromGrams(calories, grams, kcalPerGram);
    
    if (macro === 'protein') {
      setProteinPercent(percent);
    } else if (macro === 'fat') {
      setFatPercent(percent);
    } else {
      setCarbsPercent(percent);
    }
  };

  // Handle calories change - recalculate all grams based on current percentages
  const handleCaloriesChange = (calories: number) => {
    form.setValue('targetCalories', calories);
    form.setValue('targetProtein', calculateGramsFromPercent(calories, proteinPercent, 4));
    form.setValue('targetFat', calculateGramsFromPercent(calories, fatPercent, 9));
    form.setValue('targetCarbs', calculateGramsFromPercent(calories, carbsPercent, 4));
  };

  const totalPercent = proteinPercent + fatPercent + carbsPercent;
  // Allow 1% tolerance for rounding errors (99-101%)
  const isPercentValid = totalPercent >= 99 && totalPercent <= 101;

  useEffect(() => {
    if (existingPlan) {
      // Calculate percentages from existing grams
      const calories = existingPlan.targetCalories || 2000;
      const pPercent = calculatePercentFromGrams(calories, existingPlan.targetProtein, 4);
      const fPercent = calculatePercentFromGrams(calories, existingPlan.targetFat, 9);
      const cPercent = calculatePercentFromGrams(calories, existingPlan.targetCarbs, 4);
      
      setProteinPercent(pPercent);
      setFatPercent(fPercent);
      setCarbsPercent(cPercent);

      form.reset({
        name: existingPlan.name,
        description: existingPlan.description || "",
        clientId: existingPlan.clientId || null,
        mode: existingPlan.mode === 'macro_only' ? 'macro_only' : 'full_plan',
        targetCalories: existingPlan.targetCalories,
        targetProtein: existingPlan.targetProtein,
        targetFat: existingPlan.targetFat,
        targetCarbs: existingPlan.targetCarbs,
        mealsPerDay: existingPlan.mealsPerDay,
        recommendedProducts: existingPlan.recommendedProducts || "",
        status: "active",
        startDate: existingPlan.startDate ? new Date(existingPlan.startDate) : null,
        endDate: existingPlan.endDate ? new Date(existingPlan.endDate) : null,
      });

      if (existingPlan.meals && existingPlan.meals.length > 0) {
        const mealsGrouped: WeeklyMeals = {};
        for (let i = 1; i <= 7; i++) {
          mealsGrouped[i] = [];
        }
        existingPlan.meals.forEach((meal) => {
          const day = meal.dayOfWeek || 1;
          if (!mealsGrouped[day]) mealsGrouped[day] = [];
          mealsGrouped[day].push({
            name: meal.name,
            description: meal.description || "",
            dayOfWeek: day,
            orderIndex: meal.orderIndex,
            suggestedTime: meal.suggestedTime || "",
            calories: meal.calories || 0,
            protein: meal.protein || 0,
            fat: meal.fat || 0,
            carbs: meal.carbs || 0,
          });
        });
        for (let i = 1; i <= 7; i++) {
          mealsGrouped[i].sort((a, b) => a.orderIndex - b.orderIndex);
        }
        setWeeklyMeals(mealsGrouped);
      }
    }
  }, [existingPlan, form]);

  useEffect(() => {
    if (existingSupplements) {
      setSupplements(existingSupplements);
    }
  }, [existingSupplements]);

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
          mealsPerDay: data.mealsPerDay || 5,
          recommendedProducts: data.recommendedProducts,
          status: data.status,
          startDate: data.startDate,
          endDate: data.endDate,
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
          mealsPerDay: data.mealsPerDay || 5,
          recommendedProducts: data.recommendedProducts,
          status: data.status,
          startDate: data.startDate,
          endDate: data.endDate,
        });
        planId = result.id;
      }

      if (planId && data.mode === 'full_plan') {
        await apiRequest("DELETE", `/api/diets/plans/${planId}/meals`);
        
        for (let dayOfWeek = 1; dayOfWeek <= 7; dayOfWeek++) {
          const dayMeals = weeklyMeals[dayOfWeek] || [];
          for (let i = 0; i < dayMeals.length; i++) {
            const meal = dayMeals[i];
            await apiRequest("POST", `/api/diets/plans/${planId}/meals`, {
              dayOfWeek,
              orderIndex: i + 1,
              name: meal.name,
              description: meal.description || "",
              suggestedTime: meal.suggestedTime || null,
              calories: meal.calories || null,
              protein: meal.protein || null,
              fat: meal.fat || null,
              carbs: meal.carbs || null,
            });
          }
        }
      }

      if (planId) {
        const existingSups = isEdit ? existingSupplements || [] : [];
        
        const existingIds = existingSups.map(s => s.id);
        const currentIds = supplements.map(s => s.id).filter(id => !id.startsWith('temp-'));
        const toDelete = existingIds.filter(id => !currentIds.includes(id));
        
        for (const suppId of toDelete) {
          await apiRequest("DELETE", `/api/diet-supplements/${suppId}`, { dietPlanId: planId });
        }
        
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
        
        for (let i = 0; i < sortedForSave.length; i++) {
          const supplement = sortedForSave[i];
          if (supplement.id.startsWith('temp-')) {
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
      
      if (error.message) {
        if (error.message.includes("401")) {
          errorMessage = "Sesja wygasła. Zaloguj się ponownie.";
        } else if (error.message.includes("400")) {
          errorMessage = "Nieprawidłowe dane formularza. Sprawdź wszystkie pola.";
        } else if (error.message.includes("403")) {
          errorMessage = "Brak uprawnień do tej operacji.";
        }
      }
      
      toast({
        title: "Błąd",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const addMealToDay = (dayOfWeek: number) => {
    setWeeklyMeals(prev => ({
      ...prev,
      [dayOfWeek]: [
        ...prev[dayOfWeek],
        {
          name: "",
          description: "",
          dayOfWeek,
          orderIndex: prev[dayOfWeek].length + 1,
          suggestedTime: "",
          calories: 0,
          protein: 0,
          fat: 0,
          carbs: 0,
        },
      ],
    }));
  };

  const removeMealFromDay = (dayOfWeek: number, mealIndex: number) => {
    setWeeklyMeals(prev => ({
      ...prev,
      [dayOfWeek]: prev[dayOfWeek]
        .filter((_, i) => i !== mealIndex)
        .map((meal, i) => ({ ...meal, orderIndex: i + 1 })),
    }));
  };

  const updateMeal = (dayOfWeek: number, mealIndex: number, field: keyof MealFormData, value: string | number) => {
    setWeeklyMeals(prev => ({
      ...prev,
      [dayOfWeek]: prev[dayOfWeek].map((meal, i) => 
        i === mealIndex ? { ...meal, [field]: value } : meal
      ),
    }));
  };

  const getDayMacroTotals = (dayOfWeek: number) => {
    const meals = weeklyMeals[dayOfWeek] || [];
    return meals.reduce((acc, meal) => ({
      calories: acc.calories + (meal.calories || 0),
      protein: acc.protein + (meal.protein || 0),
      fat: acc.fat + (meal.fat || 0),
      carbs: acc.carbs + (meal.carbs || 0),
    }), { calories: 0, protein: 0, fat: 0, carbs: 0 });
  };

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
            if (!isPercentValid) {
              toast({
                title: "Nieprawidłowe makroskładniki",
                description: "Suma procentów makroskładników musi wynosić około 100% (dopuszczalne 99-101%)",
                variant: "destructive",
              });
              return;
            }
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
                        className="grid grid-cols-1 md:grid-cols-2 gap-4"
                        data-testid="radio-diet-mode"
                      >
                        <label 
                          htmlFor="macro_only" 
                          className={`flex items-start space-x-3 border rounded-md p-4 cursor-pointer transition-colors ${
                            field.value === "macro_only"
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50 hover:bg-muted/50"
                          }`}
                        >
                          <RadioGroupItem value="macro_only" id="macro_only" data-testid="radio-mode-macro-only" className="mt-1" />
                          <span className="flex-1 flex flex-col">
                            <span className="font-medium flex items-center gap-2">
                              <Apple className="w-4 h-4" />
                              Tylko makro + suplementy
                            </span>
                            <span className="text-sm text-muted-foreground mt-1">
                              Wyłącznie cele kaloryczne, makroskładniki i suplementacja
                            </span>
                          </span>
                        </label>
                        <label 
                          htmlFor="full_plan" 
                          className={`flex items-start space-x-3 border rounded-md p-4 cursor-pointer transition-colors ${
                            field.value === "full_plan"
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50 hover:bg-muted/50"
                          }`}
                        >
                          <RadioGroupItem value="full_plan" id="full_plan" data-testid="radio-mode-full-plan" className="mt-1" />
                          <span className="flex-1 flex flex-col">
                            <span className="font-medium flex items-center gap-2">
                              <ChefHat className="w-4 h-4" />
                              Pełna rozpiska tygodniowa
                            </span>
                            <span className="text-sm text-muted-foreground mt-1">
                              Szczegółowy plan żywienia z posiłkami na każdy dzień tygodnia
                            </span>
                          </span>
                        </label>
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
              <CardDescription>Określ cele żywieniowe - suma procentów musi wynosić 100%</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Calories Row */}
              <div className="flex items-center gap-4 flex-wrap">
                <Label className="w-28 font-medium">Zapotrzebowanie</Label>
                <FormField
                  control={form.control}
                  name="targetCalories"
                  render={({ field }) => (
                    <FormItem className="flex-1 min-w-[100px]">
                      <FormControl>
                        <Input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, '');
                            field.onChange(val === '' ? '' : Number(val));
                            if (val !== '') handleCaloriesChange(Number(val));
                          }}
                          data-testid="input-target-calories"
                          className="text-center font-medium"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <span className="text-muted-foreground">kcal</span>
              </div>

              {/* Protein Row */}
              <div className="flex items-center gap-4 flex-wrap">
                <Label className="w-28 font-medium">Białko</Label>
                <FormField
                  control={form.control}
                  name="targetProtein"
                  render={({ field }) => (
                    <FormItem className="flex-1 min-w-[80px]">
                      <FormControl>
                        <Input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, '');
                            const grams = val === '' ? 0 : Number(val);
                            field.onChange(val === '' ? '' : grams);
                            handleGramsChange('protein', grams);
                          }}
                          data-testid="input-target-protein"
                          className="text-center font-medium"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <span className="text-muted-foreground">g</span>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={proteinPercent || ''}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    handlePercentChange('protein', val === '' ? 0 : Number(val));
                  }}
                  data-testid="input-protein-percent"
                  className="w-20 text-center font-medium"
                />
                <span className="text-muted-foreground">%</span>
              </div>

              {/* Fat Row */}
              <div className="flex items-center gap-4 flex-wrap">
                <Label className="w-28 font-medium">Tłuszcze</Label>
                <FormField
                  control={form.control}
                  name="targetFat"
                  render={({ field }) => (
                    <FormItem className="flex-1 min-w-[80px]">
                      <FormControl>
                        <Input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, '');
                            const grams = val === '' ? 0 : Number(val);
                            field.onChange(val === '' ? '' : grams);
                            handleGramsChange('fat', grams);
                          }}
                          data-testid="input-target-fat"
                          className="text-center font-medium"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <span className="text-muted-foreground">g</span>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={fatPercent || ''}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    handlePercentChange('fat', val === '' ? 0 : Number(val));
                  }}
                  data-testid="input-fat-percent"
                  className="w-20 text-center font-medium"
                />
                <span className="text-muted-foreground">%</span>
              </div>

              {/* Carbs Row */}
              <div className="flex items-center gap-4 flex-wrap">
                <Label className="w-28 font-medium">Węglowodany</Label>
                <FormField
                  control={form.control}
                  name="targetCarbs"
                  render={({ field }) => (
                    <FormItem className="flex-1 min-w-[80px]">
                      <FormControl>
                        <Input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, '');
                            const grams = val === '' ? 0 : Number(val);
                            field.onChange(val === '' ? '' : grams);
                            handleGramsChange('carbs', grams);
                          }}
                          data-testid="input-target-carbs"
                          className="text-center font-medium"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <span className="text-muted-foreground">g</span>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={carbsPercent || ''}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    handlePercentChange('carbs', val === '' ? 0 : Number(val));
                  }}
                  data-testid="input-carbs-percent"
                  className="w-20 text-center font-medium"
                />
                <span className="text-muted-foreground">%</span>
              </div>

              {/* Total Percentage Display */}
              <div className={cn(
                "p-4 rounded-lg border",
                isPercentValid 
                  ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800" 
                  : "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800"
              )}>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-medium">Razem:</span>
                  <span className={cn(
                    "text-2xl font-bold px-4 py-1 rounded",
                    isPercentValid 
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" 
                      : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
                  )} data-testid="text-total-percent">
                    {totalPercent}%
                  </span>
                </div>
                <p className={cn(
                  "text-sm mt-2",
                  isPercentValid ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"
                )}>
                  {isPercentValid 
                    ? "Łączna wartość % makroskładników jest prawidłowa" 
                    : "Łączna wartość % makroskładników musi wynosić około 100% (dopuszczalne 99-101%)"}
                </p>
              </div>
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
              <CardHeader>
                <CardTitle className="font-heading">Tygodniowy plan posiłków</CardTitle>
                <CardDescription>Zdefiniuj posiłki na każdy dzień tygodnia</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={activeDay} onValueChange={setActiveDay} className="w-full">
                  <TabsList className="grid w-full grid-cols-7 mb-4" data-testid="tabs-days">
                    {DAYS_OF_WEEK.map((day) => (
                      <TabsTrigger 
                        key={day.value} 
                        value={day.value.toString()}
                        data-testid={`tab-day-${day.value}`}
                        className="text-xs sm:text-sm"
                      >
                        {day.short}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {DAYS_OF_WEEK.map((day) => {
                    const dayMeals = weeklyMeals[day.value] || [];
                    const dayTotals = getDayMacroTotals(day.value);
                    
                    return (
                      <TabsContent key={day.value} value={day.value.toString()} className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-lg">{day.label}</h3>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>Suma: {dayTotals.calories} kcal</span>
                            <span>B: {dayTotals.protein}g</span>
                            <span>T: {dayTotals.fat}g</span>
                            <span>W: {dayTotals.carbs}g</span>
                          </div>
                        </div>

                        {dayMeals.length === 0 && (
                          <p className="text-muted-foreground text-center py-8">
                            Brak posiłków na ten dzień. Kliknij przycisk poniżej, aby dodać pierwszy posiłek.
                          </p>
                        )}

                        <div className="space-y-4">
                          {dayMeals.map((meal, mealIndex) => (
                            <Card key={mealIndex} data-testid={`card-meal-${day.value}-${mealIndex}`}>
                              <CardContent className="p-4 space-y-4">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div className="space-y-2">
                                        <Label>Nazwa posiłku</Label>
                                        <Input
                                          placeholder="np. Śniadanie"
                                          value={meal.name}
                                          onChange={(e) => updateMeal(day.value, mealIndex, 'name', e.target.value)}
                                          data-testid={`input-meal-name-${day.value}-${mealIndex}`}
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label className="flex items-center gap-1">
                                          <Clock className="w-3 h-3" />
                                          Godzina sugerowana
                                        </Label>
                                        <Input
                                          type="time"
                                          value={meal.suggestedTime || ""}
                                          onChange={(e) => updateMeal(day.value, mealIndex, 'suggestedTime', e.target.value)}
                                          data-testid={`input-meal-time-${day.value}-${mealIndex}`}
                                        />
                                      </div>
                                    </div>

                                    <div className="space-y-2">
                                      <Label>Opis / przepis</Label>
                                      <Textarea
                                        placeholder="Składniki i sposób przygotowania..."
                                        value={meal.description}
                                        onChange={(e) => updateMeal(day.value, mealIndex, 'description', e.target.value)}
                                        data-testid={`textarea-meal-description-${day.value}-${mealIndex}`}
                                      />
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                      <div className="space-y-2">
                                        <Label>Kalorie (kcal)</Label>
                                        <Input
                                          type="number"
                                          min="0"
                                          value={meal.calories || ""}
                                          onChange={(e) => updateMeal(day.value, mealIndex, 'calories', parseInt(e.target.value) || 0)}
                                          data-testid={`input-meal-calories-${day.value}-${mealIndex}`}
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label>Białko (g)</Label>
                                        <Input
                                          type="number"
                                          min="0"
                                          value={meal.protein || ""}
                                          onChange={(e) => updateMeal(day.value, mealIndex, 'protein', parseInt(e.target.value) || 0)}
                                          data-testid={`input-meal-protein-${day.value}-${mealIndex}`}
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label>Tłuszcze (g)</Label>
                                        <Input
                                          type="number"
                                          min="0"
                                          value={meal.fat || ""}
                                          onChange={(e) => updateMeal(day.value, mealIndex, 'fat', parseInt(e.target.value) || 0)}
                                          data-testid={`input-meal-fat-${day.value}-${mealIndex}`}
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label>Węglowodany (g)</Label>
                                        <Input
                                          type="number"
                                          min="0"
                                          value={meal.carbs || ""}
                                          onChange={(e) => updateMeal(day.value, mealIndex, 'carbs', parseInt(e.target.value) || 0)}
                                          data-testid={`input-meal-carbs-${day.value}-${mealIndex}`}
                                        />
                                      </div>
                                    </div>

                                    <div className="text-sm text-muted-foreground bg-muted rounded-md px-3 py-2">
                                      Makro: {meal.calories || 0} kcal | B: {meal.protein || 0}g | T: {meal.fat || 0}g | W: {meal.carbs || 0}g
                                    </div>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => removeMealFromDay(day.value, mealIndex)}
                                    data-testid={`button-remove-meal-${day.value}-${mealIndex}`}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => addMealToDay(day.value)}
                          className="w-full"
                          data-testid={`button-add-meal-day-${day.value}`}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Dodaj posiłek do {day.label.toLowerCase()}
                        </Button>
                      </TabsContent>
                    );
                  })}
                </Tabs>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocation("/trainer/diets")}
              data-testid="button-cancel"
            >
              Anuluj
            </Button>
            <Button
              type="submit"
              disabled={createPlanMutation.isPending}
              data-testid="button-submit"
            >
              {createPlanMutation.isPending ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  Zapisywanie...
                </>
              ) : (
                isEdit ? "Zaktualizuj plan" : "Utwórz plan"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
