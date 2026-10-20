import { useState } from "react";
import { Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Building2, CheckCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface StudioForm {
  gymName: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  acceptTerms: boolean;
}

const EMPTY_FORM: StudioForm = {
  gymName: "",
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  phone: "",
  acceptTerms: false,
};

export default function StudioRegister() {
  const [form, setForm] = useState<StudioForm>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);

  const set = <K extends keyof StudioForm>(key: K, value: StudioForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const registerMutation = useMutation({
    mutationFn: async (data: StudioForm) => {
      const response = await fetch("/api/gym/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          gymName: data.gymName,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          password: data.password,
          phone: data.phone || undefined,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.message || "Nie udało się utworzyć studia");
      }
      return result;
    },
    onSuccess: (_result, variables) => {
      setRegisteredEmail(variables.email);
    },
    onError: (error: Error) => setFormError(error.message),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (form.gymName.trim().length < 2) return setFormError("Podaj nazwę studia");
    if (!form.firstName.trim() || !form.lastName.trim()) return setFormError("Podaj imię i nazwisko właściciela");
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return setFormError("Podaj poprawny adres email");
    if (form.password.length < 8) return setFormError("Hasło musi mieć co najmniej 8 znaków");
    if (!form.acceptTerms) return setFormError("Musisz zaakceptować regulamin");
    registerMutation.mutate({ ...form, email: form.email.trim() });
  };

  if (registeredEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md" data-testid="card-studio-registered">
          <CardHeader className="text-center">
            <CheckCircle className="w-12 h-12 text-primary mx-auto mb-2" />
            <CardTitle className="font-heading">Studio zostało utworzone</CardTitle>
            <CardDescription>
              Wysłaliśmy wiadomość na adres <strong>{registeredEmail}</strong>. Kliknij w link w wiadomości, aby
              aktywować konto, a potem zaloguj się.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Alert>
              <Mail className="h-4 w-4" />
              <AlertDescription>Nie widzisz wiadomości? Sprawdź folder ze spamem.</AlertDescription>
            </Alert>
            <Button asChild data-testid="button-studio-go-login">
              <Link href="/login">Przejdź do logowania</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-6 h-6 text-primary" />
            <CardTitle className="font-heading text-2xl">Załóż studio</CardTitle>
          </div>
          <CardDescription>
            Panel Trenera Studio dla siłowni, klubów i studiów fitness. Zapraszasz trenerów i widzisz zbiorcze
            statystyki. Podopieczni pozostają pod opieką swoich trenerów.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="gymName">Nazwa studia</Label>
              <Input id="gymName" value={form.gymName} onChange={(e) => set("gymName", e.target.value)} data-testid="input-gym-name" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Imię</Label>
                <Input id="firstName" value={form.firstName} onChange={(e) => set("firstName", e.target.value)} data-testid="input-studio-first-name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Nazwisko</Label>
                <Input id="lastName" value={form.lastName} onChange={(e) => set("lastName", e.target.value)} data-testid="input-studio-last-name" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" value={form.email} onChange={(e) => set("email", e.target.value)} data-testid="input-studio-email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Hasło</Label>
              <Input id="password" type="password" autoComplete="new-password" value={form.password} onChange={(e) => set("password", e.target.value)} data-testid="input-studio-password" />
              <p className="text-xs text-muted-foreground">Co najmniej 8 znaków.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefon (opcjonalnie)</Label>
              <Input id="phone" type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} data-testid="input-studio-phone" />
            </div>
            <div className="flex items-start gap-2">
              <Checkbox
                id="acceptTerms"
                checked={form.acceptTerms}
                onCheckedChange={(checked) => set("acceptTerms", checked === true)}
                data-testid="checkbox-studio-terms"
              />
              <Label htmlFor="acceptTerms" className="text-sm font-normal leading-snug">
                Akceptuję{" "}
                <Link href="/legal/regulamin" className="underline">regulamin</Link> i{" "}
                <Link href="/legal/polityka-prywatnosci" className="underline">politykę prywatności</Link>.
              </Label>
            </div>

            {formError && (
              <Alert variant="destructive" data-testid="alert-studio-register-error">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={registerMutation.isPending} data-testid="button-studio-register">
              {registerMutation.isPending ? "Tworzenie..." : "Załóż studio"}
            </Button>
            <p className="text-sm text-center text-muted-foreground">
              Masz już konto? <Link href="/login" className="underline">Zaloguj się</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
