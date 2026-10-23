import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";
import { Link } from "wouter";
import { PublicHeader } from "@/components/public-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";

interface Preview {
  email: string;
  clientFirstName: string | null;
  trainerName: string;
}

/** The page behind the link in a trainer's invitation e-mail: who invites, for which address, and where to go next. */
export default function Join() {
  const { user } = useAuth();
  const code = (new URLSearchParams(window.location.search).get("code") ?? "").trim().toUpperCase();

  useEffect(() => {
    document.title = "Zaproszenie od trenera | Panel Trenera";
  }, []);

  const preview = useQuery<Preview>({ queryKey: [`/api/invitations/lookup/${code}`], enabled: code.length === 8, retry: false });
  const error = code.length !== 8 || preview.isError;

  const card = (
    <Card className="max-w-lg mx-auto" data-testid="card-client-invitation">
      <CardHeader>
        <h1 className="flex items-center gap-2 font-heading font-semibold text-2xl leading-none tracking-tight">
          <UserPlus className="w-5 h-5" />
          Zaproszenie od trenera
        </h1>
        {preview.data && (
          <CardDescription data-testid="text-client-invitation">
            {preview.data.clientFirstName ? `${preview.data.clientFirstName}, ` : ""}
            <strong>{preview.data.trainerName}</strong> zaprasza Cię do Panelu Trenera. Zaproszenie jest dla adresu <strong>{preview.data.email}</strong>.
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Zaproszenie nie działa</AlertTitle>
            <AlertDescription>Link jest niepełny, nieaktywny albo zaproszenie zostało już wykorzystane. Poproś trenera o nowe.</AlertDescription>
          </Alert>
        ) : preview.isLoading ? (
          <p className="text-sm text-muted-foreground">Sprawdzam zaproszenie…</p>
        ) : preview.data ? (
          user ? (
            <>
              <p className="text-sm text-muted-foreground">Jesteś zalogowany. Zaproszenie czeka na Twoim pulpicie, możesz je tam przyjąć, jeśli konto jest na adres z zaproszenia.</p>
              <Button asChild data-testid="button-open-dashboard">
                <Link href="/">Przejdź do pulpitu</Link>
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Załóż konto na ten adres e-mail, a po potwierdzeniu adresu zaproszenie pojawi się na Twoim pulpicie. Nie potrzebujesz żadnego kodu.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button asChild data-testid="button-join-register">
                  <Link href={`/register?email=${encodeURIComponent(preview.data.email)}`}>Załóż konto</Link>
                </Button>
                <Button asChild variant="outline" data-testid="button-join-login">
                  <Link href="/login">Mam już konto</Link>
                </Button>
              </div>
            </>
          )
        ) : null}
      </CardContent>
    </Card>
  );

  if (user) return <div className="py-6">{card}</div>;
  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <div className="container mx-auto px-4 py-10">{card}</div>
    </div>
  );
}
