import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Dumbbell, 
  Users, 
  ClipboardList, 
  TrendingUp, 
  Bell, 
  Calendar,
  BarChart3,
  Mail,
  Smartphone,
  CheckCircle,
  ArrowRight
} from "lucide-react";
import { Link } from "wouter";
import { PublicHeader } from "@/components/public-header";

export default function DlaTrenera() {
  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="space-y-16">
          <div className="text-center space-y-6">
            <div className="flex items-center justify-center gap-3">
              <Dumbbell className="w-12 h-12 text-primary" />
              <h1 className="font-heading font-bold text-5xl" data-testid="text-page-title">
                Panel Trenera
              </h1>
            </div>
            
            <div className="max-w-4xl mx-auto space-y-6">
              <h2 className="font-heading font-bold text-3xl" data-testid="text-hero-heading">
                Zarządzaj swoimi podopiecznymi jak profesjonalista
              </h2>
              
              <p className="text-xl text-muted-foreground" data-testid="text-hero-description">
                Panel Trenera to kompleksowe narzędzie stworzone dla polskich trenerów personalnych, 
                które ułatwia codzienną pracę z podopiecznymi i pozwala skupić się na tym, co najważniejsze - treningu.
              </p>

              <div className="flex gap-4 justify-center pt-4">
                <Button size="lg" asChild data-testid="button-start-free">
                  <Link href="/register">
                    Rozpocznij za darmo
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild data-testid="button-pricing">
                  <Link href="/pricing">
                    Zobacz cennik
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          <div className="border-t pt-12">
            <h2 className="font-heading font-bold text-3xl text-center mb-8" data-testid="text-features-heading">
              Co zyskujesz jako trener?
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card data-testid="card-feature-plans">
                <CardHeader>
                  <ClipboardList className="w-10 h-10 text-primary mb-4" />
                  <CardTitle className="font-heading">Profesjonalne plany treningowe</CardTitle>
                  <CardDescription>
                    Twórz szczegółowe plany z ćwiczeniami, seriami, powtórzeniami i czasem odpoczynku. 
                    Wszystko w jednym miejscu, zawsze dostępne.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card data-testid="card-feature-clients">
                <CardHeader>
                  <Users className="w-10 h-10 text-primary mb-4" />
                  <CardTitle className="font-heading">Zarządzanie podopiecznymi</CardTitle>
                  <CardDescription>
                    Wysyłaj zaproszenia, przypisuj plany i monitoruj postępy wszystkich swoich podopiecznych 
                    z jednego panelu.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card data-testid="card-feature-tracking">
                <CardHeader>
                  <TrendingUp className="w-10 h-10 text-primary mb-4" />
                  <CardTitle className="font-heading">Śledzenie postępów</CardTitle>
                  <CardDescription>
                    Podopieczni logują swoje wyniki treningowe, a Ty widzisz ich rzeczywisty postęp 
                    i możesz na bieżąco dostosowywać plany.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card data-testid="card-feature-reports">
                <CardHeader>
                  <BarChart3 className="w-10 h-10 text-primary mb-4" />
                  <CardTitle className="font-heading">Raporty tygodniowe</CardTitle>
                  <CardDescription>
                    Podopieczni przesyłają zdjęcia postępów, pomiary i notatkę o samopoczuciu. 
                    Masz pełny obraz ich transformacji.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card data-testid="card-feature-invites">
                <CardHeader>
                  <Mail className="w-10 h-10 text-primary mb-4" />
                  <CardTitle className="font-heading">System zaproszeń</CardTitle>
                  <CardDescription>
                    Wyślij zaproszenie emailem, podopieczny akceptuje i od razu ma dostęp do planu. 
                    Bez zbędnych komplikacji.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card data-testid="card-feature-mobile">
                <CardHeader>
                  <Smartphone className="w-10 h-10 text-primary mb-4" />
                  <CardTitle className="font-heading">Dostępność 24/7</CardTitle>
                  <CardDescription>
                    Aplikacja webowa dostępna na każdym urządzeniu - telefon, tablet, komputer. 
                    Ty i Twoi podopieczni macie dostęp zawsze i wszędzie.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>

          <div className="border-t pt-12">
            <h2 className="font-heading font-bold text-3xl text-center mb-8" data-testid="text-workflow-heading">
              Jak to działa w praktyce?
            </h2>
            
            <div className="max-w-4xl mx-auto space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="font-heading font-bold text-primary">1</span>
                    </div>
                    <div className="flex-1">
                      <CardTitle className="font-heading">Stwórz plan treningowy</CardTitle>
                      <CardDescription className="mt-2">
                        Dodaj treningi, wybierz ćwiczenia, określ serie, powtórzenia i czas odpoczynku. 
                        Możesz stworzyć dowolnie skomplikowany plan - np. trening FBW, split 3-dniowy, czy program redukcji.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="font-heading font-bold text-primary">2</span>
                    </div>
                    <div className="flex-1">
                      <CardTitle className="font-heading">Wyślij zaproszenie do podopiecznego</CardTitle>
                      <CardDescription className="mt-2">
                        Wpisz email podopiecznego, wybierz plan i kliknij "Wyślij". 
                        Podopieczny dostaje zaproszenie, akceptuje je i od razu widzi swój plan treningowy.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="font-heading font-bold text-primary">3</span>
                    </div>
                    <div className="flex-1">
                      <CardTitle className="font-heading">Monitoruj postępy</CardTitle>
                      <CardDescription className="mt-2">
                        Podopieczny loguje swoje wyniki po każdym treningu (ile powtórzeń zrobił, z jakim obciążeniem). 
                        Ty widzisz jego historię treningów i możesz na bieżąco dostosowywać plan.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="font-heading font-bold text-primary">4</span>
                    </div>
                    <div className="flex-1">
                      <CardTitle className="font-heading">Otrzymuj raporty tygodniowe</CardTitle>
                      <CardDescription className="mt-2">
                        Podopieczny co tydzień przesyła zdjęcia postępów, aktualne pomiary (waga, obwody) 
                        i notatkę o samopoczuciu. Widzisz realną transformację i możesz szybko reagować.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </div>
          </div>

          <div className="border-t pt-12">
            <div className="bg-primary/5 rounded-lg p-8 md:p-12 space-y-6">
              <h2 className="font-heading font-bold text-3xl text-center" data-testid="text-pricing-intro">
                Transparentny cennik dla trenerów
              </h2>
              <p className="text-center text-lg text-muted-foreground max-w-3xl mx-auto">
                Wybierz plan dopasowany do liczby Twoich podopiecznych. Bez ukrytych kosztów, 
                bez ograniczeń funkcji - wszystko dostępne w każdym planie.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto pt-4">
                <Card className="text-center">
                  <CardHeader>
                    <Badge variant="outline" className="mx-auto mb-2">START</Badge>
                    <CardTitle className="font-heading text-2xl">0 zł/mies</CardTitle>
                    <CardDescription>Do 3 podopiecznych</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <CheckCircle className="w-6 h-6 text-primary mx-auto" />
                  </CardContent>
                </Card>

                <Card className="text-center border-primary">
                  <CardHeader>
                    <Badge className="mx-auto mb-2">SOLO</Badge>
                    <CardTitle className="font-heading text-2xl">99 zł/mies</CardTitle>
                    <CardDescription>Do 10 podopiecznych</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <CheckCircle className="w-6 h-6 text-primary mx-auto" />
                  </CardContent>
                </Card>

                <Card className="text-center">
                  <CardHeader>
                    <Badge variant="outline" className="mx-auto mb-2">PRO</Badge>
                    <CardTitle className="font-heading text-2xl">189 zł/mies</CardTitle>
                    <CardDescription>Do 20 podopiecznych</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <CheckCircle className="w-6 h-6 text-primary mx-auto" />
                  </CardContent>
                </Card>
              </div>

              <div className="text-center pt-4">
                <Button asChild size="lg" data-testid="button-view-all-plans">
                  <Link href="/pricing">
                    Zobacz wszystkie plany
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          <div className="border-t pt-12">
            <Card className="bg-card">
              <CardContent className="p-12 text-center space-y-6">
                <h2 className="font-heading font-semibold text-3xl">
                  Gotowy zacząć pracować efektywniej?
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Dołącz do platformy, która pomaga polskim trenerom zarządzać swoimi podopiecznymi 
                  i skupić się na tym, co najważniejsze - transformacji ciała i zdrowia.
                </p>
                <div className="flex gap-4 justify-center pt-4">
                  <Button size="lg" asChild data-testid="button-register-cta">
                    <Link href="/register">
                      Załóż darmowe konto
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild data-testid="button-login-cta">
                    <Link href="/login">
                      Mam już konto
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
