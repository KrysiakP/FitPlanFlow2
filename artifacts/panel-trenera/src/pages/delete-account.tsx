import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Trash2, CheckCircle, AlertTriangle } from "lucide-react";
import { Link } from "wouter";
import { PublicHeader } from "@/components/public-header";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

export default function DeleteAccount() {
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email ?? "");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "Usuń konto | Panel Trenera";
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Podaj prawidłowy adres e-mail.");
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/public/delete-account-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { message?: string }).message ?? "Coś poszło nie tak. Spróbuj ponownie.");
      } else {
        setSubmitted(true);
      }
    } catch {
      setError("Błąd połączenia. Sprawdź internet i spróbuj ponownie.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {!user && <PublicHeader />}
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Link href="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Wróć
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-destructive/10">
                <Trash2 className="w-6 h-6 text-destructive" />
              </div>
              <CardTitle className="text-2xl font-heading">
                Usuń konto i dane
              </CardTitle>
            </div>
            <p className="text-muted-foreground text-sm mt-2">
              Możesz w każdej chwili poprosić o usunięcie swojego konta i wszystkich powiązanych z nim danych.
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            {submitted ? (
              <div className="flex flex-col items-center gap-4 py-8 text-center">
                <div className="p-4 rounded-full bg-green-500/10">
                  <CheckCircle className="w-10 h-10 text-green-500" />
                </div>
                <h3 className="text-xl font-semibold">Prośba wysłana</h3>
                <p className="text-muted-foreground max-w-md">
                  Otrzymaliśmy Twoją prośbę o usunięcie konta. Usuniemy konto i wszystkie dane w ciągu <strong>30 dni</strong>.
                </p>
                <p className="text-muted-foreground text-sm max-w-md">
                  Jeśli masz aktywną subskrypcję, pamiętaj o jej anulowaniu przed upływem tego okresu.
                </p>
              </div>
            ) : (
              <>
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-700 dark:text-amber-400 space-y-1">
                    <p className="font-medium">Co zostanie usunięte:</p>
                    <ul className="list-disc list-inside space-y-0.5 text-amber-600 dark:text-amber-500">
                      <li>Twoje konto i dane osobowe</li>
                      <li>Historia treningów i postępy</li>
                      <li>Plany treningowe i dietetyczne</li>
                      <li>Raporty tygodniowe i pomiary</li>
                      <li>Historia płatności i czatów</li>
                    </ul>
                    <p className="mt-2">Operacja jest <strong>nieodwracalna</strong>.</p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Adres e-mail konta do usunięcia</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="twoj@email.pl"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      autoComplete="email"
                    />
                  </div>

                  {error && (
                    <p className="text-sm text-destructive">{error}</p>
                  )}

                  <Button
                    type="submit"
                    variant="destructive"
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? "Wysyłanie..." : "Wyślij prośbę o usunięcie konta"}
                  </Button>

                  <p className="text-xs text-muted-foreground text-center">
                    Po otrzymaniu prośby usuniemy konto w ciągu 30 dni. W sprawach pilnych skontaktuj się z nami pod adresem{" "}
                    <a href="mailto:kontakt@paneltrenera.pl" className="underline hover:text-foreground">
                      kontakt@paneltrenera.pl
                    </a>
                  </p>
                </form>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
