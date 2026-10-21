import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ClipboardList, FileText, Hourglass, Moon } from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface AttentionItem {
  clientId: string;
  name: string;
  score: number;
  reasons: { type: string; label: string }[];
}

const REASON_ICON: Record<string, { Icon: typeof AlertCircle; className: string }> = {
  overdue_payment: { Icon: AlertCircle, className: "text-red-500" },
  no_plan: { Icon: ClipboardList, className: "text-indigo-500" },
  inactive: { Icon: Moon, className: "text-amber-500" },
  never_trained: { Icon: Hourglass, className: "text-amber-500" },
  new_report: { Icon: FileText, className: "text-emerald-500" },
};

/** Clients who need the trainer today, most urgent first. Hidden when everything is fine. */
export function TrainerAttentionCard() {
  const { toast } = useToast();
  const { data } = useQuery<AttentionItem[]>({ queryKey: ["/api/trainer/attention"] });
  const [sending, setSending] = useState(false);
  const items = data ?? [];
  if (items.length === 0) return null;

  // clients who have not trained lately (or never started) can all be nudged at once
  const idle = items.filter((item) => item.reasons.some((reason) => reason.type === "inactive" || reason.type === "never_trained"));

  async function remindIdle() {
    setSending(true);
    let sent = 0;
    for (const item of idle) {
      try {
        await apiRequest("POST", `/api/trainer/clients/${item.clientId}/remind`, {});
        sent += 1;
      } catch {
        /* one failed reminder must not stop the others */
      }
    }
    setSending(false);
    toast({ title: "Przypomnienia wysłane", description: `Wysłano ${sent} z ${idle.length}.` });
  }

  return (
    <Card data-testid="card-attention">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-heading">
          Wymaga uwagi
          <Badge variant="secondary">{items.length}</Badge>
        </CardTitle>
        <CardDescription>Podopieczni, którymi warto zająć się najpierw.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.slice(0, 5).map((item) => (
          <Link key={item.clientId} href="/clients">
            <div className="rounded-lg border p-3 hover-elevate cursor-pointer" data-testid={`attention-${item.clientId}`}>
              <p className="font-medium">{item.name}</p>
              <ul className="mt-1 space-y-1">
                {item.reasons.map((reason) => {
                  const { Icon, className } = REASON_ICON[reason.type] ?? REASON_ICON.new_report;
                  return (
                    <li key={reason.type} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Icon className={`w-4 h-4 ${className}`} aria-hidden="true" />
                      {reason.label}
                    </li>
                  );
                })}
              </ul>
            </div>
          </Link>
        ))}
        {idle.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => void remindIdle()} disabled={sending} data-testid="button-remind-idle">
            {sending ? "Wysyłam…" : `Przypomnij o treningu (${idle.length})`}
          </Button>
        )}
        {items.length > 5 && (
          <Link href="/clients" className="text-sm text-primary hover:underline">
            I jeszcze {items.length - 5} — zobacz podopiecznych
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
