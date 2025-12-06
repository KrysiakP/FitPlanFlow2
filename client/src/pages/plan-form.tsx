import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Trash2, GripVertical, Library, Dumbbell, Circle, Copy, ChevronDown, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation, useParams, Link } from "wouter";
import type { TrainingPlan, Workout, Exercise, ExerciseLibrary } from "@shared/schema";

const exerciseSchema = z.object({
  name: z.string().min(1, "Nazwa ćwiczenia jest wymagana"),
  sets: z.coerce.number().min(1, "Minimum 1 seria"),
  reps: z.coerce.number().min(1, "Minimum 1 powtórzenie"),
  description: z.string().optional(),
  videoUrl: z.string().optional(),
  restTime: z.coerce.number().optional(),
  load: z.string().optional(),
  technique: z.string().optional(),
  orderIndex: z.number(),
});

const workoutSchema = z.object({
  name: z.string().min(1, "Nazwa treningu jest wymagana"),
  description: z.string().optional(),
  exercises: z.array(exerciseSchema).min(1, "Dodaj przynajmniej jedno ćwiczenie"),
  orderIndex: z.number(),
});

const planSchema = z.object({
  name: z.string().min(1, "Nazwa planu jest wymagana"),
  description: z.string().optional(),
  workouts: z.array(workoutSchema).min(1, "Dodaj przynajmniej jeden trening"),
});

type PlanFormData = z.infer<typeof planSchema>;

type PlanWithWorkouts = TrainingPlan & { 
  workouts: (Workout & { exercises: Exercise[] })[] 
};

export default function PlanForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [libraryDialogOpen, setLibraryDialogOpen] = useState(false);
  const [selectedWorkoutIndex, setSelectedWorkoutIndex] = useState<number | null>(null);
  const [selectedExerciseIndex, setSelectedExerciseIndex] = useState<number | null>(null);
  const [expandedWorkouts, setExpandedWorkouts] = useState<Set<number>>(new Set([0]));
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [newPlanId, setNewPlanId] = useState<number | null>(null);

  const { data: existingPlan, isLoading } = useQuery<PlanWithWorkouts>({
    queryKey: ["/api/plans", id],
    enabled: isEdit,
  });

  const { data: exerciseLibrary = [], isLoading: isLoadingLibrary } = useQuery<ExerciseLibrary[]>({
    queryKey: ["/api/exercises/library"],
  });

  const form = useForm<PlanFormData>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      name: "",
      description: "",
      workouts: [{
        name: "Trening 1",
        description: "",
        exercises: [{ name: "", sets: 3, reps: 10, description: "", videoUrl: "", restTime: 60, load: "", technique: "", orderIndex: 0 }],
        orderIndex: 0
      }],
    },
    values: existingPlan ? {
      name: existingPlan.name,
      description: existingPlan.description || "",
      workouts: existingPlan.workouts.map((workout) => ({
        name: workout.name,
        description: workout.description || "",
        exercises: workout.exercises.map((ex) => ({
          name: ex.name,
          sets: ex.sets,
          reps: ex.reps,
          description: ex.description || "",
          videoUrl: ex.videoUrl || "",
          restTime: ex.restTime ?? 60,
          load: ex.load ?? "",
          technique: ex.technique ?? "",
          orderIndex: ex.orderIndex,
        })),
        orderIndex: workout.orderIndex,
      })),
    } : undefined,
  });

  const createPlanMutation = useMutation({
    mutationFn: async (data: PlanFormData) => {
      if (isEdit) {
        await apiRequest("PUT", `/api/plans/${id}/bulk`, data);
        return null;
      } else {
        const res = await apiRequest("POST", "/api/plans/bulk", data) as { id?: number };
        return res.id || null;
      }
    },
    onSuccess: (planId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/plans", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/stats"] });
      
      if (isEdit) {
        toast({
          title: "Plan zaktualizowany",
          description: "Plan treningowy został zaktualizowany",
        });
        setLocation("/plans");
      } else {
        setNewPlanId(planId as number);
        setSuccessDialogOpen(true);
      }
    },
    onError: () => {
      toast({
        title: "Błąd",
        description: "Nie udało się zapisać planu",
        variant: "destructive",
      });
    },
  });

  const addWorkout = () => {
    const currentWorkouts = form.getValues("workouts");
    const newWorkoutIndex = currentWorkouts.length;
    form.setValue("workouts", [
      ...currentWorkouts,
      { 
        name: `Trening ${currentWorkouts.length + 1}`,
        description: "",
        exercises: [{ name: "", sets: 3, reps: 10, description: "", videoUrl: "", restTime: 60, load: "", orderIndex: 0 }],
        orderIndex: currentWorkouts.length
      },
    ]);
    
    setTimeout(() => {
      const element = document.querySelector(`[data-testid="card-workout-${newWorkoutIndex}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 100);
  };

  const removeWorkout = (workoutIndex: number) => {
    const currentWorkouts = form.getValues("workouts");
    form.setValue(
      "workouts",
      currentWorkouts.filter((_, i) => i !== workoutIndex).map((w, i) => ({ ...w, orderIndex: i }))
    );
  };

  const addExercise = (workoutIndex: number) => {
    const currentExercises = form.getValues(`workouts.${workoutIndex}.exercises`);
    const newExerciseIndex = currentExercises.length;
    form.setValue(`workouts.${workoutIndex}.exercises`, [
      ...currentExercises,
      { name: "", sets: 3, reps: 10, description: "", videoUrl: "", restTime: 60, load: "", technique: "", orderIndex: currentExercises.length },
    ]);
    
    setTimeout(() => {
      const element = document.querySelector(`[data-testid="card-exercise-${workoutIndex}-${newExerciseIndex}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 100);
  };

  const removeExercise = (workoutIndex: number, exerciseIndex: number) => {
    const currentExercises = form.getValues(`workouts.${workoutIndex}.exercises`);
    form.setValue(
      `workouts.${workoutIndex}.exercises`,
      currentExercises.filter((_, i) => i !== exerciseIndex).map((ex, i) => ({ ...ex, orderIndex: i }))
    );
  };

  const duplicateExercise = (workoutIndex: number, exerciseIndex: number) => {
    const currentExercises = form.getValues(`workouts.${workoutIndex}.exercises`);
    const exerciseToDuplicate = currentExercises[exerciseIndex];
    const newExercise = {
      ...exerciseToDuplicate,
      orderIndex: currentExercises.length,
    };
    form.setValue(
      `workouts.${workoutIndex}.exercises`,
      [...currentExercises, newExercise]
    );
  };

  const toggleWorkoutExpanded = (workoutIndex: number) => {
    const newExpanded = new Set(expandedWorkouts);
    if (newExpanded.has(workoutIndex)) {
      newExpanded.delete(workoutIndex);
    } else {
      newExpanded.add(workoutIndex);
    }
    setExpandedWorkouts(newExpanded);
  };

  const getWorkoutSummary = (workoutIndex: number) => {
    const exercises = form.getValues(`workouts.${workoutIndex}.exercises`);
    if (!exercises || exercises.length === 0) return null;
    
    const totalSets = exercises.reduce((sum, ex) => sum + (ex.sets || 0), 0);
    const avgReps = exercises.length > 0 
      ? Math.round(exercises.reduce((sum, ex) => sum + (ex.reps || 0), 0) / exercises.length)
      : 0;
    
    return {
      exerciseCount: exercises.length,
      totalSets,
      avgReps,
    };
  };

  const handleSelectFromLibrary = (workoutIndex: number, exerciseIndex: number) => {
    setSelectedWorkoutIndex(workoutIndex);
    setSelectedExerciseIndex(exerciseIndex);
    setLibraryDialogOpen(true);
  };

  const handleExerciseSelect = (exercise: ExerciseLibrary) => {
    if (selectedWorkoutIndex === null || selectedExerciseIndex === null) return;
    
    form.setValue(`workouts.${selectedWorkoutIndex}.exercises.${selectedExerciseIndex}.name`, exercise.name);
    form.setValue(`workouts.${selectedWorkoutIndex}.exercises.${selectedExerciseIndex}.description`, exercise.description || "");
    form.setValue(`workouts.${selectedWorkoutIndex}.exercises.${selectedExerciseIndex}.videoUrl`, exercise.videoUrl || "");
    form.setValue(`workouts.${selectedWorkoutIndex}.exercises.${selectedExerciseIndex}.sets`, exercise.defaultSets ?? 3);
    form.setValue(`workouts.${selectedWorkoutIndex}.exercises.${selectedExerciseIndex}.reps`, exercise.defaultReps ?? 10);
    form.setValue(`workouts.${selectedWorkoutIndex}.exercises.${selectedExerciseIndex}.load`, exercise.defaultLoad || "");
    form.setValue(`workouts.${selectedWorkoutIndex}.exercises.${selectedExerciseIndex}.restTime`, exercise.defaultRestTime ?? 60);
    
    setLibraryDialogOpen(false);
    setSelectedWorkoutIndex(null);
    setSelectedExerciseIndex(null);
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
            <CardHeader className="flex flex-row items-center justify-between space-y-0 gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Dumbbell className="w-5 h-5 text-primary" />
                  <CardTitle className="font-heading">Treningi</CardTitle>
                </div>
                <CardDescription>Dodaj treningi do planu</CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={addWorkout}
                data-testid="button-add-workout"
              >
                <Plus className="w-4 h-4 mr-2" />
                Dodaj trening
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {form.watch("workouts").map((_, workoutIndex) => {
                const summary = getWorkoutSummary(workoutIndex);
                const isExpanded = expandedWorkouts.has(workoutIndex);
                return (
                <Card key={workoutIndex} className="border-l-4 border-l-primary/50" data-testid={`card-workout-${workoutIndex}`}>
                  <CardHeader 
                    className="flex flex-row items-start justify-between space-y-0 gap-4 cursor-pointer hover-elevate"
                    onClick={() => toggleWorkoutExpanded(workoutIndex)}
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
                        <h3 className="font-semibold text-lg" data-testid={`text-workout-name-${workoutIndex}`}>
                          {form.watch(`workouts.${workoutIndex}.name`)}
                        </h3>
                      </div>
                      {summary && (
                        <div className="flex gap-4 text-xs text-muted-foreground ml-7">
                          <span data-testid={`text-workout-summary-exercises-${workoutIndex}`}>
                            {summary.exerciseCount} {summary.exerciseCount === 1 ? 'ćwiczenie' : 'ćwiczeń'}
                          </span>
                          <span data-testid={`text-workout-summary-sets-${workoutIndex}`}>
                            {summary.totalSets} {summary.totalSets === 1 ? 'seria' : 'serii'}
                          </span>
                          <span data-testid={`text-workout-summary-reps-${workoutIndex}`}>
                            Śr. {summary.avgReps} powtórzeń
                          </span>
                        </div>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeWorkout(workoutIndex);
                      }}
                      disabled={form.watch("workouts").length === 1}
                      data-testid={`button-remove-workout-${workoutIndex}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent className="space-y-6 border-t pt-6">
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name={`workouts.${workoutIndex}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nazwa treningu</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="np. Trening górnej partii" 
                                  {...field} 
                                  data-testid={`input-workout-name-${workoutIndex}`} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`workouts.${workoutIndex}.description`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Opis treningu (opcjonalnie)</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Opisz cel i zakres tego treningu"
                                  {...field}
                                  data-testid={`input-workout-description-${workoutIndex}`}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="border-t pt-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <Circle className="w-4 h-4 text-primary" />
                            <h4 className="font-semibold">Ćwiczenia</h4>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addExercise(workoutIndex)}
                            data-testid={`button-add-exercise-${workoutIndex}`}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Dodaj ćwiczenie
                          </Button>
                        </div>

                        <div className="space-y-3">
                          {form.watch(`workouts.${workoutIndex}.exercises`).map((_, exerciseIndex) => (
                            <Card key={exerciseIndex} className="bg-muted/30" data-testid={`card-exercise-${workoutIndex}-${exerciseIndex}`}>
                              <CardContent className="p-4 space-y-4">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex items-start gap-3 flex-1">
                                    <GripVertical className="w-4 h-4 text-muted-foreground mt-1 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <FormField
                                        control={form.control}
                                        name={`workouts.${workoutIndex}.exercises.${exerciseIndex}.name`}
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormLabel className="text-xs">Nazwa ćwiczenia</FormLabel>
                                            <FormControl>
                                              <Input 
                                                placeholder="np. Wyciskanie sztangi" 
                                                {...field} 
                                                data-testid={`input-exercise-name-${workoutIndex}-${exerciseIndex}`} 
                                              />
                                            </FormControl>
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />
                                    </div>
                                  </div>
                                  <div className="flex gap-2 flex-shrink-0">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => duplicateExercise(workoutIndex, exerciseIndex)}
                                      data-testid={`button-duplicate-exercise-${workoutIndex}-${exerciseIndex}`}
                                      title="Duplikuj ćwiczenie"
                                    >
                                      <Copy className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      onClick={() => removeExercise(workoutIndex, exerciseIndex)}
                                      disabled={form.watch(`workouts.${workoutIndex}.exercises`).length === 1}
                                      data-testid={`button-remove-exercise-${workoutIndex}-${exerciseIndex}`}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>

                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="w-full"
                                  onClick={() => handleSelectFromLibrary(workoutIndex, exerciseIndex)}
                                  data-testid={`button-select-from-library-${workoutIndex}-${exerciseIndex}`}
                                >
                                  <Library className="w-4 h-4 mr-2" />
                                  Wybierz z biblioteki
                                </Button>

                                <div className="grid grid-cols-3 gap-3">
                                  <FormField
                                    control={form.control}
                                    name={`workouts.${workoutIndex}.exercises.${exerciseIndex}.sets`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="text-xs">Serie</FormLabel>
                                        <FormControl>
                                          <Input 
                                            type="number" 
                                            min="1" 
                                            {...field} 
                                            data-testid={`input-exercise-sets-${workoutIndex}-${exerciseIndex}`} 
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />

                                  <FormField
                                    control={form.control}
                                    name={`workouts.${workoutIndex}.exercises.${exerciseIndex}.reps`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="text-xs">Powtórzenia</FormLabel>
                                        <FormControl>
                                          <Input 
                                            type="number" 
                                            min="1" 
                                            {...field} 
                                            data-testid={`input-exercise-reps-${workoutIndex}-${exerciseIndex}`} 
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />

                                  <FormField
                                    control={form.control}
                                    name={`workouts.${workoutIndex}.exercises.${exerciseIndex}.restTime`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="text-xs">Odpoczynek (s)</FormLabel>
                                        <FormControl>
                                          <Input 
                                            type="number" 
                                            min="0" 
                                            {...field} 
                                            data-testid={`input-exercise-rest-${workoutIndex}-${exerciseIndex}`} 
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>

                                <FormField
                                  control={form.control}
                                  name={`workouts.${workoutIndex}.exercises.${exerciseIndex}.description`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-xs">Opis (opcjonalnie)</FormLabel>
                                      <FormControl>
                                        <Textarea
                                          placeholder="Dodatkowe wskazówki"
                                          {...field}
                                          className="text-xs"
                                          data-testid={`input-exercise-description-${workoutIndex}-${exerciseIndex}`}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={form.control}
                                  name={`workouts.${workoutIndex}.exercises.${exerciseIndex}.load`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-xs">Obciążenie (opcjonalnie)</FormLabel>
                                      <FormControl>
                                        <Input 
                                          placeholder="np. 20kg, bodyweight" 
                                          {...field} 
                                          data-testid={`input-exercise-load-${workoutIndex}-${exerciseIndex}`} 
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={form.control}
                                  name={`workouts.${workoutIndex}.exercises.${exerciseIndex}.videoUrl`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-xs">Link do filmu (opcjonalnie)</FormLabel>
                                      <FormControl>
                                        <Input 
                                          type="url"
                                          placeholder="https://youtube.com/watch?v=..." 
                                          {...field} 
                                          data-testid={`input-exercise-video-${workoutIndex}-${exerciseIndex}`} 
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={form.control}
                                  name={`workouts.${workoutIndex}.exercises.${exerciseIndex}.technique`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-xs">Technika treningowa (opcjonalnie)</FormLabel>
                                      <Select 
                                        onValueChange={field.onChange} 
                                        value={field.value || "none"}
                                      >
                                        <FormControl>
                                          <SelectTrigger data-testid={`select-exercise-technique-${workoutIndex}-${exerciseIndex}`}>
                                            <SelectValue />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          <SelectItem value="none">Brak</SelectItem>
                                          <SelectItem value="dropset">Dropset</SelectItem>
                                          <SelectItem value="cluster_set">Cluster Set</SelectItem>
                                          <SelectItem value="rest_pause">Rest-Pause</SelectItem>
                                          <SelectItem value="piramida">Piramida</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
              })}
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

      <Dialog open={libraryDialogOpen} onOpenChange={setLibraryDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto" data-testid="dialog-exercise-library">
          <DialogHeader>
            <DialogTitle className="font-heading">Wybierz ćwiczenie z biblioteki</DialogTitle>
            <DialogDescription>
              Kliknij na ćwiczenie, aby automatycznie wypełnić formularz
            </DialogDescription>
          </DialogHeader>

          {isLoadingLibrary ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : !exerciseLibrary || exerciseLibrary.length === 0 ? (
            <div className="text-center py-8 space-y-4" data-testid="empty-library-message">
              <p className="text-muted-foreground">
                Brak ćwiczeń w bibliotece. Dodaj ćwiczenia w zakładce "Moje ćwiczenia"
              </p>
              <Link href="/exercise-library">
                <Button variant="outline" data-testid="link-to-exercise-library">
                  Przejdź do biblioteki ćwiczeń
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {exerciseLibrary.map((exercise) => (
                <Card
                  key={exercise.id}
                  className="hover-elevate cursor-pointer"
                  onClick={() => handleExerciseSelect(exercise)}
                  data-testid={`library-exercise-${exercise.id}`}
                >
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <h4 className="font-medium text-lg">{exercise.name}</h4>
                      {exercise.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {exercise.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                        {exercise.defaultSets && (
                          <span>Serie: {exercise.defaultSets}</span>
                        )}
                        {exercise.defaultReps && (
                          <span>Powtórzenia: {exercise.defaultReps}</span>
                        )}
                        {exercise.defaultLoad && (
                          <span>Obciążenie: {exercise.defaultLoad}</span>
                        )}
                        {exercise.defaultRestTime && (
                          <span>Odpoczynek: {exercise.defaultRestTime}s</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <DialogContent data-testid="dialog-success">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <DialogTitle className="font-heading">Plan utworzony!</DialogTitle>
            </div>
            <DialogDescription>
              Twój nowy plan treningowy został pomyślnie utworzony. Teraz możesz go przypisać do swoich podopiecznych.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 justify-end mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setSuccessDialogOpen(false);
                setLocation("/plans");
              }}
              data-testid="button-back-to-plans"
            >
              Wróć do planów
            </Button>
            <Button
              onClick={() => {
                setSuccessDialogOpen(false);
                if (newPlanId) {
                  setLocation(`/plans/${newPlanId}`);
                }
              }}
              data-testid="button-view-plan"
            >
              Przejdź do planu
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {!libraryDialogOpen && !successDialogOpen && (
        <div className="fixed bottom-24 right-8 flex flex-col gap-3 z-50">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                size="lg"
                variant="secondary"
                className="rounded-full shadow-lg h-12 px-4 gap-2"
                data-testid="button-floating-add-exercise"
                title="Dodaj ćwiczenie"
              >
                <Dumbbell className="w-5 h-5" />
                <span className="text-sm">Dodaj ćwiczenie</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 p-2">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground px-2 py-1">Wybierz trening:</p>
                {form.getValues("workouts").map((workout, index) => (
                  <Button
                    key={index}
                    type="button"
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => {
                      addExercise(index);
                      if (!expandedWorkouts.has(index)) {
                        const newExpanded = new Set(expandedWorkouts);
                        newExpanded.add(index);
                        setExpandedWorkouts(newExpanded);
                      }
                    }}
                    data-testid={`select-workout-for-exercise-${index}`}
                  >
                    <Circle className="w-3 h-3 mr-2 text-primary" />
                    {workout.name || `Trening ${index + 1}`}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          
          <Button
            type="button"
            size="lg"
            className="rounded-full shadow-lg h-12 px-4 gap-2"
            onClick={addWorkout}
            data-testid="button-floating-add-workout"
            title="Utwórz nowy trening"
          >
            <Plus className="w-5 h-5" />
            <span className="text-sm">Nowy trening</span>
          </Button>
        </div>
      )}
    </div>
  );
}
