import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

/** The trainer's comment under a weekly report (and its photo). An empty text removes it; the client is notified on every change. */
export function ReportComment({ reportId, clientId, comment }: { reportId: string; clientId: string; comment: string | null | undefined }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(comment ?? "");

  const save = useMutation({
    mutationFn: async () => apiRequest("PUT", `/api/trainer/reports/${reportId}/comment`, { comment: text.trim() }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/reports`] });
      setOpen(false);
      toast({ title: text.trim() ? "Komentarz zapisany" : "Komentarz usunięty", description: text.trim() ? "Podopieczny dostał powiadomienie." : undefined });
    },
    onError: (error: unknown) =>
      toast({ title: "Nie udało się zapisać", description: error instanceof Error ? error.message.replace(/^\d+:\s*/, "") : undefined, variant: "destructive" }),
  });

  if (!open) {
    return (
      <div className="text-sm" data-testid={`report-comment-${reportId}`}>
        {comment && (
          <p className="mb-2 whitespace-pre-wrap rounded-md bg-muted px-3 py-2" data-testid={`text-report-comment-${reportId}`}>
            {comment}
          </p>
        )}
        <Button variant="outline" size="sm" onClick={() => { setText(comment ?? ""); setOpen(true); }} data-testid={`button-report-comment-${reportId}`}>
          <MessageSquare className="w-4 h-4 mr-2" />
          {comment ? "Edytuj komentarz" : "Skomentuj raport i zdjęcie"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2" data-testid={`report-comment-${reportId}`}>
      <Textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        maxLength={1000}
        placeholder="Np. sylwetka wygląda świetnie, przy kolejnym zdjęciu zadbaj o to samo światło"
        data-testid={`input-report-comment-${reportId}`}
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending} data-testid={`button-save-report-comment-${reportId}`}>
          Zapisz
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Anuluj
        </Button>
      </div>
    </div>
  );
}
