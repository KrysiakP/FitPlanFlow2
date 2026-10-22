import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Repeat } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export interface SwapRequestRow {
  id: string;
  exerciseId: string;
  exercise: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  replacementName: string | null;
  trainerNote: string | null;
}

const KEY = ["/api/client/exercise-swaps"];

/** Under an exercise of the client's plan: ask the trainer for a substitute, or see the answer (approved replacement or rejection). */
export function ExerciseSwap({ exerciseId }: { exerciseId: string }) {
  const { toast } = useToast();
  const { data } = useQuery<SwapRequestRow[]>({ queryKey: KEY });
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const latest = (data ?? []).find((row) => row.exerciseId === exerciseId); // newest first

  const ask = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/client/exercise-swaps", { exerciseId, reason }),
    onSuccess: async () => {
      setOpen(false);
      setReason("");
      await queryClient.invalidateQueries({ queryKey: KEY });
      toast({ title: "Prośba wysłana", description: "Trener dostał powiadomienie i odpowie, jaki zamiennik wykonać." });
    },
    onError: (error: unknown) =>
      toast({ title: "Nie udało się wysłać", description: error instanceof Error ? error.message.replace(/^\d+:\s*/, "") : undefined, variant: "destructive" }),
  });

  return (
    <div className="mt-3 text-sm" data-testid={`swap-${exerciseId}`}>
      {latest?.status === "pending" && (
        <Badge variant="secondary" data-testid={`swap-pending-${exerciseId}`}>Czekasz na odpowiedź trenera w sprawie zamiennika</Badge>
      )}
      {latest?.status === "approved" && (
        <div className="rounded-md bg-primary/10 px-3 py-2" data-testid={`swap-approved-${exerciseId}`}>
          <p className="font-medium">Zamiennik od trenera: {latest.replacementName}</p>
          {latest.trainerNote && <p className="text-muted-foreground">{latest.trainerNote}</p>}
        </div>
      )}
      {latest?.status === "rejected" && (
        <p className="text-muted-foreground" data-testid={`swap-rejected-${exerciseId}`}>
          Trener zostawił to ćwiczenie bez zmian.{latest.trainerNote ? ` ${latest.trainerNote}` : ""}
        </p>
      )}

      {latest?.status !== "pending" && !open && (
        <Button variant="ghost" size="sm" className="mt-1 px-0" onClick={() => setOpen(true)} data-testid={`button-ask-swap-${exerciseId}`}>
          <Repeat className="w-4 h-4 mr-2" />
          Poproś o zamiennik
        </Button>
      )}
      {open && (
        <div className="mt-2 flex flex-wrap gap-2">
          <Input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={300}
            placeholder="Dlaczego? (np. boli kolano, zajęta maszyna)"
            aria-label="Powód prośby o zamiennik"
            className="max-w-md"
            data-testid={`input-swap-reason-${exerciseId}`}
          />
          <Button size="sm" onClick={() => ask.mutate()} disabled={ask.isPending || reason.trim().length < 3} data-testid={`button-send-swap-${exerciseId}`}>
            Wyślij prośbę
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Anuluj</Button>
        </div>
      )}
    </div>
  );
}
