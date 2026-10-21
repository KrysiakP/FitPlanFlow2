import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Building2, Pin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface TrainerGym {
  gym: { id: string; name: string } | null;
  status?: "active" | "suspended";
}

function messageFrom(error: unknown, fallback: string) {
  const raw = error instanceof Error ? error.message : "";
  const idx = raw.indexOf(": ");
  if (idx > -1) {
    try {
      const parsed = JSON.parse(raw.slice(idx + 2));
      if (parsed?.message) return String(parsed.message);
    } catch {
      /* not JSON */
    }
  }
  return fallback;
}

interface StudioInvitation {
  id: string;
  gymName: string;
  inviteCode: string;
}

interface StudioAnnouncement {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  pinned: boolean;
  read: boolean;
}

export function StudioMembershipCard() {
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const { data, isLoading, isError } = useQuery<TrainerGym>({ queryKey: ["/api/trainer/gym"] });

  const announcementsQuery = useQuery<StudioAnnouncement[]>({
    queryKey: ["/api/trainer/gym/announcements"],
    enabled: !!data?.gym && data.status === "active",
  });

  // Announcements that are on screen count as read: tell the studio once (never retried in a loop), then refresh the list
  const reportedRead = useRef(new Set<string>());
  useEffect(() => {
    const unread = (announcementsQuery.data ?? []).slice(0, 3).filter((item) => !item.read && !reportedRead.current.has(item.id));
    if (unread.length === 0) return;
    unread.forEach((item) => reportedRead.current.add(item.id));
    void Promise.all(unread.map((item) => apiRequest("POST", `/api/trainer/gym/announcements/${item.id}/read`).catch(() => undefined))).then(() =>
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/gym/announcements"] }),
    );
  }, [announcementsQuery.data]);

  const invitationsQuery = useQuery<StudioInvitation[]>({
    queryKey: ["/api/trainer/gym/invitations"],
    enabled: !!data && !data.gym,
  });

  const joinMutation = useMutation({
    mutationFn: async (inviteCode: string) => apiRequest("POST", `/api/gym/join/${encodeURIComponent(inviteCode.trim().toUpperCase())}`, {}),
    onSuccess: () => {
      setCode("");
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/gym"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/gym/invitations"] });
      toast({ title: "Dołączyłeś do studia" });
    },
    onError: (error) =>
      toast({ title: "Nie udało się dołączyć", description: messageFrom(error, "Sprawdź kod i spróbuj ponownie."), variant: "destructive" }),
  });

  const leaveMutation = useMutation({
    mutationFn: async () => apiRequest("DELETE", "/api/trainer/gym"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/gym"] });
      toast({ title: "Opuściłeś studio" });
    },
    onError: () => toast({ title: "Błąd", description: "Nie udało się opuścić studia.", variant: "destructive" }),
  });

  return (
    <Card data-testid="card-studio-membership">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Studio
        </CardTitle>
        <CardDescription>Dołącz do studia lub klubu, który zaprosił Cię kodem.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Ładowanie...</p>
        ) : isError ? (
          <Alert variant="destructive">
            <AlertDescription>Nie udało się pobrać danych studia. Odśwież stronę.</AlertDescription>
          </Alert>
        ) : data?.gym ? (
          <>
            <p className="font-medium" data-testid="text-studio-name">{data.gym.name}</p>
            <p className="text-sm text-muted-foreground">
              {data.status === "suspended" ? "Członkostwo zawieszone przez właściciela studia" : "Jesteś członkiem tego studia"}
            </p>
            {(announcementsQuery.data ?? []).length > 0 && (
              <div className="space-y-2 pt-2" data-testid="list-studio-announcements">
                <p className="text-sm font-medium">Ogłoszenia studia</p>
                {(announcementsQuery.data ?? []).slice(0, 3).map((item) => (
                  <div key={item.id} className="rounded-md border p-3">
                    <p className="font-medium text-sm flex items-center gap-1.5">
                      {item.pinned && <Pin className="w-3.5 h-3.5 text-primary" aria-label="Przypięte" />}
                      {item.title}
                    </p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">{item.body}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(item.createdAt).toLocaleString("pl-PL", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" data-testid="button-leave-studio">Opuść studio</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Opuścić studio?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Przestaniesz należeć do „{data.gym.name}”. Twoi podopieczni i plany pozostają u Ciebie.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Anuluj</AlertDialogCancel>
                  <AlertDialogAction onClick={() => leaveMutation.mutate()}>Opuść</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        ) : (
          <>
          {(invitationsQuery.data ?? []).map((invitation) => (
            <div
              key={invitation.id}
              className="flex items-center justify-between gap-3 rounded-md border p-3"
              data-testid={`studio-invitation-${invitation.id}`}
            >
              <div>
                <p className="font-medium">{invitation.gymName}</p>
                <p className="text-sm text-muted-foreground">Zaprasza Cię do swojego studia</p>
              </div>
              <Button
                size="sm"
                disabled={joinMutation.isPending}
                onClick={() => joinMutation.mutate(invitation.inviteCode)}
                data-testid={`button-accept-invitation-${invitation.id}`}
              >
                Dołącz
              </Button>
            </div>
          ))}
          <form
            className="flex flex-col sm:flex-row gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (code.trim().length === 8) joinMutation.mutate(code);
            }}
          >
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={8}
              placeholder="Kod zaproszenia, np. A1B2C3D4"
              data-testid="input-studio-code"
            />
            <Button type="submit" disabled={code.trim().length !== 8 || joinMutation.isPending} data-testid="button-join-studio">
              {joinMutation.isPending ? "Dołączanie..." : "Dołącz"}
            </Button>
          </form>
          </>
        )}
      </CardContent>
    </Card>
  );
}
