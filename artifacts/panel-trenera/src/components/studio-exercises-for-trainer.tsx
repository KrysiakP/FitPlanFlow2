import { useMutation, useQuery } from "@tanstack/react-query";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface StudioExercise {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
}

/** The studio's exercises on the trainer's library page, each with a button that copies it into their own library. */
export function StudioExercisesForTrainer() {
  const { toast } = useToast();
  const { data = [] } = useQuery<StudioExercise[]>({ queryKey: ["/api/trainer/gym/exercises"] });
  const copy = useMutation({
    mutationFn: async (id: string) => apiRequest("POST", `/api/trainer/gym/exercises/${id}/copy`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/exercises/library"] });
      toast({ title: "Dodano do Twojej biblioteki", description: "To Twoja kopia — możesz ją dowolnie zmieniać." });
    },
    onError: () => toast({ title: "Nie udało się skopiować", variant: "destructive" }),
  });
  if (data.length === 0) return null;

  return (
    <Card data-testid="card-studio-exercises">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Building2 className="w-5 h-5" />
          Ćwiczenia Twojego studia
        </CardTitle>
        <CardDescription>Skopiuj wybrane do swojej biblioteki, żeby używać ich w planach.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {data.map((exercise) => (
            <li key={exercise.id} className="flex items-center justify-between gap-3 text-sm" data-testid={`studio-copy-${exercise.id}`}>
              <div className="min-w-0">
                <p className="font-medium">
                  {exercise.name}
                  {exercise.category && <span className="text-muted-foreground font-normal"> · {exercise.category}</span>}
                </p>
                {exercise.description && <p className="text-muted-foreground line-clamp-1">{exercise.description}</p>}
              </div>
              <Button size="sm" variant="outline" onClick={() => copy.mutate(exercise.id)} disabled={copy.isPending} data-testid={`button-copy-${exercise.id}`}>
                Dodaj do mojej biblioteki
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
