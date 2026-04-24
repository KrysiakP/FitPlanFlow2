import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { PublicHeader } from "@/components/public-header";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

export default function LegalPolitykaCookies() {
  const { user } = useAuth();

  useEffect(() => {
    document.title = "Polityka Cookies | Panel Trenera";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute("content", "Polityka Cookies serwisu Panel Trenera - informacje o plikach cookies i sposobach zarządzania nimi.");
    }
  }, []);

  return (
    <div className="min-h-screen bg-background" data-testid="page-polityka-cookies">
      {!user && <PublicHeader />}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link href="/">
          <Button variant="ghost" className="mb-6" data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Wróć
          </Button>
        </Link>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-heading" data-testid="text-title">
              Polityka Cookies
            </CardTitle>
            <p className="text-muted-foreground text-sm" data-testid="text-last-updated">
              Ostatnia aktualizacja: 22 grudnia 2024
            </p>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none" data-testid="content-polityka-cookies">
            <section>
              <h2>1. Czym są pliki cookies?</h2>
              <p>Pliki cookies (ciasteczka) to małe pliki tekstowe, które są zapisywane na Państwa urządzeniu (komputerze, tablecie, smartfonie) podczas korzystania z serwisu internetowego. Pliki te są powszechnie stosowane w celu zapewnienia prawidłowego funkcjonowania stron internetowych, a także do gromadzenia informacji o sposobie korzystania z serwisu.</p>
              <p>Cookies mogą być:</p>
              <ul>
                <li><strong>Cookies własne (first-party cookies)</strong> – ustawiane przez nasz Serwis</li>
                <li><strong>Cookies podmiotów trzecich (third-party cookies)</strong> – ustawiane przez zewnętrznych dostawców usług, z których korzystamy</li>
              </ul>
              <p>Ze względu na czas przechowywania rozróżniamy:</p>
              <ul>
                <li><strong>Cookies sesyjne</strong> – tymczasowe pliki, które są usuwane po zamknięciu przeglądarki</li>
                <li><strong>Cookies trwałe</strong> – pliki przechowywane na urządzeniu przez określony czas lub do momentu ich ręcznego usunięcia</li>
              </ul>
            </section>

            <section>
              <h2>2. Jakie cookies używamy?</h2>
              <p>W naszym Serwisie stosujemy następujące kategorie plików cookies:</p>

              <h3>2.1. Cookies niezbędne (konieczne)</h3>
              <p>Te pliki cookies są niezbędne do prawidłowego funkcjonowania Serwisu. Bez nich nie byłoby możliwe korzystanie z podstawowych funkcji, takich jak logowanie czy nawigacja. Te cookies nie wymagają Państwa zgody, ponieważ są niezbędne do świadczenia usługi.</p>

              <h3>2.2. Cookies funkcjonalne (preferencje)</h3>
              <p>Te pliki cookies umożliwiają zapamiętanie Państwa preferencji i ustawień, takich jak wybór języka, motywu kolorystycznego czy innych personalizowanych ustawień. Dzięki nim korzystanie z Serwisu jest wygodniejsze.</p>

              <h3>2.3. Cookies analityczne</h3>
              <p>Te pliki cookies pomagają nam zrozumieć, w jaki sposób użytkownicy korzystają z Serwisu. Zbierają informacje o liczbie odwiedzin, czasie spędzonym na stronie, źródłach ruchu i innych zachowaniach użytkowników. Dane te są anonimizowane i wykorzystywane wyłącznie do ulepszania Serwisu.</p>

              <h3>2.4. Cookies marketingowe</h3>
              <p>Obecnie nie stosujemy plików cookies marketingowych śledzących użytkowników w celach reklamowych. W przypadku wprowadzenia takich cookies, zostaną Państwo o tym poinformowani, a ich użycie będzie wymagało Państwa zgody.</p>
            </section>

            <section>
              <h2>3. Szczegółowa lista stosowanych cookies</h2>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-semibold">Nazwa</th>
                      <th className="text-left p-3 font-semibold">Kategoria</th>
                      <th className="text-left p-3 font-semibold">Cel</th>
                      <th className="text-left p-3 font-semibold">Czas życia</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="p-3"><code>connect.sid</code></td>
                      <td className="p-3">Niezbędne</td>
                      <td className="p-3">Identyfikator sesji użytkownika, niezbędny do utrzymania zalogowanego stanu</td>
                      <td className="p-3">Sesja</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-3"><code>theme</code></td>
                      <td className="p-3">Funkcjonalne</td>
                      <td className="p-3">Zapamiętanie preferencji motywu (jasny/ciemny)</td>
                      <td className="p-3">1 rok</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-3"><code>cookie_consent</code></td>
                      <td className="p-3">Niezbędne</td>
                      <td className="p-3">Zapamiętanie Państwa wyboru dotyczącego zgody na cookies</td>
                      <td className="p-3">1 rok</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-3"><code>_stripe_mid</code></td>
                      <td className="p-3">Niezbędne</td>
                      <td className="p-3">Cookie operatora płatności Stripe, niezbędne do bezpiecznej realizacji transakcji</td>
                      <td className="p-3">1 rok</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-3"><code>_stripe_sid</code></td>
                      <td className="p-3">Niezbędne</td>
                      <td className="p-3">Cookie sesji Stripe, niezbędne do bezpiecznej realizacji transakcji</td>
                      <td className="p-3">30 minut</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-3"><code>sidebar_collapsed</code></td>
                      <td className="p-3">Funkcjonalne</td>
                      <td className="p-3">Zapamiętanie stanu menu bocznego (zwinięte/rozwinięte)</td>
                      <td className="p-3">1 rok</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-3"><code>last_view</code></td>
                      <td className="p-3">Funkcjonalne</td>
                      <td className="p-3">Zapamiętanie ostatnio wybranego widoku w aplikacji</td>
                      <td className="p-3">30 dni</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                <strong>Uwaga:</strong> Powyższa lista może ulec zmianie wraz z rozwojem Serwisu. W przypadku wprowadzenia nowych cookies, niniejsza Polityka zostanie zaktualizowana.
              </p>
            </section>

            <section>
              <h2>4. Jak zarządzać cookies?</h2>
              <p>Mają Państwo pełną kontrolę nad plikami cookies. Mogą Państwo:</p>

              <h3>4.1. Zarządzanie cookies w przeglądarce</h3>
              <p>Większość przeglądarek internetowych pozwala na zarządzanie plikami cookies poprzez ustawienia. Można:</p>
              <ul>
                <li>Blokować wszystkie lub wybrane cookies</li>
                <li>Usuwać zapisane cookies</li>
                <li>Ustawić powiadomienia przed zapisaniem cookies</li>
              </ul>

              <h4>Instrukcje dla popularnych przeglądarek:</h4>
              <ul>
                <li><strong>Google Chrome:</strong> Menu → Ustawienia → Prywatność i bezpieczeństwo → Pliki cookie i inne dane witryn</li>
                <li><strong>Mozilla Firefox:</strong> Menu → Ustawienia → Prywatność i bezpieczeństwo → Ciasteczka i dane stron</li>
                <li><strong>Safari:</strong> Preferencje → Prywatność → Zarządzaj danymi witryn</li>
                <li><strong>Microsoft Edge:</strong> Menu → Ustawienia → Prywatność, wyszukiwanie i usługi → Pliki cookie</li>
                <li><strong>Opera:</strong> Menu → Ustawienia → Zaawansowane → Prywatność i bezpieczeństwo → Pliki cookie</li>
              </ul>

              <h3>4.2. Tryb prywatny/incognito</h3>
              <p>Korzystanie z trybu prywatnego (incognito) w przeglądarce sprawia, że cookies są automatycznie usuwane po zamknięciu okna przeglądarki.</p>

              <h3>4.3. Narzędzia do zarządzania cookies</h3>
              <p>Istnieją również zewnętrzne narzędzia i rozszerzenia przeglądarek, które umożliwiają szczegółowe zarządzanie plikami cookies.</p>

              <h3>4.4. Konsekwencje wyłączenia cookies</h3>
              <p>Prosimy pamiętać, że wyłączenie lub ograniczenie cookies może wpłynąć na funkcjonowanie Serwisu:</p>
              <ul>
                <li>Wyłączenie cookies niezbędnych może uniemożliwić logowanie i korzystanie z podstawowych funkcji</li>
                <li>Wyłączenie cookies funkcjonalnych sprawi, że Serwis nie zapamięta Państwa preferencji</li>
                <li>Wyłączenie cookies analitycznych nie wpłynie na funkcjonowanie Serwisu, ale ograniczy nasze możliwości jego ulepszania</li>
              </ul>
            </section>

            <section>
              <h2>5. Zgoda na cookies</h2>
              <p>Przy pierwszej wizycie w Serwisie wyświetlamy informację o stosowaniu plików cookies. Kontynuowanie korzystania z Serwisu bez zmiany ustawień przeglądarki oznacza wyrażenie zgody na stosowanie cookies zgodnie z niniejszą Polityką.</p>
              <p>Zgoda na cookies funkcjonalne i analityczne jest dobrowolna. Cookies niezbędne są wykorzystywane niezależnie od Państwa zgody, ponieważ są konieczne do świadczenia usługi.</p>
              <p>W każdej chwili mogą Państwo zmienić swoje preferencje dotyczące cookies poprzez:</p>
              <ul>
                <li>Ustawienia przeglądarki</li>
                <li>Usunięcie cookies z urządzenia</li>
              </ul>
            </section>

            <section>
              <h2>6. Cookies podmiotów trzecich</h2>
              <p>Niektóre pliki cookies są ustawiane przez zewnętrznych dostawców usług, z których korzystamy:</p>

              <h3>6.1. Stripe</h3>
              <p>Operator płatności elektronicznych. Cookies Stripe są niezbędne do bezpiecznej realizacji transakcji płatniczych. Więcej informacji: <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Polityka prywatności Stripe</a></p>

              <h3>6.2. Replit</h3>
              <p>Platforma hostingowa. Może stosować własne cookies techniczne. Więcej informacji: <a href="https://replit.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Polityka prywatności Replit</a></p>

              <p>Nie mamy kontroli nad cookies ustawianymi przez podmioty trzecie. Zachęcamy do zapoznania się z ich politykami prywatności.</p>
            </section>

            <section>
              <h2>7. Lokalne przechowywanie danych (Local Storage)</h2>
              <p>Oprócz plików cookies, Serwis może wykorzystywać mechanizm Local Storage przeglądarki do przechowywania danych lokalnie na Państwa urządzeniu. Local Storage działa podobnie do cookies, ale pozwala na przechowywanie większych ilości danych.</p>
              <p>Wykorzystujemy Local Storage do:</p>
              <ul>
                <li>Przechowywania preferencji użytkownika</li>
                <li>Tymczasowego zapisywania danych formularzy</li>
                <li>Optymalizacji działania aplikacji</li>
              </ul>
              <p>Dane z Local Storage można usunąć poprzez ustawienia przeglądarki lub narzędzia deweloperskie.</p>
            </section>

            <section>
              <h2>8. Zmiany Polityki Cookies</h2>
              <p>Zastrzegamy sobie prawo do zmiany niniejszej Polityki Cookies. Zmiany mogą wynikać z:</p>
              <ul>
                <li>Wprowadzenia nowych funkcjonalności Serwisu</li>
                <li>Zmiany dostawców usług zewnętrznych</li>
                <li>Zmian w przepisach prawa</li>
              </ul>
              <p>O istotnych zmianach będziemy informować poprzez komunikat w Serwisie. Aktualna wersja Polityki Cookies jest zawsze dostępna pod tym adresem.</p>
            </section>

            <section>
              <h2>9. Kontakt</h2>
              <p>W przypadku pytań dotyczących stosowania plików cookies prosimy o kontakt:</p>
              <ul>
                <li><strong>E-mail:</strong> kontakt@paneltrenera.pl</li>
              </ul>
            </section>

            <section>
              <h2>10. Powiązane dokumenty</h2>
              <p>Zachęcamy do zapoznania się z pozostałymi dokumentami regulującymi korzystanie z Serwisu:</p>
              <ul>
                <li><Link href="/legal/regulamin" className="text-primary hover:underline">Regulamin</Link> – zasady korzystania z Serwisu</li>
                <li><Link href="/legal/polityka-prywatnosci" className="text-primary hover:underline">Polityka Prywatności</Link> – informacje o przetwarzaniu danych osobowych</li>
              </ul>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
