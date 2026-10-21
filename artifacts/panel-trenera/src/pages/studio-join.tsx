import { useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Building2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { PublicHeader } from "@/components/public-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface InvitationPreview {
  studioName: string;
  maskedEmail: string;
}

/** The page behind the link in the studio's invitation e-mail: who invites, and a button to accept once signed in as that trainer. */
export default function StudioJoin() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const code = (new URLSearchParams(window.location.search).get("code") ?? "").trim().toUpperCase();

  useEffect(() => {
    document.title = "Zaproszenie do studia | Panel Trenera";
  }, []);

  const preview = useQuery<InvitationPreview>({
    queryKey: [`/api/gym/invitation/${code}`],
    enabled: code.length > 0,
    retry: false,
  });

  const join = useMutation({
    mutationFn: async () => apiRequest("POST", `/api/gym/join/${encodeURIComponent(code)}`, {}),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/trainer/gym"] });
      toast({ title: "Dołączyłeś do studia" });
      setLocation("/profile");
    },
    onError: (error: unknown) =>
      toast({
        title: "Nie udało się dołączyć",
        description: error instanceof Error ? error.message.replace(/^\d+:\s*/, "") : "Spróbuj ponownie.",
        variant: "destructive",
      }),
  });

  const card = (
    <Card className="max-w-lg mx-auto" data-testid="card-studio-invitation">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-heading">
          <Building2 className="w-5 h-5" />
          Zaproszenie do studia
        </CardTitle>
        {preview.data && (
          <CardDescription data-testid="text-studio-invitation">
            <strong>{preview.data.studioName}</strong> zaprasza Cię do swojego studia. Zaproszenie jest dla adresu {preview.data.maskedEmail}.
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {!code || preview.isError ? (
          <Alert variant="destructive">
            <AlertTitle>Zaproszenie nie działa</AlertTitle>
            <AlertDescription>Link jest nieaktywny albo niepełny. Poproś studio o nowe zaproszenie.</AlertDescription>
          </Alert>
        ) : preview.isLoading ? (
          <p className="text-sm text-muted-foreground">Sprawdzam zaproszenie…</p>
        ) : !user ? (
          <>
            <p className="text-sm text-muted-foreground">
              Zaloguj się na konto trenera z tym adresem e-mail. Zaproszenie zobaczysz wtedy w <strong>Profil → Studio</strong> albo możesz wrócić do tego linku.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild data-testid="button-studio-login">
                <Link href="/login">Zaloguj się</Link>
              </Button>
              <Button asChild variant="outline" data-testid="button-studio-register">
                <Link href="/register">Załóż konto trenera</Link>
              </Button>
            </div>
          </>
        ) : user.role !== "trainer" ? (
          <Alert>
            <AlertTitle>To zaproszenie jest dla trenera</AlertTitle>
            <AlertDescription>Jesteś zalogowany jako {user.role === "client" ? "podopieczny" : "właściciel studia"}. Zaloguj się na konto trenera.</AlertDescription>
          </Alert>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Dołączenie do studia nie zmienia Twoich podopiecznych ani planów. Studio widzi tylko zbiorcze liczby.
            </p>
            <Button onClick={() => join.mutate()} disabled={join.isPending} data-testid="button-join-studio">
              Dołącz do studia
            </Button>
          </>
        )}
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
