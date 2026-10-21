import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { MessageSquareWarning } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ExerciseNote {
  id: string;
  exercise: string;
  note: string;
  load: string | null;
  reps: number;
  loggedAt: string;
}

/** What the client wrote next to their sets ("kolano pobolewa"): the trainer's early warning. */
export function ExerciseNotesCard({ clientId }: { clientId?: string }) {
  const { data } = useQuery<ExerciseNote[]>({
    queryKey: [`/api/trainer/clients/${clientId}/exercise-notes`],
    enabled: Boolean(clientId),
  });
  if (!data || data.length === 0) return null;

  return (
    <Card data-testid="card-exercise-notes">
      <CardHeader>
        <CardTitle className="font-heading flex items-center gap-2">
          <MessageSquareWarning className="w-5 h-5" />
          Uwagi podopiecznego z treningów
        </CardTitle>
        <CardDescription>Co zapisał przy seriach, od najnowszych.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {data.map((item) => (
            <li key={item.id} className="text-sm" data-testid={`exercise-note-${item.id}`}>
              <p className="font-medium">
                {item.exercise}
                <span className="text-muted-foreground font-normal">
                  {" "}
                  · {item.load ? `${item.load} kg × ` : ""}
                  {item.reps} · {format(new Date(item.loggedAt), "d MMM", { locale: pl })}
                </span>
              </p>
              <p className="text-muted-foreground">{item.note}</p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
