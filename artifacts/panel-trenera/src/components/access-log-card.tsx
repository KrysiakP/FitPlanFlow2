import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { Eye } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface AccessEntry {
  id: string;
  what: string;
  by: string;
  at: string;
}

/** Who (a trainer) opened which part of the signed-in client's data, newest first. */
export function AccessLogCard() {
  const { data } = useQuery<{ entries: AccessEntry[] }>({ queryKey: ["/api/account/access-log"] });
  const entries = data?.entries ?? [];

  return (
    <Card data-testid="card-access-log">
      <CardHeader>
        <CardTitle className="font-heading flex items-center gap-2">
          <Eye className="w-5 h-5" />
          Kto oglądał moje dane
        </CardTitle>
        <CardDescription>Twój trener widzi tylko to, co jest potrzebne do pracy z Tobą. Tu zobaczysz, kiedy i co otworzył.</CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground" data-testid="text-access-log-empty">Na razie nikt nie otwierał Twoich danych.</p>
        ) : (
          <ul className="divide-y">
            {entries.map((entry) => (
              <li key={entry.id} className="py-2 flex items-baseline justify-between gap-4 text-sm" data-testid={`access-entry-${entry.id}`}>
                <span>
                  <strong>{entry.by}</strong> otworzył(a): {entry.what}
                </span>
                <span className="text-muted-foreground whitespace-nowrap">{format(new Date(entry.at), "d MMM, HH:mm", { locale: pl })}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
