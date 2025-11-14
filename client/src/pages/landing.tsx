import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dumbbell, Users, ClipboardList, TrendingUp, MapPin, Heart } from "lucide-react";
import { Link, useLocation } from "wouter";

const navItems = [
  { href: "/dla-trenera", label: "Dla Trenera" },
  { href: "/pricing", label: "Cennik" },
  { href: "/pomagamy", label: "Jak Pomagamy" },
];

export default function Landing() {
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b sticky top-0 z-50 bg-background">
        <div className="container mx-auto px-4 py-3 flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 hover-elevate active-elevate-2 rounded-md px-2 py-1 -mx-2" data-testid="link-home">
              <Dumbbell className="w-8 h-8 text-primary" />
              <h1 className="font-heading font-bold text-2xl">Panel Trenera</h1>
            </Link>
            
            <Button asChild className="md:hidden" data-testid="button-login-mobile">
              <Link href="/login">Zaloguj się</Link>
            </Button>
          </div>
          
          <nav className="flex flex-wrap items-center gap-1 md:flex-1 md:justify-center" data-testid="nav-main">
            {navItems.map((item) => (
              <Link 
                key={item.href} 
                href={item.href}
                data-testid={`link-nav-${item.href.slice(1)}`}
              >
                <Button 
                  variant={location === item.href ? "secondary" : "ghost"}
                  size="sm"
                  className="font-medium text-sm"
                >
                  {item.label}
                </Button>
              </Link>
            ))}
          </nav>

          <Button asChild className="hidden md:inline-flex" data-testid="button-login">
            <Link href="/login">Zaloguj się</Link>
          </Button>
        </div>
      </header>

      <main>
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-5xl text-center space-y-8">
            <h1 className="font-heading font-bold text-4xl md:text-5xl lg:text-6xl">
              Profesjonalne zarządzanie<br />planami treningowymi
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Stwórz, przypisuj i zarządzaj planami treningowymi dla swoich podopiecznych w jednym miejscu
            </p>
            <div className="flex gap-4 justify-center">
              <Button size="lg" asChild data-testid="button-start">
                <Link href="/register">Rozpocznij za darmo</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="py-16 px-4 bg-card">
          <div className="container mx-auto max-w-6xl">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card data-testid="card-feature-plans">
                <CardHeader>
                  <ClipboardList className="w-10 h-10 text-primary mb-4" />
                  <CardTitle className="font-heading">Plany treningowe</CardTitle>
                  <CardDescription>
                    Twórz szczegółowe plany treningowe z listą ćwiczeń, seriami i powtórzeniami
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card data-testid="card-feature-clients">
                <CardHeader>
                  <Users className="w-10 h-10 text-primary mb-4" />
                  <CardTitle className="font-heading">Zarządzaj podopiecznymi</CardTitle>
                  <CardDescription>
                    Przypisuj plany do swoich podopiecznych i monitoruj ich postępy
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card data-testid="card-feature-progress">
                <CardHeader>
                  <TrendingUp className="w-10 h-10 text-primary mb-4" />
                  <CardTitle className="font-heading">Śledź postępy</CardTitle>
                  <CardDescription>
                    Podopieczni mają dostęp do przypisanych planów i mogą śledzić swoje treningi
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-16 px-4 bg-card">
          <div className="container mx-auto max-w-5xl">
            <div className="text-center space-y-8">
              <div className="flex items-center justify-center gap-2">
                <MapPin className="w-6 h-6 text-primary" />
                <h2 className="font-heading font-semibold text-3xl">Polska marka</h2>
              </div>
              <div className="max-w-3xl mx-auto space-y-4">
                <p className="text-lg text-muted-foreground">
                  Panel Trenera to w 100% polska aplikacja, stworzona z myślą o polskich trenerach personalnych i ich podopiecznych. Rozumiemy specyfikę polskiego rynku fitness i dostosowujemy nasze rozwiązania do Twoich potrzeb.
                </p>
                <div className="flex flex-wrap gap-3 justify-center items-center">
                  <Badge variant="outline" data-testid="badge-made-in-poland">
                    <Heart className="w-4 h-4 mr-2 text-red-500" />
                    Stworzone w Polsce
                  </Badge>
                  <Badge variant="outline" data-testid="badge-polish-support">
                    Wsparcie w języku polskim
                  </Badge>
                  <Badge variant="outline" data-testid="badge-polish-payments">
                    Płatności w złotówkach
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 px-4">
          <div className="container mx-auto max-w-4xl">
            <Card>
              <CardContent className="p-12 text-center space-y-6">
                <h2 className="font-heading font-semibold text-3xl">
                  Gotowy na start?
                </h2>
                <p className="text-lg text-muted-foreground">
                  Dołącz do platformy jako trener lub podopieczny i zacznij trenować bardziej efektywnie
                </p>
                <Button size="lg" asChild data-testid="button-cta">
                  <Link href="/login">Zaloguj się teraz</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <footer className="border-t py-12 px-4 bg-card">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Dumbbell className="w-6 h-6 text-primary" />
                <span className="font-heading font-bold text-lg">Panel Trenera</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Profesjonalne narzędzie do zarządzania planami treningowymi dla trenerów i podopiecznych.
              </p>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-heading font-semibold">Polska marka</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Heart className="w-4 h-4 text-red-500" />
                  <span>Stworzone w Polsce z pasją</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span>Wsparcie lokalne 24/7</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-heading font-semibold">Kontakt</h3>
              <p className="text-sm text-muted-foreground">
                Masz pytania? Skontaktuj się z nami i dowiedz się więcej o możliwościach platformy.
              </p>
            </div>
          </div>

          <div className="border-t pt-8 text-center text-sm text-muted-foreground">
            <p>© 2024 Panel Trenera. Wszystkie prawa zastrzeżone.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
