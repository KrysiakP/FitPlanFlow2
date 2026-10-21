import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Slot {
  startsAt: string;
  durationMinutes: number;
}

const dayKey = (iso: string) => new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Europe/Warsaw" });
const dayLabel = (iso: string) => new Date(iso).toLocaleDateString("pl-PL", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Warsaw" });
const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Warsaw" });

/** Free slots of the client's trainer, grouped by day; one click books one. Nothing is shown when the trainer set no hours. */
export function BookSlotCard() {
  const { toast } = useToast();
  const { data } = useQuery<{ trainerName: string | null; slots: Slot[] }>({ queryKey: ["/api/client/trainer-slots"] });
  const [pending, setPending] = useState<Slot | null>(null);

  const days = useMemo(() => {
    const groups = new Map<string, Slot[]>();
    for (const slot of data?.slots ?? []) groups.set(dayKey(slot.startsAt), [...(groups.get(dayKey(slot.startsAt)) ?? []), slot]);
    return [...groups.entries()].slice(0, 7);
  }, [data]);

  const book = useMutation({
    mutationFn: async (slot: Slot) => apiRequest("POST", "/api/client/book-slot", { startsAt: slot.startsAt }),
    onSuccess: async (_result, slot) => {
      setPending(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/client/trainer-slots"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/client/sessions"] }),
      ]);
      toast({ title: "Termin zarezerwowany", description: `${dayLabel(slot.startsAt)}, ${timeLabel(slot.startsAt)}. Trener dostał powiadomienie.` });
    },
    onError: async (error: unknown) => {
      setPending(null);
      await queryClient.invalidateQueries({ queryKey: ["/api/client/trainer-slots"] });
      toast({ title: "Nie udało się zarezerwować", description: error instanceof Error ? error.message.replace(/^\d+:\s*/, "") : undefined, variant: "destructive" });
    },
  });

  if (!data || data.slots.length === 0) return null;
  return (
    <Card data-testid="card-book-slot">
      <CardHeader>
        <CardTitle className="font-heading flex items-center gap-2 text-lg">
          <CalendarPlus className="w-5 h-5 text-primary" />
          Umów trening
        </CardTitle>
        <CardDescription>Wolne terminy trenera{data.trainerName ? ` ${data.trainerName}` : ""}. Odwołać możesz najpóźniej 24 h przed.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {days.map(([key, slots]) => (
          <div key={key}>
            <p className="text-sm font-medium first-letter:uppercase mb-2">{dayLabel(slots[0].startsAt)}</p>
            <div className="flex flex-wrap gap-2">
              {slots.map((slot) => (
                <Button key={slot.startsAt} size="sm" variant={pending?.startsAt === slot.startsAt ? "default" : "outline"} onClick={() => setPending(slot)} data-testid={`slot-${slot.startsAt}`}>
                  {timeLabel(slot.startsAt)}
                </Button>
              ))}
            </div>
          </div>
        ))}
        {pending && (
          <div className="flex flex-wrap items-center gap-3 rounded-md bg-muted p-3 text-sm" data-testid="book-confirm">
            <span>
              Zarezerwować <strong>{dayLabel(pending.startsAt)}, {timeLabel(pending.startsAt)}</strong> ({pending.durationMinutes} min)?
            </span>
            <Button size="sm" onClick={() => book.mutate(pending)} disabled={book.isPending} data-testid="button-confirm-book">Zarezerwuj</Button>
            <Button size="sm" variant="ghost" onClick={() => setPending(null)}>Anuluj</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
