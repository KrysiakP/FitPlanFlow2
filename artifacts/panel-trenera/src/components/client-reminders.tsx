import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { BellRing, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Reminder {
  id: string;
  clientId: string;
  text: string;
  dueDate: string;
}

/** The trainer's private reminders about one client; a push arrives on the due day. */
export function ClientReminders({ clientId }: { clientId: string }) {
  const { toast } = useToast();
  const { data } = useQuery<Reminder[]>({ queryKey: ["/api/trainer/reminders"] });
  const [text, setText] = useState("");
  const [date, setDate] = useState("");
  const mine = (data ?? []).filter((item) => item.clientId === clientId);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["/api/trainer/reminders"] });

  const add = useMutation({
    mutationFn: async () => apiRequest("POST", `/api/trainer/clients/${clientId}/reminders`, { text, dueDate: new Date(`${date}T12:00:00`).toISOString() }),
    onSuccess: async () => {
      setText("");
      setDate("");
      await refresh();
    },
    onError: (error: unknown) => toast({ title: "Nie udało się zapisać", description: error instanceof Error ? error.message.replace(/^\d+:\s*/, "") : undefined, variant: "destructive" }),
  });
  const done = useMutation({ mutationFn: async (id: string) => apiRequest("POST", `/api/trainer/reminders/${id}/done`), onSuccess: refresh });
  const remove = useMutation({ mutationFn: async (id: string) => apiRequest("DELETE", `/api/trainer/reminders/${id}`), onSuccess: refresh });

  return (
    <div className="space-y-2" data-testid={`reminders-${clientId}`}>
      <h3 className="font-heading font-semibold text-base md:text-lg flex items-center gap-2">
        <BellRing className="w-4 h-4 md:w-5 md:h-5" />
        Przypomnienia
      </h3>
      {mine.length > 0 && (
        <ul className="divide-y rounded-md border">
          {mine.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-2 p-2 text-sm" data-testid={`reminder-${item.id}`}>
              <span>
                <strong>{format(new Date(item.dueDate), "d MMM", { locale: pl })}</strong> · {item.text}
              </span>
              <span className="flex gap-1">
                <Button size="icon" variant="ghost" aria-label="Oznacz jako zrobione" onClick={() => done.mutate(item.id)} data-testid={`button-reminder-done-${item.id}`}>
                  <Check className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" aria-label="Usuń przypomnienie" onClick={() => remove.mutate(item.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </span>
            </li>
          ))}
        </ul>
      )}
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (text.trim() && date) add.mutate();
        }}
      >
        <Input value={text} maxLength={200} onChange={(event) => setText(event.target.value)} placeholder="np. zapytaj o kolano" aria-label="Treść przypomnienia" className="flex-1 min-w-48" data-testid={`input-reminder-text-${clientId}`} />
        <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} aria-label="Data przypomnienia" className="w-40" data-testid={`input-reminder-date-${clientId}`} />
        <Button type="submit" variant="outline" disabled={add.isPending || !text.trim() || !date} data-testid={`button-add-reminder-${clientId}`}>
          Dodaj
        </Button>
      </form>
    </div>
  );
}
