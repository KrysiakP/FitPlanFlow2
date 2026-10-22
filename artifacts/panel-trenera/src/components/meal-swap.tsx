import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Repeat } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface MealSwapRow {
  id: string;
  mealId: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  replacementName: string | null;
  trainerNote: string | null;
}

const KEY = ["/api/client/meal-swaps"];

/** Under a meal of the client's diet: ask the trainer for a replacement meal, or see the answer. */
export function MealSwap({ mealId }: { mealId: string }) {
  const { toast } = useToast();
  const { data } = useQuery<MealSwapRow[]>({ queryKey: KEY });
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const latest = (data ?? []).find((row) => row.mealId === mealId); // newest first

  const ask = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/client/meal-swaps", { mealId, reason }),
    onSuccess: async () => {
      setOpen(false);
      setReason("");
      await queryClient.invalidateQueries({ queryKey: KEY });
      toast({ title: "Prośba wysłana", description: "Trener dostał powiadomienie i odpowie, co zjeść zamiast tego posiłku." });
    },
    onError: (error: unknown) =>
      toast({ title: "Nie udało się wysłać", description: error instanceof Error ? error.message.replace(/^\d+:\s*/, "") : undefined, variant: "destructive" }),
  });

  return (
    <div className="text-sm" data-testid={`meal-swap-${mealId}`}>
      {latest?.status === "pending" && <Badge variant="secondary">Czekasz na odpowiedź trenera w sprawie zamiennika</Badge>}
      {latest?.status === "approved" && (
        <div className="rounded-md bg-primary/10 px-3 py-2" data-testid={`meal-swap-approved-${mealId}`}>
          <p className="font-medium">Zamiennik od trenera: {latest.replacementName}</p>
          {latest.trainerNote && <p className="text-muted-foreground">{latest.trainerNote}</p>}
        </div>
      )}
      {latest?.status === "rejected" && (
        <p className="text-muted-foreground">Trener zostawił ten posiłek bez zmian.{latest.trainerNote ? ` ${latest.trainerNote}` : ""}</p>
      )}
      {latest?.status !== "pending" && !open && (
        <Button variant="ghost" size="sm" className="px-0" onClick={() => setOpen(true)} data-testid={`button-ask-meal-swap-${mealId}`}>
          <Repeat className="w-4 h-4 mr-2" />
          Poproś o zamiennik
        </Button>
      )}
      {open && (
        <div className="mt-1 flex flex-wrap gap-2">
          <Input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={300}
            placeholder="Dlaczego? (np. alergia, nie mam składników)"
            aria-label="Powód prośby o zamiennik posiłku"
            className="max-w-md"
            data-testid={`input-meal-swap-reason-${mealId}`}
          />
          <Button size="sm" onClick={() => ask.mutate()} disabled={ask.isPending || reason.trim().length < 3} data-testid={`button-send-meal-swap-${mealId}`}>
            Wyślij prośbę
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Anuluj</Button>
        </div>
      )}
    </div>
  );
}
