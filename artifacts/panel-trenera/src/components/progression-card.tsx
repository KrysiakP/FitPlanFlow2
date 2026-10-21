import { useMutation, useQuery } from "@tanstack/react-query";
import { TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Proposal {
  exerciseId: string;
  exercise: string;
  workout: string;
  from: number;
  to: number;
  planLoad: number | null;
  reason: string;
}

const kg = (value: number) => `${String(value).replace(".", ",")} kg`;

/** Weight increases the client has earned: the latest session was done in full at the top weight. The trainer applies them one by one. */
export function ProgressionCard({ clientId }: { clientId?: string }) {
  const { toast } = useToast();
  const key = `/api/trainer/clients/${clientId}/progression`;
  const { data } = useQuery<Proposal[]>({ queryKey: [key], enabled: Boolean(clientId) });

  const apply = useMutation({
    mutationFn: async (proposal: Proposal) => apiRequest("PUT", `/api/exercises/${proposal.exerciseId}`, { load: String(proposal.to) }),
    onSuccess: async (_result, proposal) => {
      await queryClient.invalidateQueries({ queryKey: [key] });
      toast({ title: "Ciężar zmieniony w planie", description: `${proposal.exercise}: ${kg(proposal.to)}` });
    },
    onError: () => toast({ title: "Nie udało się zmienić ciężaru", variant: "destructive" }),
  });

  if (!data || data.length === 0) return null;
  return (
    <Card data-testid="card-progression">
      <CardHeader>
        <CardTitle className="font-heading flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Propozycje progresji
        </CardTitle>
        <CardDescription>
          Ćwiczenia, które podopieczny wykonał w ostatnim treningu w całości. Zmiana ciężaru dotyczy planu, więc zobaczą ją też inni podopieczni z tym samym planem.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {data.map((proposal) => (
            <li key={proposal.exerciseId} className="flex flex-wrap items-center justify-between gap-3 text-sm" data-testid={`proposal-${proposal.exerciseId}`}>
              <div>
                <p className="font-medium">
                  {proposal.exercise} <span className="text-muted-foreground font-normal">· {proposal.workout}</span>
                </p>
                <p className="text-muted-foreground">
                  {proposal.reason}. Proponowane: <span className="font-medium text-foreground">{kg(proposal.to)}</span>
                  {proposal.planLoad !== null && <> (w planie: {kg(proposal.planLoad)})</>}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => apply.mutate(proposal)} disabled={apply.isPending} data-testid={`button-apply-${proposal.exerciseId}`}>
                Zastosuj
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
