import { useQuery } from "@tanstack/react-query";
import { Hourglass, UserMinus, UsersRound } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Retention {
  activeClients: number;
  endedClients: number;
  averageMonths: number | null;
  retention90: number | null;
}

const months = (value: number) => `${String(value).replace(".", ",")} mies.`;

/** How long clients stay with the trainer. Needs at least one collaboration to say anything. */
export function RetentionStats() {
  const { data } = useQuery<Retention>({ queryKey: ["/api/trainer/retention"] });
  if (!data || data.activeClients + data.endedClients === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-4 md:mb-6" data-testid="retention-stats">
      <Card data-testid="card-stat-retention">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Zostają 90 dni i dłużej</CardTitle>
          <UsersRound className="w-4 h-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold" data-testid="text-retention-90">
            {data.retention90 === null ? "—" : `${data.retention90}%`}
          </div>
          <p className="text-xs text-muted-foreground">
            {data.retention90 === null ? "Za mało danych: współprace trwają krócej niż 90 dni" : "Podopiecznych z co najmniej 90-dniową współpracą"}
          </p>
        </CardContent>
      </Card>
      <Card data-testid="card-stat-average-length">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Średni czas współpracy</CardTitle>
          <Hourglass className="w-4 h-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.averageMonths === null ? "—" : months(data.averageMonths)}</div>
          <p className="text-xs text-muted-foreground">Razem z trwającymi</p>
        </CardContent>
      </Card>
      <Card data-testid="card-stat-ended">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Zakończone współprace</CardTitle>
          <UserMinus className="w-4 h-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.endedClients}</div>
          <p className="text-xs text-muted-foreground">Zarchiwizowani podopieczni</p>
        </CardContent>
      </Card>
    </div>
  );
}
