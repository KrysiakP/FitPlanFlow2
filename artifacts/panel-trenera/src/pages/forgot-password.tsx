import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { Dumbbell, Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { useState } from "react";

const forgotPasswordSchema = z.object({
  email: z.string().email("Podaj prawidłowy adres email"),
});

type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPassword() {
  const { toast } = useToast();
  const [emailSent, setEmailSent] = useState(false);

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: async (data: ForgotPasswordInput) => {
      return await apiRequest("POST", "/api/auth/forgot-password", data);
    },
    onSuccess: () => {
      setEmailSent(true);
    },
    onError: (error: Error) => {
      toast({
        title: "Błąd",
        description: error.message || "Wystąpił błąd podczas wysyłania emaila.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ForgotPasswordInput) => {
    forgotPasswordMutation.mutate(data);
  };

  if (emailSent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
            <CardTitle className="font-heading text-2xl">Email wysłany</CardTitle>
            <CardDescription className="text-base">
              Jeśli konto z podanym adresem email istnieje, otrzymasz wiadomość z linkiem do zresetowania hasła.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Sprawdź swoją skrzynkę pocztową oraz folder spam. Link jest ważny przez 1 godzinę.
            </p>
            <Link href="/login" className="block">
              <Button variant="outline" className="w-full" data-testid="button-back-to-login">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Powrót do logowania
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
          <CardTitle className="font-heading text-2xl">Resetowanie hasła</CardTitle>
          <CardDescription className="text-base">
            Podaj swój adres email, a wyślemy Ci link do zresetowania hasła.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

              <Button
                type="submit"
                className="w-full"
                disabled={forgotPasswordMutation.isPending}
                data-testid="button-submit"
              >
                {forgotPasswordMutation.isPending ? (
                  <>
                    <Mail className="w-4 h-4 mr-2 animate-pulse" />
                    Wysyłanie...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Wyślij link resetujący
                  </>
                )}
              </Button>
            </form>
          </Form>

          <div className="text-center text-sm">
            <Link href="/login" className="text-primary hover:underline font-medium" data-testid="link-login">
              <ArrowLeft className="w-4 h-4 inline mr-1" />
              Powrót do logowania
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
