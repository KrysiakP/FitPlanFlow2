import { useQuery } from "@tanstack/react-query";
import { Gift, Link as LinkIcon } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

type ReferralStats = { qualifiedReferrals: number; totalBonusDaysEarned: number };

/** The referral program on the trainer's dashboard from day one: the link to copy and what it has brought so far. */
export function ReferralPromoCard() {
  const { toast } = useToast();
  const { data: code } = useQuery<{ code: string } | null>({ queryKey: ["/api/referrals/my-code"] });
  const { data: stats } = useQuery<ReferralStats>({ queryKey: ["/api/referrals/my-stats"] });
  if (!code?.code) return null;

  const link = `${window.location.origin}/register?ref=${code.code}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast({ title: "Skopiowano!", description: "Wyślij ten link innemu trenerowi — za każdą opłaconą subskrypcję dostajesz darmowe dni." });
    } catch {
      toast({ title: "Nie udało się skopiować", description: link, variant: "destructive" });
    }
  };

  const earned = stats?.totalBonusDaysEarned ?? 0;
  return (
    <Card className="border-primary/30" data-testid="card-referral-promo">
      <CardContent className="p-4 md:p-6 flex flex-col md:flex-row md:items-center gap-4">
        <div className="p-3 rounded-lg bg-primary/10 shrink-0 w-fit">
          <Gift className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-heading font-semibold">Poleć Panel Trenera i odbierz darmowe dni</p>
          <p className="text-sm text-muted-foreground" data-testid="text-referral-promo-summary">
            {earned > 0
              ? `Masz już ${earned} dni bonusu z poleceń. Każda opłacona subskrypcja poleconej osoby to kolejne dni.`
              : "Za każdą opłaconą subskrypcję osoby, którą polecisz, dostajesz darmowe dni abonamentu."}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button onClick={copy} data-testid="button-copy-referral-link">
            <LinkIcon className="w-4 h-4 mr-2" />
            Kopiuj link
          </Button>
          <Button asChild variant="outline" data-testid="link-referrals">
            <Link href="/referrals">Szczegóły</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
