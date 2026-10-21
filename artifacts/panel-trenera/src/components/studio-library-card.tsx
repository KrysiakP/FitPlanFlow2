import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Library, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface StudioExercise {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  videoUrl: string | null;
}

const KEY = ["/api/gym/exercises"];
const errorText = (error: unknown) => (error instanceof Error ? error.message.replace(/^\d+:\s*/, "") : undefined);

/** The studio owner's shared exercise library: every member trainer can copy these into their own. */
export function StudioLibraryCard() {
  const { toast } = useToast();
  const { data = [] } = useQuery<StudioExercise[]>({ queryKey: KEY });
  const [form, setForm] = useState({ name: "", category: "", description: "", videoUrl: "" });

  const add = useMutation({
    mutationFn: async () =>
      apiRequest("POST", "/api/gym/exercises", {
        name: form.name.trim(),
        category: form.category.trim() || null,
        description: form.description.trim() || null,
        videoUrl: form.videoUrl.trim() || null,
      }),
    onSuccess: async () => {
      setForm({ name: "", category: "", description: "", videoUrl: "" });
      await queryClient.invalidateQueries({ queryKey: KEY });
      toast({ title: "Ćwiczenie dodane do biblioteki studia" });
    },
    onError: (error) => toast({ title: "Nie udało się dodać", description: errorText(error), variant: "destructive" }),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/gym/exercises/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: KEY });
      toast({ title: "Ćwiczenie usunięte", description: "Trenerzy, którzy je już skopiowali, zachowują swoją kopię." });
    },
  });

  return (
    <Card data-testid="card-studio-library">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Library className="w-5 h-5" />
          Biblioteka studia
        </CardTitle>
        <CardDescription>Ćwiczenia, które widzą wszyscy trenerzy studia. Każdy może skopiować je do swojej biblioteki.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Biblioteka jest pusta.</p>
        ) : (
          <ul className="space-y-2">
            {data.map((exercise) => (
              <li key={exercise.id} className="flex items-start justify-between gap-3 text-sm" data-testid={`studio-exercise-${exercise.id}`}>
                <div className="min-w-0">
                  <p className="font-medium">
                    {exercise.name}
                    {exercise.category && <span className="text-muted-foreground font-normal"> · {exercise.category}</span>}
                  </p>
                  {exercise.description && <p className="text-muted-foreground line-clamp-2">{exercise.description}</p>}
                </div>
                <Button variant="ghost" size="icon" aria-label={`Usuń ${exercise.name}`} onClick={() => remove.mutate(exercise.id)} disabled={remove.isPending}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <form
          className="space-y-2 border-t pt-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (form.name.trim()) add.mutate();
          }}
        >
          <div className="grid gap-2 sm:grid-cols-2">
            <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Nazwa ćwiczenia" aria-label="Nazwa ćwiczenia" data-testid="input-studio-exercise-name" />
            <Input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} placeholder="Kategoria (np. Nogi)" aria-label="Kategoria" />
          </div>
          <Textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Opis lub wskazówki techniczne" aria-label="Opis" rows={2} />
          <Input value={form.videoUrl} onChange={(event) => setForm({ ...form, videoUrl: event.target.value })} placeholder="Link do filmu (YouTube, Vimeo)" aria-label="Link do filmu" />
          <Button type="submit" disabled={add.isPending || !form.name.trim()} data-testid="button-add-studio-exercise">
            Dodaj do biblioteki studia
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
