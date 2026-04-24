import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { Dumbbell, Lock, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link, useSearch } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { useState, useMemo } from "react";

const resetPasswordSchema = z.object({
  password: z.string().min(6, "Hasło musi mieć minimum 6 znaków"),
  confirmPassword: z.string().min(6, "Hasło musi mieć minimum 6 znaków"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Hasła muszą być identyczne",
  path: ["confirmPassword"],
});

type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export default function ResetPassword() {
  const { toast } = useToast();
  const [passwordReset, setPasswordReset] = useState(false);
  const [tokenError, setTokenError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const searchString = useSearch();
  const token = useMemo(() => {
    const params = new URLSearchParams(searchString);
    return params.get("token");
  }, [searchString]);

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: ResetPasswordInput) => {
      return await apiRequest("POST", "/api/auth/reset-password", {
        token,
        newPassword: data.password,
      });
    },
    onSuccess: () => {
      setPasswordReset(true);
      toast({
        title: "Hasło zmienione",
        description: "Możesz teraz zalogować się nowym hasłem.",
      });
    },
    onError: (error: Error) => {
      const message = error.message || "Wystąpił błąd podczas resetowania hasła.";
      
      const isTokenError = 
        message.toLowerCase().includes("token") || 
        message.toLowerCase().includes("wygasł") ||
        message.toLowerCase().includes("nieprawidłowy");
      
      if (isTokenError) {
        setTokenError(true);
        setErrorMessage(message);
      } else {
        toast({
          title: "Błąd",
          description: message,
          variant: "destructive",
        });
      }
    },
  });

  const onSubmit = (data: ResetPasswordInput) => {
    resetPasswordMutation.mutate(data);
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <AlertCircle className="w-12 h-12 text-destructive" />
            </div>
            <CardTitle className="font-heading text-2xl">Brak tokenu</CardTitle>
            <CardDescription className="text-base">
              Link do resetowania hasła jest nieprawidłowy lub brakuje tokenu weryfikacyjnego.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Upewnij się, że kliknąłeś pełny link z emaila lub spróbuj ponownie wygenerować link do resetowania hasła.
            </p>
            <Link href="/forgot-password" className="block">
              <Button className="w-full" data-testid="button-request-new-link">
                Wyślij nowy link
              </Button>
            </Link>
            <Link href="/login" className="block">
              <Button variant="outline" className="w-full" data-testid="button-back-to-login">
                Powrót do logowania
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (tokenError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <AlertCircle className="w-12 h-12 text-destructive" />
            </div>
            <CardTitle className="font-heading text-2xl">Nieprawidłowy link</CardTitle>
            <CardDescription className="text-base">
              {errorMessage || "Link do resetowania hasła jest nieprawidłowy lub wygasł."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Spróbuj ponownie wygenerować link do resetowania hasła.
            </p>
            <Link href="/forgot-password" className="block">
              <Button className="w-full" data-testid="button-retry">
                Wyślij nowy link
              </Button>
            </Link>
            <Link href="/login" className="block">
              <Button variant="outline" className="w-full" data-testid="button-back-to-login">
                Powrót do logowania
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (passwordReset) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
            <CardTitle className="font-heading text-2xl">Hasło zmienione</CardTitle>
            <CardDescription className="text-base">
              Twoje hasło zostało pomyślnie zmienione.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/login" className="block">
              <Button className="w-full" data-testid="button-go-to-login">
                Przejdź do logowania
              </Button>
            </Link>
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
          <CardTitle className="font-heading text-2xl">Ustaw nowe hasło</CardTitle>
          <CardDescription className="text-base">
            Wprowadź swoje nowe hasło poniżej.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nowe hasło</FormLabel>
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
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Potwierdź hasło</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        data-testid="input-confirm-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={resetPasswordMutation.isPending}
                data-testid="button-submit"
              >
                {resetPasswordMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Zapisywanie...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Zapisz nowe hasło
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
