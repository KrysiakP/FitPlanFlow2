import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Video, AlertCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { ExerciseLibrary } from "@shared/schema";
import { insertExerciseLibrarySchema } from "@shared/schema";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";

type ExerciseFormValues = z.infer<typeof insertExerciseLibrarySchema>;

function ExerciseDialog({
  exercise,
  trigger,
  onSuccess,
}: {
  exercise?: ExerciseLibrary;
  trigger: React.ReactNode;
  onSuccess?: () => void;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [currentExerciseId, setCurrentExerciseId] = useState<string | null>(exercise?.id || null);

  const form = useForm<ExerciseFormValues>({
    resolver: zodResolver(insertExerciseLibrarySchema),
    defaultValues: {
      name: exercise?.name || "",
      description: exercise?.description || "",
      videoUrl: exercise?.videoUrl || "",
      defaultSets: exercise?.defaultSets || undefined,
      defaultReps: exercise?.defaultReps || undefined,
      defaultLoad: exercise?.defaultLoad || "",
      defaultRestTime: exercise?.defaultRestTime || undefined,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ExerciseFormValues) => {
      let normalizedVideoUrl = data.videoUrl || null;
      
      if (normalizedVideoUrl && normalizedVideoUrl.includes('instagram.com')) {
        const urlWithoutQuery = normalizedVideoUrl.split('?')[0].split('#')[0];
        const cleanUrl = urlWithoutQuery.replace(/\/+$/, '');
        
        if (!cleanUrl.endsWith('/embed')) {
          normalizedVideoUrl = cleanUrl + '/embed/';
        } else {
          normalizedVideoUrl = cleanUrl + '/';
        }
      }
      
      const exerciseData = {
        name: data.name,
        description: data.description || null,
        videoUrl: normalizedVideoUrl,
        defaultSets: data.defaultSets || null,
        defaultReps: data.defaultReps || null,
        defaultLoad: data.defaultLoad || null,
        defaultRestTime: data.defaultRestTime || null,
      };

      if (exercise) {
        await apiRequest("PUT", `/api/exercises/library/${exercise.id}`, exerciseData);
        return { exerciseId: exercise.id, videoUrl: normalizedVideoUrl };
      } else {
        const response: any = await apiRequest("POST", "/api/exercises/library", exerciseData);
        return { exerciseId: response.id, videoUrl: normalizedVideoUrl };
      }
    },
    onSuccess: ({ exerciseId, videoUrl }) => {
      setCurrentExerciseId(exerciseId);
      queryClient.invalidateQueries({ queryKey: ["/api/exercises/library"] });
      toast({
        title: exercise ? "Ćwiczenie zaktualizowane" : "Ćwiczenie dodane",
        description: exercise
          ? "Ćwiczenie zostało pomyślnie zaktualizowane"
          : "Ćwiczenie zostało pomyślnie dodane do biblioteki",
      });
      
      setOpen(false);
      form.reset();
      onSuccess?.();
    },
    onError: () => {
      toast({
        title: "Błąd",
        description: exercise
          ? "Nie udało się zaktualizować ćwiczenia"
          : "Nie udało się dodać ćwiczenia",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ExerciseFormValues) => {
    createMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {exercise ? "Edytuj ćwiczenie" : "Dodaj nowe ćwiczenie"}
          </DialogTitle>
          <DialogDescription>
            {exercise
              ? "Zaktualizuj dane ćwiczenia w swojej bibliotece"
              : "Dodaj ćwiczenie do swojej biblioteki"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nazwa ćwiczenia *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="np. Wyciskanie sztangi leżąc"
                      {...field}
                      data-testid="input-exercise-name"
                    />
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
                  <FormLabel>Opis</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Opis techniki wykonania..."
                      className="min-h-24"
                      {...field}
                      value={field.value || ""}
                      data-testid="input-exercise-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="defaultSets"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Serie</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="3"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        data-testid="input-exercise-sets"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="defaultReps"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Powtórzenia</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="10"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        data-testid="input-exercise-reps"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="defaultLoad"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Obciążenie</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="20kg"
                        {...field}
                        value={field.value || ""}
                        data-testid="input-exercise-load"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="defaultRestTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Odpoczynek (sekundy)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="60"
                      {...field}
                      value={field.value || ""}
                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      data-testid="input-exercise-rest"
                    />
                  </FormControl>
                  <FormDescription>
                    Zalecany czas odpoczynku między seriami
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="videoUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Link do filmu</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://youtube.com/... lub https://vimeo.com/... lub https://instagram.com/..."
                      {...field}
                      value={field.value || ""}
                      data-testid="input-video-url"
                    />
                  </FormControl>
                  <FormDescription>
                    Wklej link do filmu z YouTube, Vimeo lub Instagram
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                data-testid="button-cancel-exercise"
              >
                Anuluj
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                data-testid="button-save-exercise"
              >
                {createMutation.isPending
                  ? "Zapisywanie..."
                  : exercise
                  ? "Zapisz zmiany"
                  : "Dodaj ćwiczenie"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function VideoPreview({ videoUrl }: { videoUrl: string | null }) {
  if (!videoUrl) return null;

  const isYouTube = videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be");
  const isVimeo = videoUrl.includes("vimeo.com");
  const isInstagram = videoUrl.includes("instagram.com");

  if (isYouTube) {
    let embedUrl = videoUrl;
    if (videoUrl.includes("watch?v=")) {
      const videoId = videoUrl.split("watch?v=")[1]?.split("&")[0];
      embedUrl = `https://www.youtube.com/embed/${videoId}`;
    } else if (videoUrl.includes("youtu.be/")) {
      const videoId = videoUrl.split("youtu.be/")[1]?.split("?")[0];
      embedUrl = `https://www.youtube.com/embed/${videoId}`;
    }

    return (
      <div className="aspect-video w-full rounded-md overflow-hidden bg-muted">
        <iframe
          src={embedUrl}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="YouTube video"
        />
      </div>
    );
  }

  if (isVimeo) {
    let embedUrl = videoUrl;
    if (videoUrl.includes("vimeo.com/")) {
      const videoId = videoUrl.split("vimeo.com/")[1]?.split("?")[0];
      embedUrl = `https://player.vimeo.com/video/${videoId}`;
    }

    return (
      <div className="aspect-video w-full rounded-md overflow-hidden bg-muted">
        <iframe
          src={embedUrl}
          className="w-full h-full"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          title="Vimeo video"
        />
      </div>
    );
  }

  if (isInstagram) {
    let embedUrl = videoUrl;
    if (!videoUrl.includes("/embed")) {
      const urlWithoutQuery = videoUrl.split('?')[0];
      embedUrl = urlWithoutQuery.replace(/\/$/, '') + '/embed/';
    }

    return (
      <div className="aspect-square w-full max-w-md mx-auto rounded-md overflow-hidden bg-muted">
        <iframe
          src={embedUrl}
          className="w-full h-full"
          frameBorder="0"
          scrolling="no"
          allowTransparency
          allow="encrypted-media"
          title="Instagram post"
        />
      </div>
    );
  }

  return (
    <div className="aspect-video w-full rounded-md overflow-hidden bg-muted">
      <video
        src={videoUrl}
        controls
        className="w-full h-full object-cover"
        data-testid="video-preview"
      >
        Twoja przeglądarka nie obsługuje odtwarzania wideo.
      </video>
    </div>
  );
}

export default function ExerciseLibrary() {
  const { toast } = useToast();

  const { data: exercises, isLoading, error, refetch } = useQuery<ExerciseLibrary[]>({
    queryKey: ["/api/exercises/library"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (exerciseId: string) => {
      await apiRequest("DELETE", `/api/exercises/library/${exerciseId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exercises/library"] });
      toast({
        title: "Ćwiczenie usunięte",
        description: "Ćwiczenie zostało pomyślnie usunięte z biblioteki",
      });
    },
    onError: () => {
      toast({
        title: "Błąd",
        description: "Nie udało się usunąć ćwiczenia",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-10 w-64 mb-2" />
            <Skeleton className="h-5 w-96" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-48 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-4xl mb-2" data-testid="text-library-title">
            Moja biblioteka ćwiczeń
          </h1>
          <p className="text-muted-foreground">
            Zarządzaj swoją kolekcją ćwiczeń
          </p>
        </div>
        <ExerciseDialog
          trigger={
            <Button data-testid="button-add-exercise">
              <Plus className="w-4 h-4 mr-2" />
              Dodaj ćwiczenie
            </Button>
          }
        />
      </div>

      {error && (
        <Alert variant="destructive" data-testid="alert-library-error">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Błąd ładowania biblioteki</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>Nie udało się pobrać ćwiczeń. Spróbuj ponownie.</span>
            <Button variant="outline" size="sm" onClick={() => refetch()} data-testid="button-retry">
              Spróbuj ponownie
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {!error && (!exercises || exercises.length === 0) ? (
        <Card>
          <CardContent className="p-12 text-center space-y-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
              <Video className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-xl mb-2">
                Brak ćwiczeń w bibliotece
              </h3>
              <p className="text-muted-foreground mb-4">
                Dodaj swoje pierwsze ćwiczenie do biblioteki
              </p>
              <ExerciseDialog
                trigger={
                  <Button data-testid="button-add-first-exercise">
                    <Plus className="w-4 h-4 mr-2" />
                    Dodaj pierwsze ćwiczenie
                  </Button>
                }
              />
            </div>
          </CardContent>
        </Card>
      ) : !error && exercises ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {exercises.map((exercise) => (
            <Card key={exercise.id} className="flex flex-col" data-testid={`card-exercise-${exercise.id}`}>
              <CardHeader>
                <CardTitle className="font-heading" data-testid={`text-exercise-name-${exercise.id}`}>
                  {exercise.name}
                </CardTitle>
                {exercise.description && (
                  <CardDescription className="line-clamp-2">
                    {exercise.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                {exercise.videoUrl && <VideoPreview videoUrl={exercise.videoUrl} />}

                <div className="space-y-2">
                  {(exercise.defaultSets || exercise.defaultReps) && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-muted-foreground">Domyślne:</span>
                      <span data-testid={`text-exercise-defaults-${exercise.id}`}>
                        {exercise.defaultSets && `${exercise.defaultSets} serie`}
                        {exercise.defaultSets && exercise.defaultReps && " × "}
                        {exercise.defaultReps && `${exercise.defaultReps} powtórzeń`}
                      </span>
                    </div>
                  )}

                  {exercise.defaultLoad && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-muted-foreground">Obciążenie:</span>
                      <span data-testid={`text-exercise-load-${exercise.id}`}>
                        {exercise.defaultLoad}
                      </span>
                    </div>
                  )}

                  {exercise.defaultRestTime && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-muted-foreground">Odpoczynek:</span>
                      <span data-testid={`text-exercise-rest-${exercise.id}`}>
                        {exercise.defaultRestTime}s
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="gap-2 flex-wrap">
                <ExerciseDialog
                  exercise={exercise}
                  trigger={
                    <Button
                      variant="outline"
                      size="sm"
                      data-testid={`button-edit-${exercise.id}`}
                    >
                      <Pencil className="w-4 h-4 mr-2" />
                      Edytuj
                    </Button>
                  }
                />

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      data-testid={`button-delete-${exercise.id}`}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Usuń
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Czy na pewno?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Ta operacja jest nieodwracalna. Ćwiczenie zostanie trwale usunięte z biblioteki.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel data-testid={`button-cancel-delete-${exercise.id}`}>
                        Anuluj
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteMutation.mutate(exercise.id)}
                        data-testid={`button-confirm-delete-${exercise.id}`}
                      >
                        Usuń ćwiczenie
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}
