import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface GoalResponse {
  goal: { startKg: number; targetKg: number; targetDate: string | null } | null;
  currentKg?: number;
  progress?: { percent: number; remainingKg: number; daysLeft: number | null; status: "reached" | "on_track" | "behind" | "no_deadline" | "overdue" };
}

const STATUS_TEXT: Record<NonNullable<GoalResponse["progress"]>["status"], string> = {
  reached: "Cel osiągnięty. Gratulacje!",
  on_track: "Jesteś na dobrej drodze.",
  behind: "Trochę za wolno względem terminu. Warto pogadać z trenerem.",
  no_deadline: "Bez terminu: idź swoim tempem.",
  overdue: "Termin minął. Ustaw nowy cel albo przedłuż termin.",
};

const kg = (value: number) => `${String(Math.round(value * 10) / 10).replace(".", ",")} kg`;

/** The client's body-weight goal: set it, see how far the latest weekly report has come. */
export function GoalCard() {
  const { toast } = useToast();
  const { data } = useQuery<GoalResponse>({ queryKey: ["/api/client/goal"] });
  const [editing, setEditing] = useState(false);
  const [targetKg, setTargetKg] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [startKg, setStartKg] = useState("");

  const save = useMutation({
    mutationFn: async () =>
      apiRequest("PUT", "/api/client/goal", {
        targetKg: Number(targetKg.replace(",", ".")),
        targetDate: targetDate ? new Date(`${targetDate}T12:00:00`).toISOString() : null,
        startKg: startKg ? Number(startKg.replace(",", ".")) : undefined,
      }),
    onSuccess: async () => {
      setEditing(false);
      await queryClient.invalidateQueries({ queryKey: ["/api/client/goal"] });
    },
    onError: (error: unknown) =>
      toast({ title: "Nie udało się zapisać celu", description: error instanceof Error ? error.message.replace(/^\d+:\s*/, "") : undefined, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async () => apiRequest("DELETE", "/api/client/goal"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/client/goal"] }),
  });

  if (!data) return null;
  const { goal, progress } = data;

  return (
    <Card data-testid="card-goal">
      <CardHeader>
        <CardTitle className="font-heading flex items-center gap-2">
          <Target className="w-5 h-5" />
          Mój cel
        </CardTitle>
        <CardDescription>Ustaw wagę docelową, a pokażemy, jak daleko jesteś według ostatniego raportu.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {goal && progress && !editing && (
          <div className="space-y-3" data-testid="goal-progress">
            <p className="text-lg font-medium">
              {kg(goal.startKg)} → {kg(goal.targetKg)}
              {data.currentKg !== undefined && <span className="text-muted-foreground text-sm font-normal"> · teraz {kg(data.currentKg)}</span>}
            </p>
            <Progress value={progress.percent} aria-label="Postęp do celu" />
            <p className="text-sm text-muted-foreground">
              {progress.percent}% drogi
              {progress.status !== "reached" && ` · zostało ${kg(progress.remainingKg)}`}
              {progress.daysLeft !== null && progress.status !== "reached" && ` · ${progress.daysLeft} dni do terminu`}
            </p>
            <p className="text-sm" data-testid="text-goal-status">{STATUS_TEXT[progress.status]}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(true)} data-testid="button-edit-goal">Zmień cel</Button>
              <Button variant="ghost" size="sm" onClick={() => remove.mutate()} disabled={remove.isPending} data-testid="button-delete-goal">Usuń cel</Button>
            </div>
          </div>
        )}

        {(!goal || editing) && (
          <form
            className="grid gap-3 sm:grid-cols-3"
            onSubmit={(event) => {
              event.preventDefault();
              save.mutate();
            }}
          >
            <div className="space-y-1">
              <Label htmlFor="goal-target">Waga docelowa (kg)</Label>
              <Input id="goal-target" inputMode="decimal" value={targetKg} onChange={(event) => setTargetKg(event.target.value)} data-testid="input-goal-target" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="goal-date">Termin (opcjonalnie)</Label>
              <Input id="goal-date" type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} data-testid="input-goal-date" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="goal-start">Waga teraz (gdy nie ma raportu)</Label>
              <Input id="goal-start" inputMode="decimal" value={startKg} onChange={(event) => setStartKg(event.target.value)} data-testid="input-goal-start" />
            </div>
            <div className="sm:col-span-3 flex gap-2">
              <Button type="submit" disabled={save.isPending || !targetKg} data-testid="button-save-goal">Zapisz cel</Button>
              {editing && <Button type="button" variant="ghost" onClick={() => setEditing(false)}>Anuluj</Button>}
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
