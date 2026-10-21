import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Printer } from "lucide-react";
import { Link } from "wouter";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { buildMonthlySummary, monthsWithData, type MonthReport, type MonthSession, type MonthStrengthHistory } from "@/lib/monthlyReport";

const monthLabel = (month: string) =>
  new Date(`${month}-15T12:00:00`).toLocaleDateString("pl-PL", { month: "long", year: "numeric" });
const signed = (value: number, unit: string) => `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(value).toString().replace(".", ",")} ${unit}`;

/** A one-page summary of the month the client can print or save as PDF from the browser. */
export default function MonthlyReport() {
  const { user } = useAuth();
  const { data: reports = [], isLoading: loadingReports } = useQuery<(MonthReport & { id: string })[]>({ queryKey: ["/api/reports"] });
  const { data: sessions = [], isLoading: loadingSessions } = useQuery<MonthSession[]>({ queryKey: ["/api/workout-sessions"] });
  const { data: strength = [] } = useQuery<MonthStrengthHistory[]>({ queryKey: ["/api/client/exercise-history"] });

  const months = useMemo(() => monthsWithData(reports, sessions), [reports, sessions]);
  const [chosen, setChosen] = useState<string | null>(null);
  const month = chosen ?? months[0] ?? null;
  const summary = useMemo(() => (month ? buildMonthlySummary(month, reports, sessions, strength) : null), [month, reports, sessions, strength]);

  useEffect(() => {
    document.title = "Raport miesięczny | Panel Trenera";
  }, []);

  return (
    <div className="space-y-6 max-w-3xl">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #monthly-report, #monthly-report * { visibility: visible; }
          #monthly-report { position: fixed; left: 0; top: 0; width: 100%; padding: 24px; background: #fff; color: #000; }
          .print-hide { display: none !important; }
        }
      `}</style>

      <div className="print-hide space-y-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/my-progress">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Mój progres
          </Link>
        </Button>
        <h1 className="font-heading font-bold text-4xl">Raport miesięczny</h1>
        <p className="text-muted-foreground">Podsumowanie miesiąca z treningów i raportów tygodniowych. Wydrukuj je albo zapisz jako PDF.</p>
        {months.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            {months.slice(0, 12).map((item) => (
              <Button key={item} size="sm" variant={item === month ? "default" : "outline"} onClick={() => setChosen(item)} data-testid={`button-month-${item}`}>
                {monthLabel(item)}
              </Button>
            ))}
            <Button size="sm" variant="secondary" className="ml-auto" onClick={() => window.print()} data-testid="button-print-report">
              <Printer className="w-4 h-4 mr-2" />
              Drukuj / zapisz PDF
            </Button>
          </div>
        )}
      </div>

      {!summary && !loadingReports && !loadingSessions && (
        <Alert>
          <AlertTitle>Brak danych</AlertTitle>
          <AlertDescription>Po pierwszym treningu lub raporcie tygodniowym pojawi się tu podsumowanie miesiąca.</AlertDescription>
        </Alert>
      )}

      {summary && (
        <div id="monthly-report" className="space-y-4" data-testid="monthly-report">
          <div>
            <h2 className="font-heading font-bold text-2xl capitalize">{monthLabel(summary.month)}</h2>
            <p className="text-sm text-muted-foreground">
              {user?.firstName} {user?.lastName} · Panel Trenera
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Treningi", value: String(summary.workouts) },
              { label: "Czas treningu", value: `${summary.trainingMinutes} min` },
              { label: "Średnia trudność", value: summary.averageRpe !== null ? `${summary.averageRpe}/10` : "—" },
              { label: "Raporty tygodniowe", value: String(summary.reportsSent) },
            ].map((item) => (
              <Card key={item.label}>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-2xl font-bold tabular-nums" data-testid={`stat-${item.label}`}>{item.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ciało</CardTitle>
              <CardDescription>Zmiana między pierwszym a ostatnim pomiarem w miesiącu (potrzebne dwa pomiary).</CardDescription>
            </CardHeader>
            <CardContent>
              {summary.body.length === 0 ? (
                <p className="text-sm text-muted-foreground">W tym miesiącu nie ma dwóch pomiarów do porównania.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {summary.body.map((item) => (
                    <li key={item.label} className="flex justify-between gap-4">
                      <span>{item.label}</span>
                      <span className="tabular-nums">
                        {item.from} → {item.to} {item.unit} ({signed(item.change, item.unit)})
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Siła</CardTitle>
              <CardDescription>Szacowane maksimum na jedno powtórzenie, pierwszy i ostatni dzień treningowy miesiąca.</CardDescription>
            </CardHeader>
            <CardContent>
              {summary.strength.length === 0 ? (
                <p className="text-sm text-muted-foreground">W tym miesiącu nie ma dwóch treningów z obciążeniem w tym samym ćwiczeniu.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {summary.strength.map((item) => (
                    <li key={item.exercise} className="flex justify-between gap-4">
                      <span>{item.exercise}</span>
                      <span className="tabular-nums">
                        {item.from} → {item.to} kg ({signed(item.change, "kg")})
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
