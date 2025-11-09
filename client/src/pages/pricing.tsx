import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Crown, Dumbbell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

export default function Pricing() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isUpgrading, setIsUpgrading] = useState(false);

  const createCheckoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/subscription/create-checkout", {});
      return await response.json() as { sessionId: string };
    },
    onSuccess: async (data) => {
      const stripe = await stripePromise;
      if (!stripe) {
        toast({
          title: "Błąd",
          description: "Nie udało się załadować Stripe",
          variant: "destructive",
        });
        setIsUpgrading(false);
        return;
      }

      const result = await stripe.redirectToCheckout({
        sessionId: data.sessionId,
      });

      if (result.error) {
        toast({
          title: "Błąd",
          description: result.error.message || "Nie udało się rozpocząć procesu płatności",
          variant: "destructive",
        });
        setIsUpgrading(false);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Błąd",
        description: error.message || "Nie udało się rozpocząć procesu płatności",
        variant: "destructive",
      });
      setIsUpgrading(false);
    },
  });

  const handleUpgrade = () => {
    setIsUpgrading(true);
    createCheckoutMutation.mutate();
  };

  const freePlanFeatures = [
    "Do 10 podopiecznych",
    "Nieograniczona liczba planów treningowych",
    "Biblioteka ćwiczeń z filmami",
    "Raporty tygodniowe podopiecznych",
    "System zaproszeń",
  ];

  const premiumPlanFeatures = [
    "Nieograniczona liczba podopiecznych",
    "Wszystkie funkcje planu Free",
    "Priorytetowe wsparcie",
    "Wczesny dostęp do nowych funkcji",
    "Brak limitów",
  ];

  const isTrainer = user?.role === "trainer";
  const isPremium = user?.subscriptionTier === "premium" && user?.subscriptionStatus === "active";

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h1 className="font-heading font-bold text-4xl" data-testid="text-pricing-title">
          Plany cenowe
        </h1>
        <p className="text-muted-foreground text-lg">
          Wybierz plan, który najlepiej odpowiada Twoim potrzebom
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
        <Card className="relative" data-testid="card-plan-free">
          <CardHeader className="space-y-4">
            <div className="flex items-center gap-2">
              <Dumbbell className="w-6 h-6 text-primary" />
              <CardTitle className="font-heading text-2xl">Free</CardTitle>
            </div>
            <CardDescription>
              Idealny na start, wypróbuj platformę za darmo
            </CardDescription>
            <div>
              <span className="text-4xl font-bold">0 zł</span>
              <span className="text-muted-foreground">/miesiąc</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {freePlanFeatures.map((feature, index) => (
                <div key={index} className="flex items-start gap-3" data-testid={`text-free-feature-${index}`}>
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter>
            <Button
              variant="outline"
              className="w-full"
              disabled={!isTrainer || isPremium}
              data-testid="button-plan-free"
            >
              {!isTrainer ? "Tylko dla trenerów" : isPremium ? "Posiadasz Premium" : "Aktualny plan"}
            </Button>
          </CardFooter>
        </Card>

        <Card className="relative border-primary shadow-lg" data-testid="card-plan-premium">
          <div className="absolute -top-4 left-1/2 -translate-x-1/2">
            <div className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium flex items-center gap-2">
              <Crown className="w-4 h-4" />
              Polecane
            </div>
          </div>
          <CardHeader className="space-y-4 pt-8">
            <div className="flex items-center gap-2">
              <Crown className="w-6 h-6 text-primary" />
              <CardTitle className="font-heading text-2xl">Premium</CardTitle>
            </div>
            <CardDescription>
              Dla profesjonalnych trenerów z większą bazą podopiecznych
            </CardDescription>
            <div>
              <span className="text-4xl font-bold">49 zł</span>
              <span className="text-muted-foreground">/miesiąc</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {premiumPlanFeatures.map((feature, index) => (
                <div key={index} className="flex items-start gap-3" data-testid={`text-premium-feature-${index}`}>
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="font-medium">{feature}</span>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter>
            {!isTrainer ? (
              <Button variant="default" className="w-full" disabled data-testid="button-plan-premium">
                Tylko dla trenerów
              </Button>
            ) : isPremium ? (
              <Button variant="default" className="w-full" disabled data-testid="button-plan-premium">
                Aktualny plan
              </Button>
            ) : (
              <Button
                variant="default"
                className="w-full"
                onClick={handleUpgrade}
                disabled={isUpgrading}
                data-testid="button-upgrade-premium"
              >
                {isUpgrading ? "Przetwarzanie..." : "Ulepsz do Premium"}
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>

      {isTrainer && (
        <div className="max-w-5xl mx-auto">
          <Card className="bg-muted/50">
            <CardContent className="p-6 space-y-2">
              <h3 className="font-heading font-semibold text-lg">Bezpieczne płatności przez Stripe</h3>
              <p className="text-sm text-muted-foreground">
                Wszystkie transakcje są przetwarzane bezpiecznie przez Stripe. Możesz w każdej chwili zmienić lub anulować swoją subskrypcję w panelu zarządzania kontem.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
