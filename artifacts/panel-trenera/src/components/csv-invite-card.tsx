import { useRef, useState } from "react";
import { FileSpreadsheet, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MAX_CSV_INVITES, parseClientCsv, type CsvInviteParseResult } from "@/lib/parseClientCsv";

function plural(n: number, one: string, few: string, many: string): string {
  const lastTwo = n % 100;
  const last = n % 10;
  if (n === 1) return one;
  return last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14) ? few : many;
}

type Outcome = { email: string; ok: boolean; message?: string };

/** Invite many clients at once from a CSV file (e.g. exported from Excel); each row goes through the normal invitation flow. */
export function CsvInviteCard() {
  const { toast } = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<CsvInviteParseResult | null>(null);
  const [sending, setSending] = useState(false);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);

  async function onFile(file: File | undefined) {
    setOutcomes([]);
    if (!file) return setParsed(null);
    setParsed(parseClientCsv(await file.text()));
  }

  async function sendAll() {
    if (!parsed) return;
    setSending(true);
    const results: Outcome[] = [];
    for (const row of parsed.rows) {
      try {
        await apiRequest("POST", "/api/invitations/send", { clientEmail: row.email, clientFirstName: row.firstName, planId: null });
        results.push({ email: row.email, ok: true });
      } catch (error) {
        results.push({ email: row.email, ok: false, message: error instanceof Error ? error.message : "Błąd" });
        // the trainer's limit is the same for every following row, so stop instead of failing them all one by one
        if (error instanceof Error && /limit podopiecznych/i.test(error.message)) break;
      }
      setOutcomes([...results]);
    }
    setSending(false);
    queryClient.invalidateQueries({ queryKey: ["/api/invitations"] });
    queryClient.invalidateQueries({ queryKey: ["/api/trainer/stats"] });
    const sent = results.filter((result) => result.ok).length;
    toast({ title: "Import zakończony", description: `Wysłano ${sent} z ${parsed.rows.length}` });
    if (fileInput.current) fileInput.current.value = "";
  }

  return (
    <Card data-testid="card-csv-invite">
      <CardHeader>
        <CardTitle className="font-heading flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5" />
          Zaproś wielu podopiecznych z pliku
        </CardTitle>
        <CardDescription>
          Plik CSV z kolumnami „e-mail" i „imię" (może być z Excela, rozdzielany średnikiem lub przecinkiem). Maksymalnie {MAX_CSV_INVITES} adresów naraz.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          ref={fileInput}
          type="file"
          accept=".csv,.txt,text/csv,text/plain"
          onChange={(event) => void onFile(event.target.files?.[0])}
          disabled={sending}
          className="text-sm"
          aria-label="Plik CSV z adresami podopiecznych"
          data-testid="input-csv-file"
        />

        {parsed && (
          <div className="space-y-3 text-sm" data-testid="csv-preview">
            <p>
              Znaleziono <strong>{parsed.rows.length}</strong> {plural(parsed.rows.length, "adres", "adresy", "adresów")} do zaproszenia
              {parsed.truncated ? ` (reszta pliku pominięta, limit ${MAX_CSV_INVITES})` : ""}.
            </p>
            {parsed.problems.length > 0 && (
              <ul className="text-muted-foreground list-disc pl-5" data-testid="csv-problems">
                {parsed.problems.slice(0, 10).map((problem) => (
                  <li key={`${problem.line}-${problem.text}`}>
                    wiersz {problem.line}: {problem.reason} ({problem.text})
                  </li>
                ))}
              </ul>
            )}
            {outcomes.length > 0 && (
              <ul className="space-y-1" data-testid="csv-outcomes">
                {outcomes.map((outcome) => (
                  <li key={outcome.email} className={outcome.ok ? "text-green-600 dark:text-green-400" : "text-destructive"}>
                    {outcome.ok ? "Wysłano" : "Nie wysłano"}: {outcome.email}
                    {outcome.message ? ` — ${outcome.message}` : ""}
                  </li>
                ))}
              </ul>
            )}
            <Button onClick={() => void sendAll()} disabled={sending || parsed.rows.length === 0} className="gap-2" data-testid="button-send-csv">
              <Send className="w-4 h-4" />
              {sending ? `Wysyłam… (${outcomes.length}/${parsed.rows.length})` : `Wyślij ${parsed.rows.length} ${plural(parsed.rows.length, "zaproszenie", "zaproszenia", "zaproszeń")}`}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
