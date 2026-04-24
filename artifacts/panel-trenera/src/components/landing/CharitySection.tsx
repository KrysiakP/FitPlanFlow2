import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, ExternalLink, CheckCircle, Loader2, Settings } from "lucide-react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import type { CharityDonation } from "@shared/schema";

const POLISH_MONTHS = [
  "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"
];

export function CharitySection() {
  const { user } = useAuth();
  const { data: donations, isLoading } = useQuery<CharityDonation[]>({
    queryKey: ['/api/charity-donations'],
  });

  return (
    <section id="pomagamy" className="py-16 px-4 bg-background">
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="space-y-8">
          <div className="text-center space-y-6">
            <div className="flex items-center justify-center gap-3">
              <Heart className="w-12 h-12 text-red-500" />
              <h1 className="font-heading font-bold text-5xl" data-testid="text-page-title">
                PomagaMY
              </h1>
            </div>
            
            <div className="max-w-4xl mx-auto space-y-6">
              <h2 className="font-heading font-bold text-3xl" data-testid="text-mission-heading">
                Pomagamy dzieciom dorastać silnym. W ciele i w życiu.
              </h2>
              
              <div className="space-y-4 text-lg text-muted-foreground">
                <p data-testid="text-mission-1">
                  <strong>Wierzymy, że ruch i zdrowie nie powinny być luksusem.</strong> Każde dziecko zasługuje na szansę rozwijania się poprzez sport, dobre odżywianie i bezpieczne środowisko. Dlatego <strong>1% przychodu z tej aplikacji</strong> przeznaczamy na wsparcie dzieci, które potrzebują dostępu do sportu, posiłków i bezpiecznego rozwoju.
                </p>
                <p data-testid="text-mission-2">
                  Każdy trener i podopieczny, który korzysta z naszej aplikacji, dokłada swoją cegiełkę do czegoś większego. <strong>Każdy trening to wyciągnięcie ręki</strong> do tych, którzy potrzebują pomocy. Razem tworzymy ruch, który wykracza poza siłownię.
                </p>
                <p data-testid="text-mission-3">
                  Wierzymy w transparentność i realny wpływ. Każdy wpłacony grosz jest dokumentowany, a raporty są publicznie dostępne dla wszystkich użytkowników platformy. To nie jest marketing — to nasza misja.
                </p>
              </div>

              <Card className="bg-primary/5 border-primary/20 text-left">
                <CardHeader>
                  <CardTitle className="font-heading text-xl">Na co przeznaczamy wsparcie:</CardTitle>
                  <CardDescription>
                    1% przychodu trafia do organizacji i programów, które realnie pomagają dzieciom rozwijać się poprzez sport i zdrowe odżywianie
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <div className="font-medium">Zakup sprzętu sportowego</div>
                      <div className="text-sm text-muted-foreground">
                        Wyposażamy kluby szkolne, świetlice i domy dziecka w piłki, hantle, maty, skakanki i inny sprzęt treningowy
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <div className="font-medium">Dofinansowanie zajęć sportowych</div>
                      <div className="text-sm text-muted-foreground">
                        Pokrywamy koszty treningów dla dzieci z domów dziecka i rodzin w trudnej sytuacji materialnej
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <div className="font-medium">Programy żywieniowe</div>
                      <div className="text-sm text-muted-foreground">
                        Wspieramy programy zapewniające zdrowe posiłki w szkołach i świetlicach środowiskowych
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <div className="font-medium">Edukacja zdrowotna</div>
                      <div className="text-sm text-muted-foreground">
                        Finansujemy warsztaty o zdrowym odżywianiu, higienie i bezpieczeństwie dla dzieci i młodzieży
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-muted/50 text-left">
                <CardHeader>
                  <CardTitle className="font-heading text-xl">Jak dokładnie działamy:</CardTitle>
                  <CardDescription>
                    Przejrzystość to podstawa zaufania — każdy grosz jest udokumentowany i raportowany
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="font-medium text-primary">📊 1% przychodu miesięcznie</div>
                    <p className="text-sm">
                      Każdego miesiąca liczymy całkowity przychód ze wszystkich subskrypcji i przekazujemy dokładnie 1% na wybrane organizacje i programy pomocowe.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="font-medium text-primary">📄 Publiczne raporty</div>
                    <p className="text-sm">
                      Do końca każdego miesiąca publikujemy raport z potwierdzeniem przelewu, nazwą organizacji i kwotą wsparcia. Wszystkie dokumenty są dostępne poniżej na tej stronie.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="font-medium text-primary">🗳️ Głosowanie społeczności</div>
                    <p className="text-sm">
                      Raz na kwartał trenerzy korzystający z platformy głosują na organizację lub program, który ma otrzymać wsparcie. To Wy decydujecie, komu pomagamy.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="font-medium text-primary">✅ Weryfikacja wpływu</div>
                    <p className="text-sm">
                      Współpracujemy tylko z zweryfikowanymi organizacjami. Po każdej dotacji otrzymujemy potwierdzenie wykorzystania środków wraz z relacją o realnym wpływie.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <div className="text-center space-y-2 pt-4">
                <p className="text-xl font-medium">
                  Twoja praca zmienia więcej niż jedną osobę. <strong>Zmienia pokolenia.</strong>
                </p>
                <p className="text-lg text-muted-foreground">
                  Dziękujemy, że jesteś częścią tego ruchu. 💚
                </p>
              </div>
            </div>
          </div>

          <div className="border-t pt-8">
            <h2 className="font-heading font-bold text-3xl text-center mb-6" data-testid="text-reports-heading">
              Raporty miesięczne
            </h2>
            {isLoading ? (
              <div className="flex items-center justify-center py-20" data-testid="loading-state">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : donations && donations.length > 0 ? (
              <div 
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                data-testid="donations-grid"
              >
                {donations.map((donation) => {
                  const monthName = POLISH_MONTHS[donation.month - 1];
                  const uploadDate = format(new Date(donation.uploadedAt), "d MMMM yyyy", { locale: pl });
                  
                  return (
                    <Card 
                      key={donation.id} 
                      className="flex flex-col"
                      data-testid={`card-donation-${donation.id}`}
                    >
                      <CardHeader className="space-y-2">
                        <CardTitle className="font-heading text-xl" data-testid={`text-donation-title-${donation.id}`}>
                          {monthName} {donation.year}
                        </CardTitle>
                        <CardDescription data-testid={`text-donation-date-${donation.id}`}>
                          Opublikowano: {uploadDate}
                        </CardDescription>
                      </CardHeader>
                      
                      <CardContent className="flex-1 flex flex-col justify-between space-y-4">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <span className="text-sm font-medium" data-testid={`text-verified-${donation.id}`}>
                            Zweryfikowane
                          </span>
                        </div>
                        
                        <a
                          href={donation.documentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-primary hover-elevate active-elevate-2 px-4 py-2 rounded-md border border-primary/20 transition-colors"
                          data-testid={`link-document-${donation.id}`}
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span className="font-medium">Zobacz potwierdzenie</span>
                        </a>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="py-20" data-testid="empty-state">
                <CardContent className="text-center space-y-4">
                  <Heart className="w-16 h-16 text-muted-foreground mx-auto" />
                  <div className="space-y-2">
                    <h3 className="font-heading font-semibold text-xl">
                      Wkrótce opublikujemy pierwsze potwierdzenie
                    </h3>
                    <p className="text-muted-foreground">
                      Raporty będą publikowane miesięcznie
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {user?.isAdmin && (
            <div className="border-t pt-8">
              <Card className="bg-muted/50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Settings className="w-6 h-6 text-primary" />
                      <div>
                        <h3 className="font-heading font-semibold text-lg">Panel Administratora</h3>
                        <p className="text-sm text-muted-foreground">
                          Dodawaj i zarządzaj raportami PomagaMY
                        </p>
                      </div>
                    </div>
                    <Button asChild data-testid="button-admin-panel">
                      <Link href="/admin/charity-donations">
                        Zarządzaj raportami
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
