import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Building2 } from "lucide-react";
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

export function StudioMembershipCard() {
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const { data, isLoading, isError } = useQuery<TrainerGym>({ queryKey: ["/api/trainer/gym"] });

  const joinMutation = useMutation({
    mutationFn: async () => apiRequest("POST", `/api/gym/join/${encodeURIComponent(code.trim().toUpperCase())}`, {}),
    onSuccess: () => {
      setCode("");
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/gym"] });
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
          <form
            className="flex flex-col sm:flex-row gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (code.trim().length === 8) joinMutation.mutate();
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
        )}
      </CardContent>
    </Card>
  );
}
