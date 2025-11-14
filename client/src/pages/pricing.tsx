import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Dumbbell, Zap, Building2, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { PublicHeader } from "@/components/public-header";

type PlanTier = 'start' | 'solo' | 'pro' | 'elite' | 'max' | 'studio';

interface PlanConfig {
  id: PlanTier;
  name: string;
  price: number | string;
  description: string;
  icon: any;
  features: string[];
  clientLimit: number;
  highlighted?: boolean;
  trainerLimit?: string;
  customPricing?: boolean;
}

const plans: PlanConfig[] = [
  {
    id: 'start',
    name: 'START',
    price: 0,
    description: 'Idealny na start, wypróbuj platformę za darmo',
    icon: Dumbbell,
    clientLimit: 3,
    features: [
      'Do 3 aktywnych podopiecznych',
      'Zarządzanie podopiecznymi',
      'Nieograniczona liczba planów treningowych',
      'Biblioteka ćwiczeń z filmami',
      'Raporty tygodniowe podopiecznych',
    ],
  },
  {
    id: 'solo',
    name: 'SOLO',
    price: 99,
    description: 'Dla początkujących trenerów personalnych',
    icon: Star,
    clientLimit: 10,
    features: [
      'Do 10 aktywnych podopiecznych',
      'Zarządzanie podopiecznymi',
      'Nieograniczona liczba planów treningowych',
      'Biblioteka ćwiczeń z filmami',
      'Raporty tygodniowe podopiecznych',
      'Email wsparcie',
    ],
  },
  {
    id: 'pro',
    name: 'PRO',
    price: 189,
    description: 'Dla rozwijających się trenerów',
    icon: Crown,
    clientLimit: 20,
    highlighted: true,
    features: [
      'Do 20 aktywnych podopiecznych',
      'Zarządzanie podopiecznymi',
      'Nieograniczona liczba planów treningowych',
      'Biblioteka ćwiczeń z filmami',
      'Raporty tygodniowe podopiecznych',
      'Priorytetowe wsparcie email',
      'Dedykowany opiekun konta',
    ],
  },
  {
    id: 'elite',
    name: 'ELITE',
    price: 279,
    description: 'Dla profesjonalnych trenerów',
    icon: Zap,
    clientLimit: 35,
    features: [
      'Do 35 aktywnych podopiecznych',
      'Zarządzanie podopiecznymi',
      'Nieograniczona liczba planów treningowych',
      'Biblioteka ćwiczeń z filmami',
      'Raporty tygodniowe podopiecznych',
      'Priorytetowe wsparcie email',
      'Dedykowany opiekun konta',
    ],
  },
  {
    id: 'max',
    name: 'MAX',
    price: 349,
    description: 'Dla ekspertów z dużą bazą klientów',
    icon: Crown,
    clientLimit: 50,
    features: [
      'Do 50 aktywnych podopiecznych',
      'Zarządzanie podopiecznymi',
      'Nieograniczona liczba planów treningowych',
      'Biblioteka ćwiczeń z filmami',
      'Raporty tygodniowe podopiecznych',
      'Priorytetowe wsparcie email',
      'Dedykowany opiekun konta',
    ],
  },
  {
    id: 'studio',
    name: 'STUDIO/KLUB',
    price: 'Wycena indywidualna',
    description: 'Dla studiów, klubów fitness i dużych organizacji',
    icon: Building2,
    clientLimit: -1,
    customPricing: true,
    features: [
      'Powyżej 50 podopiecznych',
      'Zarządzanie podopiecznymi',
      'Nieograniczona liczba planów treningowych',
      'Biblioteka ćwiczeń z filmami',
      'Raporty tygodniowe podopiecznych',
      'Priorytetowe wsparcie email',
      'Dedykowany opiekun konta',
    ],
  },
];

export default function Pricing() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [upgradingTier, setUpgradingTier] = useState<PlanTier | null>(null);

  const createCheckoutMutation = useMutation({
    mutationFn: async (tier: PlanTier) => {
      const response = await apiRequest("POST", "/api/subscription/create-checkout", { tier });
      return await response.json() as { url: string };
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast({
          title: "Błąd",
          description: "Nie udało się uzyskać linku do płatności",
          variant: "destructive",
        });
        setUpgradingTier(null);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Błąd",
        description: error.message || "Nie udało się rozpocząć procesu płatności",
        variant: "destructive",
      });
      setUpgradingTier(null);
    },
  });

  const handleUpgrade = (tier: PlanTier) => {
    setUpgradingTier(tier);
    createCheckoutMutation.mutate(tier);
  };

  const isTrainer = user?.role === "trainer";
  const currentTier = user?.subscriptionTier || 'start';
  const isActive = user?.subscriptionStatus === 'active' || user?.subscriptionStatus === 'trialing';

  const getButtonConfig = (plan: PlanConfig) => {
    if (!user) {
      return {
        text: plan.id === 'start' ? 'Zacznij za darmo' : 'Rozpocznij',
        disabled: false,
        variant: 'default' as const,
        asChild: true,
        href: '/register',
      };
    }

    if (!isTrainer) {
      return {
        text: 'Tylko dla trenerów',
        disabled: true,
        variant: 'outline' as const,
      };
    }

    if (plan.id === 'start') {
      return {
        text: currentTier === 'start' ? 'Aktualny plan' : 'Przejdź na START',
        disabled: true,
        variant: 'outline' as const,
      };
    }

    if (currentTier === plan.id && isActive) {
      return {
        text: 'Aktualny plan',
        disabled: true,
        variant: 'default' as const,
      };
    }

    return {
      text: upgradingTier === plan.id ? 'Przetwarzanie...' : `Wybierz ${plan.name}`,
      disabled: upgradingTier !== null,
      variant: 'default' as const,
      onClick: () => handleUpgrade(plan.id),
    };
  };

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <div className="container mx-auto px-4 py-12 space-y-8">
        <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-6 text-center">
          <p className="text-base font-medium" data-testid="text-charity-banner">
            💚 1% ze wszystkich przychodów przekazujemy na sport dzieci, domy dziecka i dożywianie dzieci.
            <br />
            <span className="text-sm text-muted-foreground">
              Comiesięczne raporty — widoczne publicznie w{" "}
              <a href="/pomagamy" className="text-primary hover:underline">
                zakładce PomagaMY
              </a>
            </span>
          </p>
        </CardContent>
      </Card>

      <div className="text-center space-y-2">
        <h1 className="font-heading font-bold text-4xl" data-testid="text-pricing-title">
          Plany cenowe
        </h1>
        <p className="text-muted-foreground text-lg">
          Wybierz plan, który najlepiej odpowiada Twoim potrzebom
        </p>
        {isTrainer && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <Badge variant="secondary" data-testid="badge-current-tier">
              Aktualny plan: {plans.find(p => p.id === currentTier)?.name || 'START'}
            </Badge>
            {currentTier !== 'start' && isActive && (
              <Badge variant="default" data-testid="badge-subscription-status">
                Aktywna subskrypcja
              </Badge>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
        {plans.map((plan) => {
          const Icon = plan.icon;
          const buttonConfig = getButtonConfig(plan);
          
          return (
            <Card 
              key={plan.id} 
              className={`relative flex flex-col ${plan.highlighted ? 'border-primary shadow-lg' : ''}`}
              data-testid={`card-plan-${plan.id}`}
            >
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground flex items-center gap-1">
                    <Crown className="w-3 h-3" />
                    Polecane
                  </Badge>
                </div>
              )}
              
              <CardHeader className={`space-y-4 ${plan.highlighted ? 'pt-8' : ''}`}>
                <div className="flex items-center gap-2">
                  <Icon className="w-6 h-6 text-primary" />
                  <CardTitle className="font-heading text-xl">{plan.name}</CardTitle>
                </div>
                <CardDescription className="min-h-12">
                  {plan.description}
                </CardDescription>
                <div>
                  {plan.customPricing ? (
                    <span className="text-2xl font-bold">{plan.price}</span>
                  ) : (
                    <>
                      <span className="text-3xl font-bold">{plan.price} zł</span>
                      <span className="text-muted-foreground">/miesiąc</span>
                    </>
                  )}
                </div>
                <div className="text-sm font-medium text-primary">
                  {plan.clientLimit === -1 ? 'Unlimited clients' : `Max ${plan.clientLimit} podopiecznych`}
                </div>
                {plan.trainerLimit && (
                  <div className="text-sm font-medium text-muted-foreground">
                    {plan.trainerLimit}
                  </div>
                )}
              </CardHeader>
              
              <CardContent className="flex-1 space-y-4">
                <div className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <div 
                      key={index} 
                      className="flex items-start gap-2" 
                      data-testid={`text-${plan.id}-feature-${index}`}
                    >
                      <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
              
              <CardFooter>
                {buttonConfig.asChild ? (
                  <Button
                    variant={buttonConfig.variant}
                    className="w-full"
                    asChild
                    data-testid={`button-plan-${plan.id}`}
                  >
                    <Link href={buttonConfig.href!}>
                      {buttonConfig.text}
                    </Link>
                  </Button>
                ) : (
                  <Button
                    variant={buttonConfig.variant}
                    className="w-full"
                    disabled={buttonConfig.disabled}
                    onClick={buttonConfig.onClick}
                    data-testid={`button-plan-${plan.id}`}
                  >
                    {buttonConfig.text}
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {isTrainer && (
        <div className="max-w-7xl mx-auto space-y-4">
          <Card className="bg-muted/50">
            <CardContent className="p-6 space-y-2">
              <h3 className="font-heading font-semibold text-lg">Bezpieczne płatności przez Stripe</h3>
              <p className="text-sm text-muted-foreground">
                Wszystkie transakcje są przetwarzane bezpiecznie przez Stripe. Możesz w każdej chwili zmienić lub anulować swoją subskrypcję w panelu zarządzania kontem.
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-6 space-y-2">
              <h3 className="font-heading font-semibold text-lg">Pytania o plan STUDIO/KLUB?</h3>
              <p className="text-sm text-muted-foreground">
                Plan STUDIO/KLUB jest dedykowany dla większych organizacji. Skontaktuj się z nami, aby omówić szczegóły i dopasować rozwiązanie do Twoich potrzeb.
              </p>
              <Button variant="outline" size="sm" data-testid="button-contact-studio">
                Skontaktuj się
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
      </div>
    </div>
  );
}
