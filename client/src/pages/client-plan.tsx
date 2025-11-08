import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, Dumbbell, Video, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState, useEffect, useRef } from "react";
import type { PlanAssignment, TrainingPlan, Workout, Exercise, ExerciseLog } from "@shared/schema";

type AssignmentWithPlan = PlanAssignment & {
  plan: TrainingPlan & { workouts: (Workout & { exercises: Exercise[] })[] };
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

function ExerciseLogForm({ exercise }: { exercise: Exercise }) {
  const { toast } = useToast();
  const [reps, setReps] = useState<string>("");
  const [load, setLoad] = useState<string>("");
  const isMutatingRef = useRef(false);

  const { data: latestLog } = useQuery<ExerciseLog | null>({
    queryKey: ["/api/exercises", exercise.id, "latest-log"],
  });

  const logMutation = useMutation({
    mutationFn: async (data: { reps: number; load?: string }) => {
      isMutatingRef.current = true;
      return await apiRequest("POST", `/api/exercises/${exercise.id}/log`, {
        exerciseId: exercise.id,
        reps: data.reps,
        load: data.load || undefined,
      });
    },
    onSuccess: () => {
      isMutatingRef.current = false;
      queryClient.invalidateQueries({ queryKey: ["/api/exercises", exercise.id, "latest-log"] });
      toast({
        title: "Wykonanie zapisane!",
        description: "Twoje wykonanie ćwiczenia zostało zapisane pomyślnie.",
      });
    },
    onError: () => {
      isMutatingRef.current = false;
      toast({
        title: "Błąd",
        description: "Nie udało się zapisać wykonania ćwiczenia.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (isMutatingRef.current) {
      return;
    }
    
    if (latestLog) {
      setReps(latestLog.reps.toString());
      setLoad(latestLog.load || "");
    } else {
      setReps("");
      setLoad("");
    }
  }, [latestLog]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedReps = parseInt(reps, 10);
    if (isNaN(parsedReps) || parsedReps <= 0) {
      toast({
        title: "Błąd",
        description: "Podaj prawidłową liczbę powtórzeń.",
        variant: "destructive",
      });
      return;
    }

    const submittedLoad = load.trim() || undefined;
    logMutation.mutate({
      reps: parsedReps,
      load: submittedLoad,
    });
    
    setReps(parsedReps.toString());
    setLoad(submittedLoad || "");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4 border-t">
      <div className="space-y-4">
        <div>
          <h4 className="font-heading font-medium mb-3">Cel od trenera:</h4>
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Dumbbell className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground" data-testid={`text-target-sets-${exercise.id}`}>
                {exercise.sets} serie
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground" data-testid={`text-target-reps-${exercise.id}`}>
                {exercise.reps} powtórzeń
              </span>
            </div>
            {exercise.load && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground" data-testid={`text-target-load-${exercise.id}`}>
                  Obciążenie: {exercise.load}
                </span>
              </div>
            )}
          </div>
        </div>

        <div>
          <h4 className="font-heading font-medium mb-3">Twoje wykonanie:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`reps-${exercise.id}`}>
                Powtórzenia <span className="text-destructive">*</span>
              </Label>
              <Input
                id={`reps-${exercise.id}`}
                type="number"
                min="1"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                placeholder="np. 12"
                required
                data-testid={`input-reps-${exercise.id}`}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`load-${exercise.id}`}>Obciążenie (opcjonalne)</Label>
              <Input
                id={`load-${exercise.id}`}
                type="text"
                value={load}
                onChange={(e) => setLoad(e.target.value)}
                placeholder="np. 25kg, bodyweight"
                data-testid={`input-load-${exercise.id}`}
              />
            </div>
          </div>
        </div>
      </div>

      <Button
        type="submit"
        disabled={logMutation.isPending}
        className="w-full md:w-auto"
        data-testid={`button-save-log-${exercise.id}`}
      >
        <Save className="w-4 h-4" />
        <span>{logMutation.isPending ? "Zapisywanie..." : "Zapisz wykonanie"}</span>
      </Button>
    </form>
  );
}

export default function ClientPlan() {
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

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="font-heading font-bold text-4xl mb-2" data-testid="text-plan-name">
          {plan.name}
        </h1>
        {plan.description && (
          <p className="text-muted-foreground">{plan.description}</p>
        )}
        <p className="text-sm text-muted-foreground mt-2">
          Przypisany {new Date(assignment.assignedAt).toLocaleDateString("pl-PL")}
        </p>
      </div>

      {plan.workouts && plan.workouts.length > 0 ? (
        <div className="space-y-8">
          {plan.workouts.map((workout) => (
            <div key={workout.id} className="space-y-4">
              <div>
                <h2 className="font-heading font-semibold text-2xl" data-testid={`text-workout-name-${workout.id}`}>
                  {workout.name}
                </h2>
                {workout.description && (
                  <p className="text-muted-foreground mt-1">{workout.description}</p>
                )}
              </div>
              
              <div className="space-y-4">
                {workout.exercises.map((exercise, index) => (
                  <Card key={exercise.id} data-testid={`card-exercise-${exercise.id}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge variant="outline" className="font-mono">
                              #{index + 1}
                            </Badge>
                            <CardTitle className="font-heading" data-testid={`text-exercise-name-${exercise.id}`}>
                              {exercise.name}
                            </CardTitle>
                          </div>
                          {exercise.description && (
                            <CardDescription>{exercise.description}</CardDescription>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {exercise.videoUrl && (() => {
                        const embedUrl = getVideoEmbedUrl(exercise.videoUrl);
                        
                        if (embedUrl) {
                          return (
                            <div className="mb-6">
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
                          );
                        } else {
                          return (
                            <div className="mb-6">
                              <Button
                                variant="outline"
                                asChild
                                data-testid={`link-video-${exercise.id}`}
                              >
                                <a href={exercise.videoUrl} target="_blank" rel="noopener noreferrer">
                                  <Video className="w-4 h-4" />
                                  <span>Zobacz film</span>
                                </a>
                              </Button>
                            </div>
                          );
                        }
                      })()}
                      
                      {exercise.restTime && (
                        <div className="flex items-center gap-2 mb-4">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground" data-testid={`text-exercise-rest-${exercise.id}`}>
                            Odpoczynek: {exercise.restTime}s
                          </span>
                        </div>
                      )}

                      <ExerciseLogForm exercise={exercise} />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">
              Ten plan nie zawiera jeszcze żadnych treningów
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
