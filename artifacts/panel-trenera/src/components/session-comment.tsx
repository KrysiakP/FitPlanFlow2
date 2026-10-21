import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

/** The trainer's comment under a finished workout. An empty text removes it; the client gets a notification on every change. */
export function SessionComment({ sessionId, clientId, comment }: { sessionId: string; clientId?: string; comment: string | null | undefined }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(comment ?? "");

  const save = useMutation({
    mutationFn: async () => apiRequest("PUT", `/api/trainer/workout-sessions/${sessionId}/comment`, { comment: text.trim() }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [`/api/trainer/clients/${clientId}/workout-sessions`] });
      setOpen(false);
      toast({ title: text.trim() ? "Komentarz zapisany" : "Komentarz usunięty", description: text.trim() ? "Podopieczny dostał powiadomienie." : undefined });
    },
    onError: (error: unknown) =>
      toast({ title: "Nie udało się zapisać", description: error instanceof Error ? error.message.replace(/^\d+:\s*/, "") : undefined, variant: "destructive" }),
  });

  if (!open) {
    return (
      <div className="mt-3 text-sm" data-testid={`session-comment-${sessionId}`}>
        {comment && <p className="mb-2 whitespace-pre-wrap rounded-md bg-muted px-3 py-2">{comment}</p>}
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)} data-testid={`button-comment-${sessionId}`}>
          <MessageSquare className="w-4 h-4 mr-2" />
          {comment ? "Edytuj komentarz" : "Skomentuj trening"}
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2" data-testid={`session-comment-${sessionId}`}>
      <Textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        maxLength={1000}
        placeholder="Np. dobra robota, w kolejnym tygodniu dołóż 2,5 kg"
        data-testid={`input-comment-${sessionId}`}
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending} data-testid={`button-save-comment-${sessionId}`}>
          Zapisz
        </Button>
        <Button size="sm" variant="ghost" onClick={() => { setText(comment ?? ""); setOpen(false); }}>
          Anuluj
        </Button>
      </div>
    </div>
  );
}
