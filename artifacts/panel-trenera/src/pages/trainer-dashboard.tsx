import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ClipboardList, Users, UserPlus, Dumbbell, FileText, Heart, Crown, ShieldCheck, UtensilsCrossed, MessageSquare, DollarSign, TrendingUp, AlertTriangle } from "lucide-react";
import { Link } from "wouter";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";
import { format, startOfMonth, subMonths } from "date-fns";
import { pl } from "date-fns/locale";
import type { ClientPayment } from "@shared/schema";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function TrainerDashboard() {
  const { user } = useAuth();

  const { data: stats, isError: statsError } = useQuery<{
    totalPlans: number;
    totalClients: number;
    totalAssignments: number;
  }>({
    queryKey: ["/api/trainer/stats"],
  });

  const { data: payments, isError: paymentsError } = useQuery<ClientPayment[]>({
    queryKey: ["/api/payments"],
  });

  const businessStats = useMemo(() => {
    const list = payments ?? [];
    const now = new Date();

    const monthlyRevenue = Array.from({ length: 6 }).map((_, i) => {
      const monthDate = subMonths(now, 5 - i);
      const monthStart = startOfMonth(monthDate);
      const total = list
        .filter((p) => {
          if (!p.isPaid || !p.paidAt) return false;
          const paidDate = new Date(p.paidAt);
          return paidDate.getFullYear() === monthStart.getFullYear() && paidDate.getMonth() === monthStart.getMonth();
        })
        .reduce((sum, p) => sum + p.amount, 0);
      return {
        month: format(monthStart, "LLL", { locale: pl }),
        przychod: Math.round(total / 100),
      };
    });

    const thisMonthTotal = monthlyRevenue[monthlyRevenue.length - 1]?.przychod ?? 0;
    const overdueCount = list.filter((p) => !p.isPaid && new Date(p.dueDate) < now).length;

    return { monthlyRevenue, thisMonthTotal, overdueCount };
  }, [payments]);

  return (
    <div className="space-y-4 md:space-y-8">
      {(statsError || paymentsError) && (
        <Alert variant="destructive" data-testid="alert-dashboard-error">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Błąd ładowania</AlertTitle>
          <AlertDescription>
            Nie udało się pobrać części statystyk — liczby poniżej mogą być niekompletne. Odśwież stronę, aby spróbować ponownie.
          </AlertDescription>
        </Alert>
      )}
      <div>
        <h1 className="font-heading font-bold text-2xl md:text-4xl mb-2" data-testid="text-dashboard-title">
          Panel trenera
        </h1>
        <p className="text-muted-foreground text-sm md:text-base">
          Witaj, {user?.firstName || "Trenerze"}! Zarządzaj swoimi planami i podopiecznymi.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <Link href="/plans">
          <Card className="hover-elevate cursor-pointer" data-testid="card-quick-plans">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="p-2 md:p-3 bg-primary/10 rounded-lg">
                  <ClipboardList className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-heading font-semibold text-base md:text-lg">Plany treningowe</h3>
                  <p className="text-xs md:text-sm text-muted-foreground">Przeglądaj i edytuj swoje plany</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/exercise-library">
          <Card className="hover-elevate cursor-pointer" data-testid="card-quick-exercises">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="p-2 md:p-3 bg-primary/10 rounded-lg">
                  <Dumbbell className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-heading font-semibold text-base md:text-lg">Moje ćwiczenia</h3>
                  <p className="text-xs md:text-sm text-muted-foreground">Zarządzaj biblioteką ćwiczeń</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/clients">
          <Card className="hover-elevate cursor-pointer" data-testid="card-quick-clients">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="p-2 md:p-3 bg-primary/10 rounded-lg">
                  <Users className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-heading font-semibold text-base md:text-lg">Podopieczni</h3>
                  <p className="text-xs md:text-sm text-muted-foreground">Zarządzaj swoimi podopiecznymi</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/trainer/diets">
          <Card className="hover-elevate cursor-pointer" data-testid="card-quick-diets">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="p-2 md:p-3 bg-primary/10 rounded-lg">
                  <UtensilsCrossed className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-heading font-semibold text-base md:text-lg">Diety</h3>
                  <p className="text-xs md:text-sm text-muted-foreground">Zarządzaj planami żywieniowymi</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/invite">
          <Card className="hover-elevate cursor-pointer" data-testid="card-quick-invite">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="p-2 md:p-3 bg-primary/10 rounded-lg">
                  <UserPlus className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-heading font-semibold text-base md:text-lg">Zaproś podopiecznego</h3>
                  <p className="text-xs md:text-sm text-muted-foreground">Wyślij zaproszenie do współpracy</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/trainer/reports">
          <Card className="hover-elevate cursor-pointer" data-testid="card-quick-reports">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="p-2 md:p-3 bg-primary/10 rounded-lg">
                  <FileText className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-heading font-semibold text-base md:text-lg">Raporty tygodniowe</h3>
                  <p className="text-xs md:text-sm text-muted-foreground">Przeglądaj postępy podopiecznych</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/chat">
          <Card className="hover-elevate cursor-pointer" data-testid="card-quick-messages">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="p-2 md:p-3 bg-primary/10 rounded-lg">
                  <MessageSquare className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-heading font-semibold text-base md:text-lg">Wiadomości</h3>
                  <p className="text-xs md:text-sm text-muted-foreground">Czatuj z podopiecznymi</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/payment-schedule">
          <Card className="hover-elevate cursor-pointer" data-testid="card-quick-payments">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="p-2 md:p-3 bg-primary/10 rounded-lg">
                  <DollarSign className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-heading font-semibold text-base md:text-lg">Płatności</h3>
                  <p className="text-xs md:text-sm text-muted-foreground">Zarządzaj płatnościami</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        {user?.isAdmin && (
          <Link href="/admin/charity-donations">
            <Card className="hover-elevate cursor-pointer" data-testid="card-quick-admin">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="p-2 md:p-3 bg-primary/10 rounded-lg">
                    <ShieldCheck className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-heading font-semibold text-base md:text-lg">Panel Admin</h3>
                    <p className="text-xs md:text-sm text-muted-foreground">Zarządzaj raportami PomagaMY</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        )}

        <Link href="/pomagamy">
          <Card className="hover-elevate cursor-pointer" data-testid="card-quick-pomagamy">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="p-2 md:p-3 bg-red-100 dark:bg-red-950 rounded-lg">
                  <Heart className="w-5 h-5 md:w-6 md:h-6 text-red-600 dark:text-red-400" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-heading font-semibold text-base md:text-lg">PomagaMY</h3>
                  <p className="text-xs md:text-sm text-muted-foreground">Zobacz jak pomagamy dzieciom</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/pricing">
          <Card className="hover-elevate cursor-pointer" data-testid="card-quick-subscription">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="p-2 md:p-3 bg-primary/10 rounded-lg">
                  <Crown className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-heading font-semibold text-base md:text-lg">Subskrypcja</h3>
                  <p className="text-xs md:text-sm text-muted-foreground">Zarządzaj swoim planem</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <Link href="/plans">
          <Card className="hover-elevate cursor-pointer" data-testid="card-stat-plans">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Plany treningowe</CardTitle>
              <ClipboardList className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-plans">
                {stats?.totalPlans ?? 0}
              </div>
              <p className="text-xs text-muted-foreground">Łączna liczba planów</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/clients">
          <Card className="hover-elevate cursor-pointer" data-testid="card-stat-clients">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Podopieczni</CardTitle>
              <Users className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-clients">
                {stats?.totalClients ?? 0}
              </div>
              <p className="text-xs text-muted-foreground">Aktywni podopieczni</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/plans">
          <Card className="hover-elevate cursor-pointer" data-testid="card-stat-assignments">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Przypisania</CardTitle>
              <UserPlus className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-assignments">
                {stats?.totalAssignments ?? 0}
              </div>
              <p className="text-xs text-muted-foreground">Przypisane plany</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div>
        <h2 className="font-heading font-bold text-xl md:text-2xl mb-4" data-testid="text-business-stats-title">
          Statystyki biznesowe
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-4 md:mb-6">
          <Card data-testid="card-stat-revenue-month">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Przychód (ten miesiąc)</CardTitle>
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-revenue-this-month">
                {businessStats.thisMonthTotal} zł
              </div>
              <p className="text-xs text-muted-foreground">Zapłacone faktury w tym miesiącu</p>
            </CardContent>
          </Card>

          <Link href="/payment-schedule">
            <Card className="hover-elevate cursor-pointer" data-testid="card-stat-overdue">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Zaległe płatności</CardTitle>
                <AlertTriangle className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-overdue-count">
                  {businessStats.overdueCount}
                </div>
                <p className="text-xs text-muted-foreground">Wymagają przypomnienia</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/clients">
            <Card className="hover-elevate cursor-pointer" data-testid="card-stat-active-clients">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Aktywni podopieczni</CardTitle>
                <Users className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalClients ?? 0}</div>
                <p className="text-xs text-muted-foreground">Obecnie prowadzeni</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        <Card data-testid="card-revenue-chart">
          <CardHeader>
            <CardTitle className="font-heading text-base flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Przychód w czasie
            </CardTitle>
            <CardDescription>Zapłacone płatności w ostatnich 6 miesiącach</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={businessStats.monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} width={40} />
                  <Tooltip formatter={(value: number) => [`${value} zł`, "Przychód"]} />
                  <Bar dataKey="przychod" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-primary/20 mt-4 md:mt-8">
        <CardContent className="p-4 md:p-6 text-center">
          <p className="font-heading font-bold text-base md:text-lg mb-1" data-testid="text-polish-brand">
            Polska marka. Polski zespół.
          </p>
          <p className="text-muted-foreground text-sm md:text-base">
            Robimy to po polsku. I robimy to dobrze.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
