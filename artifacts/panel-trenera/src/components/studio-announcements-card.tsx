import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Megaphone, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Announcement {
  id: string;
  title: string;
  body: string;
  createdAt: string;
}

const formatDate = (value: string) =>
  new Date(value).toLocaleString("pl-PL", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

/** Studio owner: write an announcement, every active trainer gets a push notification. */
export function StudioAnnouncementsCard() {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const listQuery = useQuery<Announcement[]>({ queryKey: ["/api/gym/announcements"] });

  const sendMutation = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/gym/announcements", { title, body }),
    onSuccess: (result) => {
      toast({
        title: "Ogłoszenie wysłane",
        description:
          result?.notifiedTrainers > 0
            ? `Powiadomiliśmy ${result.notifiedTrainers} ${result.notifiedTrainers === 1 ? "trenera" : "trenerów"}.`
            : "Nie masz jeszcze aktywnych trenerów — zobaczą je po dołączeniu.",
      });
      setTitle("");
      setBody("");
      queryClient.invalidateQueries({ queryKey: ["/api/gym/announcements"] });
    },
    onError: () =>
      toast({ title: "Nie udało się wysłać", description: "Sprawdź tytuł i treść, a potem spróbuj ponownie.", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/gym/announcements/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/gym/announcements"] }),
    onError: () => toast({ title: "Błąd", description: "Nie udało się usunąć ogłoszenia.", variant: "destructive" }),
  });

  const items = listQuery.data ?? [];

  return (
    <Card data-testid="card-studio-announcements">
      <CardHeader>
        <CardTitle className="font-heading flex items-center gap-2">
          <Megaphone className="w-5 h-5" />
          Ogłoszenia dla trenerów
        </CardTitle>
        <CardDescription>Wiadomość trafi do wszystkich aktywnych trenerów studia jako powiadomienie.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (title.trim() && body.trim()) sendMutation.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="announcement-title">Tytuł</Label>
            <Input id="announcement-title" value={title} maxLength={150} onChange={(e) => setTitle(e.target.value)} data-testid="input-announcement-title" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="announcement-body">Treść</Label>
            <Textarea id="announcement-body" rows={4} value={body} maxLength={2000} onChange={(e) => setBody(e.target.value)} data-testid="input-announcement-body" />
          </div>
          <Button type="submit" disabled={sendMutation.isPending || !title.trim() || !body.trim()} data-testid="button-send-announcement">
            {sendMutation.isPending ? "Wysyłanie..." : "Wyślij ogłoszenie"}
          </Button>
        </form>

        {items.length > 0 && (
          <div className="space-y-3" data-testid="list-announcements">
            <p className="text-sm font-medium">Wysłane</p>
            {items.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
                <div className="min-w-0">
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">{item.body}</p>
                  <p className="text-xs text-muted-foreground mt-1">{formatDate(item.createdAt)}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Usuń ogłoszenie"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(item.id)}
                  data-testid={`button-delete-announcement-${item.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
