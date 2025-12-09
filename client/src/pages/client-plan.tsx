import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Clock, Dumbbell, Video, Check, Plus, Minus, ChevronLeft, Play, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import type { PlanAssignment, TrainingPlan, Workout, Exercise, ExerciseLog } from "@shared/schema";

type AssignmentWithPlan = PlanAssignment & {
  plan: TrainingPlan & { workouts: (Workout & { exercises: Exercise[] })[] };
};

type SetData = {
  id: number;
  kg: number;
  reps: number;
  completed: boolean;
};

function getVideoEmbedUrl(url: string): string | null {
  if (!url) return null;

  const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/;
  const youtubeMatch = url.match(youtubeRegex);
  if (youtubeMatch) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
  }

  const vimeoRegex = /vimeo\.com\/(\d+)/;
  const vimeoMatch = url.match(vimeoRegex);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }

  return null;
}

function CompactExerciseCard({ exercise, index }: { exercise: Exercise; index: number }) {
  const { toast } = useToast();
  const targetSets = exercise.sets || 3;
  const targetReps = exercise.reps || 10;
  
  const [sets, setSets] = useState<SetData[]>(() => {
    return Array.from({ length: targetSets }, (_, i) => ({
      id: i + 1,
      kg: 0,
      reps: targetReps,
      completed: false,
    }));
  });

  const { data: latestLog } = useQuery<ExerciseLog | null>({
    queryKey: ["/api/exercises", exercise.id, "latest-log"],
  });

  useEffect(() => {
    if (latestLog && latestLog.load) {
      const kgMatch = latestLog.load.match(/(\d+)/);
      const lastKg = kgMatch ? parseInt(kgMatch[1], 10) : 0;
      const lastReps = latestLog.reps || targetReps;
      
      setSets(prev => prev.map(set => ({
        ...set,
        kg: lastKg,
        reps: lastReps,
      })));
    }
  }, [latestLog, targetReps]);

  const logMutation = useMutation({
    mutationFn: async (data: { reps: number; load?: string }) => {
      return await apiRequest("POST", `/api/exercises/${exercise.id}/log`, {
        exerciseId: exercise.id,
        reps: data.reps,
        load: data.load || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exercises", exercise.id, "latest-log"] });
      toast({
        title: "Seria zapisana!",
        description: "Twoje wykonanie zostało zapisane.",
      });
    },
    onError: () => {
      toast({
        title: "Błąd",
        description: "Nie udało się zapisać wykonania.",
        variant: "destructive",
      });
    },
  });

  const updateSet = (setId: number, field: keyof SetData, value: number | boolean) => {
    setSets(prev => prev.map(set => 
      set.id === setId ? { ...set, [field]: value } : set
    ));
  };

  const incrementValue = (setId: number, field: 'kg' | 'reps', step: number) => {
    setSets(prev => prev.map(set => 
      set.id === setId ? { ...set, [field]: Math.max(0, set[field] + step) } : set
    ));
  };

  const toggleSetComplete = (setId: number) => {
    const setToToggle = sets.find(s => s.id === setId);
    if (!setToToggle) return;

    const newCompleted = !setToToggle.completed;
    updateSet(setId, 'completed', newCompleted);

    if (newCompleted) {
      logMutation.mutate({
        reps: setToToggle.reps,
        load: setToToggle.kg > 0 ? `${setToToggle.kg}kg` : undefined,
      });
    }
  };

  const addSet = () => {
    const lastSet = sets[sets.length - 1];
    setSets(prev => [...prev, {
      id: (prev.length > 0 ? Math.max(...prev.map(s => s.id)) : 0) + 1,
      kg: lastSet?.kg || 0,
      reps: lastSet?.reps || targetReps,
      completed: false,
    }]);
  };

  const removeLastSet = () => {
    if (sets.length > 1) {
      setSets(prev => prev.slice(0, -1));
    }
  };

  const completedSets = sets.filter(s => s.completed).length;
  const totalVolume = sets.filter(s => s.completed).reduce((acc, set) => acc + (set.kg * set.reps), 0);

  const [showVideo, setShowVideo] = useState(false);
  const embedUrl = exercise.videoUrl ? getVideoEmbedUrl(exercise.videoUrl) : null;

  return (
    <Card className="overflow-hidden" data-testid={`card-exercise-${exercise.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="h-8 w-8 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center">
              <span className="text-sm font-bold text-primary" data-testid={`exercise-number-${exercise.id}`}>
                {index + 1}
              </span>
            </div>
            <div>
              <CardTitle className="text-lg font-heading" data-testid={`text-exercise-name-${exercise.id}`}>
                {exercise.name}
              </CardTitle>
              {exercise.description && (
                <CardDescription className="text-xs mt-0.5">{exercise.description}</CardDescription>
              )}
            </div>
          </div>
          {exercise.videoUrl && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowVideo(!showVideo)}
              data-testid={`button-toggle-video-${exercise.id}`}
            >
              <Video className="w-4 h-4" />
            </Button>
          )}
        </div>

        {showVideo && embedUrl && (
          <div className="mt-3">
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              <iframe
                data-testid={`video-iframe-${exercise.id}`}
                src={embedUrl}
                className="absolute top-0 left-0 w-full h-full rounded-md"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        )}

        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
          {exercise.restTime && (
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span data-testid={`text-exercise-rest-${exercise.id}`}>
                {exercise.restTime}s
              </span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Dumbbell className="w-3.5 h-3.5" />
            <span data-testid={`text-target-${exercise.id}`}>
              Cel: {targetSets} x {targetReps}
            </span>
          </div>
          {totalVolume > 0 && (
            <Badge variant="secondary" className="text-xs" data-testid={`badge-volume-${exercise.id}`}>
              {totalVolume}kg
            </Badge>
          )}
          {exercise.technique && (
            <Badge variant="outline" className="text-xs" data-testid={`badge-exercise-technique-${exercise.id}`}>
              {exercise.technique === 'dropset' && 'Dropset'}
              {exercise.technique === 'cluster_set' && 'Cluster Set'}
              {exercise.technique === 'rest_pause' && 'Rest-Pause'}
              {exercise.technique === 'piramida' && 'Piramida'}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="bg-muted/30 rounded-lg overflow-hidden">
          <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-1 text-xs font-medium text-muted-foreground p-2 border-b">
            <div className="w-10 text-center">Seria</div>
            <div className="text-center">kg</div>
            <div className="text-center">Powt</div>
            <div className="w-12 text-center">OK</div>
          </div>

          <div className="divide-y divide-border/50">
            {sets.map((set) => (
              <div 
                key={set.id} 
                className={`grid grid-cols-[auto_1fr_1fr_auto] gap-1 p-2 items-center transition-colors ${
                  set.completed ? 'bg-primary/5' : ''
                }`}
                data-testid={`row-set-${exercise.id}-${set.id}`}
              >
                <div className="w-10 text-center text-sm font-medium text-muted-foreground">
                  {set.id}
                </div>
                
                <div className="flex items-center justify-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => incrementValue(set.id, 'kg', -2.5)}
                    disabled={set.completed}
                    data-testid={`button-kg-minus-${exercise.id}-${set.id}`}
                  >
                    <Minus className="w-3 h-3" />
                  </Button>
                  <Input
                    type="number"
                    value={set.kg}
                    onChange={(e) => updateSet(set.id, 'kg', parseFloat(e.target.value) || 0)}
                    className="w-16 h-8 text-center text-sm px-1"
                    disabled={set.completed}
                    data-testid={`input-kg-${exercise.id}-${set.id}`}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => incrementValue(set.id, 'kg', 2.5)}
                    disabled={set.completed}
                    data-testid={`button-kg-plus-${exercise.id}-${set.id}`}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>

                <div className="flex items-center justify-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => incrementValue(set.id, 'reps', -1)}
                    disabled={set.completed}
                    data-testid={`button-reps-minus-${exercise.id}-${set.id}`}
                  >
                    <Minus className="w-3 h-3" />
                  </Button>
                  <Input
                    type="number"
                    value={set.reps}
                    onChange={(e) => updateSet(set.id, 'reps', parseInt(e.target.value) || 0)}
                    className="w-12 h-8 text-center text-sm px-1"
                    disabled={set.completed}
                    data-testid={`input-reps-${exercise.id}-${set.id}`}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => incrementValue(set.id, 'reps', 1)}
                    disabled={set.completed}
                    data-testid={`button-reps-plus-${exercise.id}-${set.id}`}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>

                <div className="w-12 flex justify-center">
                  <Button
                    variant={set.completed ? "default" : "outline"}
                    size="icon"
                    className={`h-9 w-9 ${set.completed ? 'bg-primary' : ''}`}
                    onClick={() => toggleSetComplete(set.id)}
                    data-testid={`button-complete-${exercise.id}-${set.id}`}
                  >
                    <Check className={`w-4 h-4 ${set.completed ? 'text-primary-foreground' : ''}`} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 mt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={removeLastSet}
            disabled={sets.length <= 1}
            data-testid={`button-remove-set-${exercise.id}`}
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" />
            Usuń serię
          </Button>
          <div className="text-xs text-muted-foreground" data-testid={`text-progress-${exercise.id}`}>
            {completedSets}/{sets.length} serii
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={addSet}
            data-testid={`button-add-set-${exercise.id}`}
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Dodaj serię
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function WorkoutSelector({ 
  workouts, 
  onSelect, 
  planName,
  assignedAt 
}: { 
  workouts: (Workout & { exercises: Exercise[] })[]; 
  onSelect: (workout: Workout & { exercises: Exercise[] }) => void;
  planName: string;
  assignedAt: Date | string;
}) {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-heading font-bold text-3xl mb-1" data-testid="text-plan-name">
          {planName}
        </h1>
        <p className="text-sm text-muted-foreground">
          Przypisany {new Date(assignedAt).toLocaleDateString("pl-PL")}
        </p>
      </div>

      <div>
        <h2 className="font-heading font-semibold text-xl mb-4">
          Wybierz trening
        </h2>
        <div className="space-y-3">
          {workouts.map((workout) => (
            <Card 
              key={workout.id} 
              className="hover-elevate cursor-pointer transition-all"
              onClick={() => onSelect(workout)}
              data-testid={`card-workout-${workout.id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-heading font-semibold text-lg" data-testid={`text-workout-name-${workout.id}`}>
                      {workout.name}
                    </h3>
                    {workout.description && (
                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                        {workout.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Dumbbell className="w-3.5 h-3.5" />
                        <span data-testid={`text-exercises-count-${workout.id}`}>
                          {workout.exercises.length} ćwiczeń
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" data-testid={`button-start-workout-${workout.id}`}>
                    <Play className="w-5 h-5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function WorkoutView({ 
  workout, 
  onBack,
  planName 
}: { 
  workout: Workout & { exercises: Exercise[] }; 
  onBack: () => void;
  planName: string;
}) {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Button
          variant="ghost"
          onClick={onBack}
          className="mb-2 -ml-2"
          data-testid="button-back-to-workouts"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Wróć do listy
        </Button>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{planName}</p>
            <h1 className="font-heading font-bold text-2xl" data-testid="text-current-workout-name">
              {workout.name}
            </h1>
            {workout.description && (
              <p className="text-muted-foreground mt-1">{workout.description}</p>
            )}
          </div>
          <Badge variant="outline" className="mt-1" data-testid="badge-exercises-count">
            {workout.exercises.length} ćwiczeń
          </Badge>
        </div>
      </div>

      <div className="space-y-4">
        {workout.exercises.map((exercise, index) => (
          <CompactExerciseCard 
            key={exercise.id} 
            exercise={exercise} 
            index={index}
          />
        ))}
      </div>
    </div>
  );
}

export default function ClientPlan() {
  const [selectedWorkout, setSelectedWorkout] = useState<(Workout & { exercises: Exercise[] }) | null>(null);

  const { data: assignment, isLoading } = useQuery<AssignmentWithPlan>({
    queryKey: ["/api/client/assignment"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <h3 className="font-heading font-semibold text-xl mb-2">Brak przypisanego planu</h3>
          <p className="text-muted-foreground">
            Skontaktuj się z trenerem, aby otrzymać swój plan treningowy
          </p>
        </CardContent>
      </Card>
    );
  }

  const { plan } = assignment;

  if (!plan.workouts || plan.workouts.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-muted-foreground">
            Ten plan nie zawiera jeszcze żadnych treningów
          </p>
        </CardContent>
      </Card>
    );
  }

  if (selectedWorkout) {
    return (
      <WorkoutView 
        workout={selectedWorkout} 
        onBack={() => setSelectedWorkout(null)}
        planName={plan.name}
      />
    );
  }

  return (
    <WorkoutSelector 
      workouts={plan.workouts}
      onSelect={setSelectedWorkout}
      planName={plan.name}
      assignedAt={assignment.assignedAt}
    />
  );
}
