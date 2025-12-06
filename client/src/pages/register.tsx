import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { registerSchema, type RegisterInput } from "@shared/schema";
import { Dumbbell, User, UserCheck, Mail, CheckCircle, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link } from "wouter";
import { useMutation } from "@tanstack/react-query";

export default function Register() {
  const { toast } = useToast();
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);

  const searchParams = new URLSearchParams(window.location.search);
  const refCode = searchParams.get('ref');

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      role: "client",
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterInput) => {
      const url = refCode ? `/api/register?ref=${encodeURIComponent(refCode)}` : "/api/register";
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || "Błąd rejestracji");
      }
      
      return result;
    },
    onSuccess: (data, variables) => {
      if (data.requiresEmailVerification) {
        setRegistrationComplete(true);
        setRegisteredEmail(variables.email);
        localStorage.setItem("pendingVerificationEmail", variables.email);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Błąd rejestracji",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resendMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await apiRequest("POST", "/api/auth/resend-verification", { email });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Email wysłany",
        description: data.message || "Sprawdź swoją skrzynkę pocztową.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Błąd",
        description: error.message || "Nie udało się wysłać emaila.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RegisterInput) => {
    registerMutation.mutate(data);
  };

  const handleResendVerification = () => {
    if (registeredEmail) {
      resendMutation.mutate(registeredEmail);
    }
  };

  if (registrationComplete) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
            </div>
            <CardTitle className="font-heading text-2xl">Konto zostało utworzone!</CardTitle>
            <CardDescription className="text-base">
              Sprawdź swoją skrzynkę email
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert className="border-primary/50 bg-primary/5" data-testid="alert-verification-sent">
              <Mail className="h-4 w-4" />
              <AlertTitle>Potwierdź swój adres email</AlertTitle>
              <AlertDescription className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Wysłaliśmy link weryfikacyjny na adres: <strong>{registeredEmail}</strong>
                </p>
                <p className="text-sm text-muted-foreground">
                  Kliknij w link, aby aktywować swoje konto i zalogować się.
                </p>
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={handleResendVerification}
                disabled={resendMutation.isPending}
                data-testid="button-resend-verification"
              >
                {resendMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Wysyłanie...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Wyślij ponownie email
                  </>
                )}
              </Button>

              <Link href="/login">
                <Button className="w-full" data-testid="button-go-to-login">
                  Przejdź do logowania
                </Button>
              </Link>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              Nie widzisz emaila? Sprawdź folder spam lub poczekaj kilka minut.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <Dumbbell className="w-12 h-12 text-primary" />
          </div>
          <CardTitle className="font-heading text-3xl">Panel Trenera</CardTitle>
          <CardDescription className="text-base">
            Utwórz nowe konto
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Imię</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Jan"
                          data-testid="input-firstname"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nazwisko</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Kowalski"
                          data-testid="input-lastname"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="twoj@email.pl"
                        data-testid="input-email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hasło</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        data-testid="input-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Wybierz rolę</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="grid grid-cols-2 gap-4"
                      >
                        <label
                          htmlFor="role-client"
                          className={`flex flex-col items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                            field.value === "client" 
                              ? "border-primary bg-primary/5" 
                              : "border-border hover:border-primary/50 hover:bg-muted/50"
                          }`}
                          data-testid="role-client"
                        >
                          <User className="w-8 h-8 text-primary" />
                          <div className="text-center">
                            <div className="font-medium">Podopieczny</div>
                            <div className="text-xs text-muted-foreground">Darmowe</div>
                          </div>
                          <RadioGroupItem value="client" id="role-client" className="sr-only" />
                        </label>

                        <label
                          htmlFor="role-trainer"
                          className={`flex flex-col items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                            field.value === "trainer" 
                              ? "border-primary bg-primary/5" 
                              : "border-border hover:border-primary/50 hover:bg-muted/50"
                          }`}
                          data-testid="role-trainer"
                        >
                          <UserCheck className="w-8 h-8 text-primary" />
                          <div className="text-center">
                            <div className="font-medium">Trener</div>
                            <div className="text-xs text-muted-foreground">Profesjonalny</div>
                          </div>
                          <RadioGroupItem value="trainer" id="role-trainer" className="sr-only" />
                        </label>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={registerMutation.isPending}
                data-testid="button-submit"
              >
                {registerMutation.isPending ? "Tworzenie konta..." : "Zarejestruj się"}
              </Button>
            </form>
          </Form>

          <div className="text-center text-sm">
            <span className="text-muted-foreground">Masz już konto? </span>
            <Link href="/login" className="text-primary hover:underline font-medium" data-testid="link-login">
              Zaloguj się
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
