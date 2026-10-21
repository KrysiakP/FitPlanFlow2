import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CalendarClock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Window {
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
  slotMinutes: number;
}

const DAYS = ["Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota", "Niedziela"];
const SLOT_OPTIONS = [30, 45, 60, 90];
const minutesToTime = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
const timeToMinutes = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + (minutes || 0);
};

/** The trainer's weekly windows in which clients may book a session by themselves. */
export function AvailabilityCard() {
  const { toast } = useToast();
  const { data } = useQuery<{ windows: Window[] }>({ queryKey: ["/api/trainer/availability"] });
  const [windows, setWindows] = useState<Window[]>([]);
  const [draft, setDraft] = useState({ dayOfWeek: 1, from: "17:00", to: "20:00", slotMinutes: 60 });

  useEffect(() => {
    if (data) setWindows(data.windows);
  }, [data]);

  const save = useMutation({
    mutationFn: async (next: Window[]) => apiRequest("PUT", "/api/trainer/availability", { windows: next }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/trainer/availability"] });
      toast({ title: "Dostępność zapisana", description: "Podopieczni zobaczą wolne terminy i będą mogli je rezerwować." });
    },
    onError: (error: unknown) =>
      toast({ title: "Nie udało się zapisać", description: error instanceof Error ? error.message.replace(/^\d+:\s*/, "") : undefined, variant: "destructive" }),
  });

  const addWindow = () => {
    const next: Window = { dayOfWeek: draft.dayOfWeek, startMinute: timeToMinutes(draft.from), endMinute: timeToMinutes(draft.to), slotMinutes: draft.slotMinutes };
    if (next.endMinute - next.startMinute < next.slotMinutes) {
      toast({ title: "Za krótki przedział", description: "Przedział musi być co najmniej tak długi jak jeden termin.", variant: "destructive" });
      return;
    }
    setWindows((current) => [...current, next].sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startMinute - b.startMinute));
  };

  const unsaved = JSON.stringify(windows) !== JSON.stringify(data?.windows ?? []);

  return (
    <Card data-testid="card-availability">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="w-5 h-5" />
          Wolne terminy
        </CardTitle>
        <CardDescription>
          Wskaż, kiedy podopieczni mogą sami rezerwować treningi. Terminy, które już masz w kalendarzu, nie będą oferowane. Godziny w czasie polskim.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {windows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nie masz ustawionych godzin. Podopieczni nie widzą wolnych terminów.</p>
        ) : (
          <ul className="space-y-2">
            {windows.map((window, index) => (
              <li key={`${window.dayOfWeek}-${window.startMinute}-${index}`} className="flex items-center justify-between gap-3 text-sm" data-testid={`availability-window-${index}`}>
                <span>
                  <span className="font-medium">{DAYS[window.dayOfWeek - 1]}</span> {minutesToTime(window.startMinute)}–{minutesToTime(window.endMinute)}
                  <span className="text-muted-foreground"> · terminy po {window.slotMinutes} min</span>
                </span>
                <Button variant="ghost" size="icon" aria-label="Usuń przedział" onClick={() => setWindows((current) => current.filter((_, i) => i !== index))}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-end gap-2 border-t pt-4">
          <label className="text-xs text-muted-foreground flex flex-col gap-1">
            Dzień
            <select className="h-9 rounded-md border bg-background px-2 text-sm text-foreground" value={draft.dayOfWeek} onChange={(event) => setDraft({ ...draft, dayOfWeek: Number(event.target.value) })} data-testid="select-availability-day">
              {DAYS.map((day, index) => (
                <option key={day} value={index + 1}>{day}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-muted-foreground flex flex-col gap-1">
            Od
            <Input type="time" className="w-28" value={draft.from} onChange={(event) => setDraft({ ...draft, from: event.target.value })} data-testid="input-availability-from" />
          </label>
          <label className="text-xs text-muted-foreground flex flex-col gap-1">
            Do
            <Input type="time" className="w-28" value={draft.to} onChange={(event) => setDraft({ ...draft, to: event.target.value })} data-testid="input-availability-to" />
          </label>
          <label className="text-xs text-muted-foreground flex flex-col gap-1">
            Długość terminu
            <select className="h-9 rounded-md border bg-background px-2 text-sm text-foreground" value={draft.slotMinutes} onChange={(event) => setDraft({ ...draft, slotMinutes: Number(event.target.value) })}>
              {SLOT_OPTIONS.map((minutes) => (
                <option key={minutes} value={minutes}>{minutes} min</option>
              ))}
            </select>
          </label>
          <Button variant="outline" onClick={addWindow} data-testid="button-add-availability">Dodaj przedział</Button>
        </div>

        <Button onClick={() => save.mutate(windows)} disabled={save.isPending || !unsaved} data-testid="button-save-availability">
          Zapisz dostępność
        </Button>
      </CardContent>
    </Card>
  );
}
