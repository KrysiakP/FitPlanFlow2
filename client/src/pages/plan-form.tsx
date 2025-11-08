import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation, useParams } from "wouter";
import type { TrainingPlan, Exercise } from "@shared/schema";

const exerciseSchema = z.object({
  name: z.string().min(1, "Nazwa ćwiczenia jest wymagana"),
  sets: z.coerce.number().min(1, "Minimum 1 seria"),
  reps: z.coerce.number().min(1, "Minimum 1 powtórzenie"),
  description: z.string().optional(),
  restTime: z.coerce.number().optional(),
  orderIndex: z.number(),
});

const planSchema = z.object({
  name: z.string().min(1, "Nazwa planu jest wymagana"),
  description: z.string().optional(),
  exercises: z.array(exerciseSchema).min(1, "Dodaj przynajmniej jedno ćwiczenie"),
});

type PlanFormData = z.infer<typeof planSchema>;

type PlanWithExercises = TrainingPlan & { exercises: Exercise[] };

export default function PlanForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: existingPlan, isLoading } = useQuery<PlanWithExercises>({
    queryKey: ["/api/plans", id],
    enabled: isEdit,
  });

  const form = useForm<PlanFormData>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      name: "",
      description: "",
      exercises: [{ name: "", sets: 3, reps: 10, description: "", restTime: 60, orderIndex: 0 }],
    },
    values: existingPlan ? {
      name: existingPlan.name,
      description: existingPlan.description || "",
      exercises: existingPlan.exercises.map((ex) => ({
        name: ex.name,
        sets: ex.sets,
        reps: ex.reps,
        description: ex.description || "",
        restTime: ex.restTime || 60,
        orderIndex: ex.orderIndex,
      })),
    } : undefined,
  });

  const createPlanMutation = useMutation({
    mutationFn: async (data: PlanFormData) => {
      if (isEdit) {
        await apiRequest("PUT", `/api/plans/${id}`, data);
      } else {
        await apiRequest("POST", "/api/plans", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/stats"] });
      toast({
        title: isEdit ? "Plan zaktualizowany" : "Plan utworzony",
        description: isEdit ? "Plan treningowy został zaktualizowany" : "Nowy plan treningowy został utworzony",
      });
      setLocation("/plans");
    },
    onError: () => {
      toast({
        title: "Błąd",
        description: "Nie udało się zapisać planu",
        variant: "destructive",
      });
    },
  });

  const addExercise = () => {
    const currentExercises = form.getValues("exercises");
    form.setValue("exercises", [
      ...currentExercises,
      { name: "", sets: 3, reps: 10, description: "", restTime: 60, orderIndex: currentExercises.length },
    ]);
  };

  const removeExercise = (index: number) => {
    const currentExercises = form.getValues("exercises");
    form.setValue(
      "exercises",
      currentExercises.filter((_, i) => i !== index).map((ex, i) => ({ ...ex, orderIndex: i }))
    );
  };

  if (isEdit && isLoading) {
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
          {isEdit ? "Edytuj plan treningowy" : "Utwórz plan treningowy"}
        </h1>
        <p className="text-muted-foreground">
          {isEdit ? "Zaktualizuj szczegóły planu i ćwiczenia" : "Stwórz nowy plan dla swoich podopiecznych"}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => createPlanMutation.mutate(data))} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-heading">Podstawowe informacje</CardTitle>
              <CardDescription>Podaj nazwę i opis planu treningowego</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nazwa planu</FormLabel>
                    <FormControl>
                      <Input placeholder="np. Plan siłowy dla początkujących" {...field} data-testid="input-plan-name" />
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
                        placeholder="Opisz cel i zakres planu treningowego"
                        {...field}
                        data-testid="input-plan-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="font-heading">Ćwiczenia</CardTitle>
                <CardDescription>Dodaj ćwiczenia do planu treningowego</CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={addExercise}
                data-testid="button-add-exercise"
              >
                <Plus className="w-4 h-4 mr-2" />
                Dodaj ćwiczenie
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {form.watch("exercises").map((_, index) => (
                <Card key={index} data-testid={`card-exercise-${index}`}>
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="pt-2">
                        <GripVertical className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 space-y-4">
                        <FormField
                          control={form.control}
                          name={`exercises.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nazwa ćwiczenia</FormLabel>
                              <FormControl>
                                <Input placeholder="np. Wyciskanie sztangi" {...field} data-testid={`input-exercise-name-${index}`} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <FormField
                            control={form.control}
                            name={`exercises.${index}.sets`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Serie</FormLabel>
                                <FormControl>
                                  <Input type="number" min="1" {...field} data-testid={`input-exercise-sets-${index}`} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`exercises.${index}.reps`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Powtórzenia</FormLabel>
                                <FormControl>
                                  <Input type="number" min="1" {...field} data-testid={`input-exercise-reps-${index}`} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`exercises.${index}.restTime`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Odpoczynek (s)</FormLabel>
                                <FormControl>
                                  <Input type="number" min="0" {...field} data-testid={`input-exercise-rest-${index}`} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name={`exercises.${index}.description`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Opis (opcjonalnie)</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Dodatkowe wskazówki dotyczące techniki wykonania"
                                  {...field}
                                  data-testid={`input-exercise-description-${index}`}
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
                        onClick={() => removeExercise(index)}
                        disabled={form.watch("exercises").length === 1}
                        data-testid={`button-remove-exercise-${index}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={createPlanMutation.isPending}
              data-testid="button-save-plan"
            >
              {createPlanMutation.isPending ? "Zapisywanie..." : isEdit ? "Zapisz zmiany" : "Utwórz plan"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocation("/plans")}
              data-testid="button-cancel"
            >
              Anuluj
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
