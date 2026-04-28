import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Copy, 
  Users, 
  TrendingUp, 
  Gift,
  CheckCircle2,
  Clock,
  UserPlus,
  ShoppingCart,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import type { ReferralCode, ReferralEvent, User } from "@shared/schema";

type ReferralStats = {
  totalReferrals: number;
  qualifiedReferrals: number;
  pendingReferrals: number;
  totalBonusDaysEarned: number;
};

type ReferralWithUser = ReferralEvent & {
  referredUser: User;
  metadata?: { source?: string; ipAddress?: string; emailHash?: string } | null;
};

export default function Referrals() {
  const { toast } = useToast();

  const { data: referralCode, isLoading: isLoadingCode } = useQuery<ReferralCode | null>({
    queryKey: ["/api/referrals/my-code"],
  });

  const { data: stats, isLoading: isLoadingStats } = useQuery<ReferralStats>({
    queryKey: ["/api/referrals/my-stats"],
  });

  const { data: referrals, isLoading: isLoadingReferrals } = useQuery<ReferralWithUser[]>({
    queryKey: ["/api/referrals/my-referrals"],
  });

  const copyToClipboard = async (text: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Skopiowano!",
        description: successMessage,
      });
    } catch (error) {
      toast({
        title: "Błąd",
        description: "Nie udało się skopiować do schowka",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "qualified":
        return <Badge variant="default" className="bg-green-600 dark:bg-green-700" data-testid={`badge-status-qualified`}>Zakwalifikowany</Badge>;
      case "pending":
        return (
          <Badge variant="secondary" className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200" data-testid={`badge-status-pending`}>
            Oczekuje na płatność
          </Badge>
        );
      case "bonus_granted":
        return (
          <Badge variant="default" className="bg-green-600 dark:bg-green-700" data-testid={`badge-status-bonus-granted`}>
            Zapłacono — bonus przyznany
          </Badge>
        );
      default:
        return <Badge variant="outline" data-testid={`badge-status-unknown`}>{status}</Badge>;
    }
  };

  const getSourceNote = (referral: ReferralWithUser) => {
    const source = (referral.metadata as { source?: string } | null)?.source;
    if (source === 'checkout') {
      return (
        <span className="flex items-center gap-1 text-xs text-muted-foreground mt-1" data-testid={`text-referral-source-${referral.id}`}>
          <ShoppingCart className="w-3 h-3 shrink-0" />
          Kod wpisany ręcznie przy zakupie subskrypcji
        </span>
      );
    }
    return null;
  };

  const getRoleBadge = (role: string) => {
    return role === "trainer" ? (
      <Badge variant="outline" data-testid={`badge-role-trainer`}>Trener</Badge>
    ) : (
      <Badge variant="secondary" data-testid={`badge-role-client`}>Podopieczny</Badge>
    );
  };

  const registrationUrl = referralCode?.code 
    ? `${window.location.origin}/register?ref=${referralCode.code}`
    : "";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading font-bold text-4xl mb-2" data-testid="text-page-title">
          System poleceń
        </h1>
        <p className="text-muted-foreground">
          Poleć Panel Trenera i otrzymuj darmowe dni subskrypcji
        </p>
      </div>

      {/* Section 1: Referral Code Card */}
      <Card data-testid="card-referral-code">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Twój kod polecający
          </CardTitle>
          <CardDescription>
            Udostępnij swój kod znajomym lub skorzystaj z linku rejestracyjnego
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingCode ? (
            <>
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-10 w-full" />
            </>
          ) : referralCode ? (
            <>
              <div className="flex items-center justify-between gap-4 p-4 bg-primary/10 rounded-lg flex-wrap">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground mb-1">Kod polecający</p>
                  <p className="font-heading font-bold text-3xl text-primary" data-testid="text-referral-code">
                    {referralCode.code}
                  </p>
                </div>
                <Button
                  onClick={() => copyToClipboard(referralCode.code, "Kod polecający został skopiowany!")}
                  variant="outline"
                  size="sm"
                  data-testid="button-copy-code"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Kopiuj kod
                </Button>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Link rejestracyjny</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex-1 min-w-0 p-3 bg-muted rounded-lg">
                    <p className="text-sm truncate" data-testid="text-registration-url">
                      {registrationUrl}
                    </p>
                  </div>
                  <Button
                    onClick={() => copyToClipboard(registrationUrl, "Link rejestracyjny został skopiowany!")}
                    variant="outline"
                    size="sm"
                    data-testid="button-copy-url"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Kopiuj link
                  </Button>
                </div>
              </div>

              {referralCode.lastUsedAt && (
                <p className="text-sm text-muted-foreground" data-testid="text-last-used">
                  Ostatnio użyty: {format(new Date(referralCode.lastUsedAt), "d MMMM yyyy, HH:mm", { locale: pl })}
                </p>
              )}
            </>
          ) : (
            <Alert>
              <AlertDescription>
                Nie znaleziono kodu polecającego. Skontaktuj się z administratorem.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLoadingStats ? (
          <>
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </>
        ) : (
          <>
            <Card data-testid="card-stat-total">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Wszystkie polecenia</CardTitle>
                <Users className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-referrals">
                  {stats?.totalReferrals ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">Łączna liczba poleceń</p>
              </CardContent>
            </Card>

            <Card data-testid="card-stat-qualified">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Zakwalifikowane</CardTitle>
                <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <div className="text-2xl font-bold" data-testid="text-qualified-referrals">
                    {stats?.qualifiedReferrals ?? 0}
                  </div>
                  <Badge variant="default" className="bg-green-600 dark:bg-green-700">
                    Aktywne
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">Polecenia zakwalifikowane</p>
              </CardContent>
            </Card>

            <Card data-testid="card-stat-pending">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Oczekujące</CardTitle>
                <Clock className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <div className="text-2xl font-bold" data-testid="text-pending-referrals">
                    {stats?.pendingReferrals ?? 0}
                  </div>
                  <Badge variant="secondary" className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">
                    W trakcie
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">Oczekuje na płatność</p>
              </CardContent>
            </Card>

            <Card data-testid="card-stat-bonus-days">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Dni bonusowe</CardTitle>
                <Gift className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary" data-testid="text-bonus-days">
                  {stats?.totalBonusDaysEarned ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">Darmowe dni subskrypcji</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Section 3: Referrals List */}
      <Card data-testid="card-referrals-list">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Historia poleceń
          </CardTitle>
          <CardDescription>
            Lista wszystkich użytkowników zarejestrowanych za pomocą Twojego kodu
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingReferrals ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : referrals && referrals.length > 0 ? (
            <div className="space-y-3">
              {referrals.map((referral) => (
                <Card key={referral.id} className="hover-elevate" data-testid={`card-referral-${referral.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate" data-testid={`text-referral-name-${referral.id}`}>
                          {referral.referredUser.firstName} {referral.referredUser.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground truncate" data-testid={`text-referral-email-${referral.id}`}>
                          {referral.referredUser.email}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1" data-testid={`text-referral-date-${referral.id}`}>
                          Zarejestrowany: {format(new Date(referral.createdAt), "d MMMM yyyy", { locale: pl })}
                        </p>
                        {referral.status === "bonus_granted" && referral.bonusGrantedAt && (
                          <p className="text-xs text-green-600 dark:text-green-400 mt-1" data-testid={`text-referral-bonus-date-${referral.id}`}>
                            Bonus przyznany: {format(new Date(referral.bonusGrantedAt), "d MMMM yyyy", { locale: pl })}
                          </p>
                        )}
                        {getSourceNote(referral)}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {getRoleBadge(referral.referredRole)}
                        {getStatusBadge(referral.status)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Alert data-testid="alert-no-referrals">
              <AlertDescription className="text-center py-8">
                <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="font-medium">Nie masz jeszcze żadnych poleceń</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Udostępnij swój kod polecający, aby zacząć zarabiać darmowe dni subskrypcji
                </p>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
