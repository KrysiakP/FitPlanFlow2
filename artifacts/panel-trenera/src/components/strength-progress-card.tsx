import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Dumbbell } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface StrengthHistory {
  exercise: string;
  points: { date: string; estimatedOneRepMax: number; bestLoad: number }[];
  best: number;
  latest: number;
  change: number | null;
}

const formatKg = (value: number) => `${value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)} kg`;

/**
 * Estimated one-rep max over time, one exercise at a time (needs two training days to draw a trend).
 * Pass `clientId` on the trainer side; without it the signed-in client's own history is shown.
 */
export function StrengthProgressCard({ clientId }: { clientId?: string }) {
  const endpoint = clientId ? `/api/trainer/clients/${clientId}/exercise-history` : "/api/client/exercise-history";
  const { data } = useQuery<StrengthHistory[]>({ queryKey: [endpoint] });
  const [selectedName, setSelectedName] = useState<string | null>(null);

  const charted = (data ?? []).filter((item) => item.points.length >= 2);
  if (charted.length === 0) return null;

  const selected = charted.find((item) => item.exercise === selectedName) ?? charted[0];
  const chartData = selected.points.map((point) => ({
    date: new Date(`${point.date}T12:00:00`).toLocaleDateString("pl-PL", { day: "numeric", month: "numeric" }),
    max: point.estimatedOneRepMax,
  }));

  return (
    <Card data-testid="card-strength-progress">
      <CardHeader>
        <CardTitle className="font-heading flex flex-wrap items-center gap-2">
          <Dumbbell className="w-5 h-5" />
          Siła
          {selected.change !== null && (
            <Badge variant="secondary" data-testid="badge-strength-change">
              {selected.change >= 0 ? "+" : "−"}
              {formatKg(Math.abs(selected.change))} od początku
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Szacowane maksimum na jedno powtórzenie (wzór Epleya) z zapisanych serii z obciążeniem. Najlepszy wynik:{" "}
          {formatKg(selected.best)}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {charted.map((item) => (
            <Button
              key={item.exercise}
              size="sm"
              variant={item.exercise === selected.exercise ? "default" : "outline"}
              onClick={() => setSelectedName(item.exercise)}
              data-testid={`button-strength-${item.exercise}`}
            >
              {item.exercise}
            </Button>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis domain={["dataMin - 5", "dataMax + 5"]} unit=" kg" width={64} />
            <Tooltip formatter={(value: number) => [formatKg(value), "Szac. 1RM"]} />
            <Line type="monotone" dataKey="max" stroke="hsl(var(--primary))" strokeWidth={2} dot />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
