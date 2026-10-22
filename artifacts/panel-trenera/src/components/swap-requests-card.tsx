import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Row {
  id: string;
  kind: "exercise" | "meal";
  clientFirstName: string | null;
  clientLastName: string | null;
  what: string; // the exercise or the meal
  where: string | null; // the workout, for an exercise
  reason: string;
}

const EXERCISES = ["/api/trainer/exercise-swaps"];
const MEALS = ["/api/trainer/meal-swaps"];

/** The trainer's inbox of substitute requests: approve with a replacement (valid for that client only) or leave the exercise as it is. */
export function SwapRequestsCard() {
  const { toast } = useToast();
  const exerciseRows = useQuery<{ id: string; clientFirstName: string | null; clientLastName: string | null; exercise: string; workout: string; reason: string }[]>({ queryKey: EXERCISES });
  const mealRows = useQuery<{ id: string; clientFirstName: string | null; clientLastName: string | null; meal: string; reason: string }[]>({ queryKey: MEALS });
  const data: Row[] = [
    ...(exerciseRows.data ?? []).map((row): Row => ({ id: row.id, kind: "exercise", clientFirstName: row.clientFirstName, clientLastName: row.clientLastName, what: row.exercise, where: row.workout, reason: row.reason })),
    ...(mealRows.data ?? []).map((row): Row => ({ id: row.id, kind: "meal", clientFirstName: row.clientFirstName, clientLastName: row.clientLastName, what: row.meal, where: null, reason: row.reason })),
  ];
  const [replacements, setReplacements] = useState<Record<string, string>>({});

  const answer = useMutation({
    mutationFn: async (input: { id: string; kind: Row["kind"]; decision: "approve" | "reject"; replacementName?: string }) =>
      apiRequest("PUT", `/api/trainer/${input.kind === "meal" ? "meal" : "exercise"}-swaps/${input.id}`, { decision: input.decision, replacementName: input.replacementName }),
    onSuccess: async (_result, input) => {
      await queryClient.invalidateQueries({ queryKey: input.kind === "meal" ? MEALS : EXERCISES });
      toast({ title: input.decision === "approve" ? "Zamiennik zatwierdzony" : "Ćwiczenie zostaje bez zmian", description: "Podopieczny dostał powiadomienie." });
    },
    onError: () => toast({ title: "Nie udało się zapisać odpowiedzi", variant: "destructive" }),
  });

  if (data.length === 0) return null;
  return (
    <Card className="border-primary/30" data-testid="card-swap-requests">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-heading text-lg">
          <Repeat className="w-5 h-5 text-primary" />
          Prośby o zamiennik ({data.length})
        </CardTitle>
        <CardDescription>Zatwierdzony zamiennik dotyczy tylko tego podopiecznego. Plan zostaje bez zmian.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.map((row) => {
          const replacement = replacements[row.id] ?? "";
          return (
            <div key={row.id} className="space-y-2 border-b pb-4 last:border-0 last:pb-0" data-testid={`swap-request-${row.id}`}>
              <p className="text-sm">
                <span className="font-medium">{[row.clientFirstName, row.clientLastName].filter(Boolean).join(" ") || "Podopieczny"}</span>
                {" "}prosi o zamiennik {row.kind === "meal" ? "posiłku" : "ćwiczenia"}: <span className="font-medium">{row.what}</span>
                {row.where && <span className="text-muted-foreground"> ({row.where})</span>}
              </p>
              <p className="text-sm text-muted-foreground">„{row.reason}”</p>
              <div className="flex flex-wrap gap-2">
                <Input
                  value={replacement}
                  onChange={(event) => setReplacements({ ...replacements, [row.id]: event.target.value })}
                  placeholder={row.kind === "meal" ? "Posiłek zastępczy" : "Ćwiczenie zastępcze"}
                  aria-label={row.kind === "meal" ? "Posiłek zastępczy" : "Ćwiczenie zastępcze"}
                  className="max-w-xs"
                  data-testid={`input-replacement-${row.id}`}
                />
                <Button size="sm" onClick={() => answer.mutate({ id: row.id, kind: row.kind, decision: "approve", replacementName: replacement })} disabled={answer.isPending || replacement.trim().length < 2} data-testid={`button-approve-${row.id}`}>
                  Zatwierdź
                </Button>
                <Button size="sm" variant="outline" onClick={() => answer.mutate({ id: row.id, kind: row.kind, decision: "reject" })} disabled={answer.isPending} data-testid={`button-reject-${row.id}`}>
                  Zostaw bez zmian
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
