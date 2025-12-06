import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2, Mail, Dumbbell } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";

export default function VerifyEmailPage() {
  const [location] = useLocation();
  const [status, setStatus] = useState<"loading" | "success" | "error" | "expired">("loading");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState<string | null>(null);

  const searchParams = new URLSearchParams(window.location.search);
  const token = searchParams.get("token");

  const resendMutation = useMutation({
    mutationFn: async (emailToResend: string) => {
      const response = await apiRequest("POST", "/api/auth/resend-verification", { email: emailToResend });
      return response.json();
    },
    onSuccess: (data) => {
      setMessage(data.message || "Email weryfikacyjny został wysłany.");
    },
    onError: (error: Error) => {
      setMessage(error.message || "Nie udało się wysłać emaila.");
    },
  });

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Brak tokenu weryfikacyjnego w linku.");
      return;
    }

    const verifyEmail = async () => {
      try {
        const response = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`);
        const data = await response.json();

        if (response.ok && data.verified) {
          setStatus("success");
          setMessage(data.message || "Adres email został pomyślnie zweryfikowany.");
        } else if (data.tokenExpired) {
          setStatus("expired");
          setMessage(data.message || "Token weryfikacyjny wygasł.");
        } else {
          setStatus("error");
          setMessage(data.message || "Weryfikacja nie powiodła się.");
        }
      } catch (error) {
        setStatus("error");
        setMessage("Wystąpił błąd podczas weryfikacji.");
      }
    };

    verifyEmail();
  }, [token]);

  const handleResend = () => {
    const storedEmail = localStorage.getItem("pendingVerificationEmail");
    if (storedEmail) {
      setEmail(storedEmail);
      resendMutation.mutate(storedEmail);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <Dumbbell className="w-12 h-12 text-primary" />
          </div>
          <CardTitle className="font-heading text-2xl">Panel Trenera</CardTitle>
          <CardDescription className="text-base">
            Weryfikacja adresu email
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {status === "loading" && (
            <div className="flex flex-col items-center gap-4 py-8" data-testid="verification-loading">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <p className="text-muted-foreground">Weryfikuję adres email...</p>
            </div>
          )}

          {status === "success" && (
            <div className="flex flex-col items-center gap-4 py-8" data-testid="verification-success">
              <CheckCircle className="w-16 h-16 text-green-500" />
              <h3 className="text-xl font-semibold text-green-600">Sukces!</h3>
              <p className="text-center text-muted-foreground">{message}</p>
              <Link href="/login">
                <Button className="mt-4" data-testid="button-go-to-login">
                  Przejdź do logowania
                </Button>
              </Link>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center gap-4 py-8" data-testid="verification-error">
              <XCircle className="w-16 h-16 text-destructive" />
              <h3 className="text-xl font-semibold text-destructive">Błąd weryfikacji</h3>
              <p className="text-center text-muted-foreground">{message}</p>
              <div className="flex gap-2 mt-4">
                <Link href="/login">
                  <Button variant="outline" data-testid="button-go-to-login">
                    Zaloguj się
                  </Button>
                </Link>
                <Link href="/register">
                  <Button data-testid="button-go-to-register">
                    Zarejestruj się
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {status === "expired" && (
            <div className="flex flex-col items-center gap-4 py-8" data-testid="verification-expired">
              <Mail className="w-16 h-16 text-amber-500" />
              <h3 className="text-xl font-semibold text-amber-600">Token wygasł</h3>
              <p className="text-center text-muted-foreground">{message}</p>
              {email ? (
                <Button 
                  onClick={handleResend}
                  disabled={resendMutation.isPending}
                  className="mt-4"
                  data-testid="button-resend-verification"
                >
                  {resendMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Wysyłanie...
                    </>
                  ) : (
                    "Wyślij nowy link"
                  )}
                </Button>
              ) : (
                <Link href="/login">
                  <Button className="mt-4" data-testid="button-go-to-login">
                    Zaloguj się, aby otrzymać nowy link
                  </Button>
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
