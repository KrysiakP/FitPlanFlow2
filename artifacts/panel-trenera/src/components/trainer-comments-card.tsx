import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { MessageSquare } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface SessionWithComment {
  id: string;
  workoutName: string | null;
  completedAt: string;
  trainerComment: string | null;
  trainerCommentedAt: string | null;
}

/** What the trainer wrote under the client's recent workouts, newest first. */
export function TrainerCommentsCard() {
  const { data } = useQuery<SessionWithComment[]>({ queryKey: ["/api/workout-sessions"] });
  const commented = (data ?? []).filter((session) => session.trainerComment).slice(0, 5);
  if (commented.length === 0) return null;

  return (
    <Card data-testid="card-trainer-comments">
      <CardHeader>
        <CardTitle className="font-heading flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Komentarze trenera
        </CardTitle>
        <CardDescription>Co trener napisał pod Twoimi ostatnimi treningami.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {commented.map((session) => (
            <li key={session.id} className="text-sm" data-testid={`trainer-comment-${session.id}`}>
              <p className="font-medium">
                {session.workoutName ?? "Trening"}
                <span className="text-muted-foreground font-normal"> · {format(new Date(session.completedAt), "d MMM", { locale: pl })}</span>
              </p>
              <p className="text-muted-foreground whitespace-pre-wrap">{session.trainerComment}</p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
