import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList, Users, UserPlus } from "lucide-react";
import { Link } from "wouter";

export default function TrainerDashboard() {
  const { user } = useAuth();

  const { data: stats } = useQuery<{
    totalPlans: number;
    totalClients: number;
    totalAssignments: number;
  }>({
    queryKey: ["/api/trainer/stats"],
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading font-bold text-4xl mb-2" data-testid="text-dashboard-title">
          Panel trenera
        </h1>
        <p className="text-muted-foreground">
          Witaj, {user?.firstName || "Trenerze"}! Zarządzaj swoimi planami i podopiecznymi.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card data-testid="card-stat-plans">
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

        <Card data-testid="card-stat-clients">
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

        <Card data-testid="card-stat-assignments">
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/plans">
          <Card className="hover-elevate cursor-pointer" data-testid="card-quick-plans">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <ClipboardList className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-lg">Plany treningowe</h3>
                  <p className="text-sm text-muted-foreground">Przeglądaj i edytuj swoje plany</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/clients">
          <Card className="hover-elevate cursor-pointer" data-testid="card-quick-clients">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-lg">Podopieczni</h3>
                  <p className="text-sm text-muted-foreground">Zarządzaj swoimi podopiecznymi</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
