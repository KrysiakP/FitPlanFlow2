import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { PublicHeader } from "@/components/public-header";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

export default function LegalPolitykaPrivatnosci() {
  const { user } = useAuth();

  useEffect(() => {
    document.title = "Polityka Prywatności | Panel Trenera";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute("content", "Polityka Prywatności serwisu Panel Trenera - informacje o przetwarzaniu danych osobowych zgodnie z RODO.");
    }
  }, []);

  return (
    <div className="min-h-screen bg-background" data-testid="page-polityka-prywatnosci">
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
              Polityka Prywatności
            </CardTitle>
            <p className="text-muted-foreground text-sm" data-testid="text-last-updated">
              Ostatnia aktualizacja: 22 grudnia 2024
            </p>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none" data-testid="content-polityka-prywatnosci">
            <section>
              <h2>1. Administrator danych osobowych</h2>
              <p>Administratorem Państwa danych osobowych jest Panel Trenera Sp. z o.o. z siedzibą w Warszawie, ul. [Adres do uzupełnienia], 00-000 Warszawa, wpisana do rejestru przedsiębiorców Krajowego Rejestru Sądowego pod numerem KRS: [do uzupełnienia], NIP: [do uzupełnienia], REGON: [do uzupełnienia] (dalej: „Administrator" lub „my").</p>
              <p>Kontakt z Administratorem możliwy jest:</p>
              <ul>
                <li>drogą elektroniczną: kontakt@paneltrenera.pl</li>
                <li>listownie na adres siedziby Administratora</li>
              </ul>
              <p>Administrator dokłada szczególnej staranności w celu ochrony interesów osób, których dane dotyczą, a w szczególności zapewnia, że zbierane przez niego dane są przetwarzane zgodnie z prawem, zbierane dla oznaczonych, zgodnych z prawem celów i niepoddawane dalszemu przetwarzaniu niezgodnemu z tymi celami.</p>
            </section>

            <section>
              <h2>2. Podstawy prawne przetwarzania danych</h2>
              <p>Państwa dane osobowe przetwarzane są na podstawie:</p>
              <ul>
                <li><strong>Art. 6 ust. 1 lit. a) RODO</strong> – zgoda na przetwarzanie danych osobowych w określonych celach (np. marketing, newsletter)</li>
                <li><strong>Art. 6 ust. 1 lit. b) RODO</strong> – przetwarzanie jest niezbędne do wykonania umowy, której stroną jest osoba, której dane dotyczą, lub do podjęcia działań na żądanie osoby, której dane dotyczą, przed zawarciem umowy (np. świadczenie usług w ramach Serwisu)</li>
                <li><strong>Art. 6 ust. 1 lit. c) RODO</strong> – przetwarzanie jest niezbędne do wypełnienia obowiązku prawnego ciążącego na Administratorze (np. obowiązki podatkowe, rachunkowe)</li>
                <li><strong>Art. 6 ust. 1 lit. f) RODO</strong> – przetwarzanie jest niezbędne do celów wynikających z prawnie uzasadnionych interesów realizowanych przez Administratora (np. dochodzenie roszczeń, marketing bezpośredni)</li>
              </ul>
              <p>W przypadku przetwarzania szczególnych kategorii danych osobowych (dane dotyczące zdrowia), podstawą prawną jest:</p>
              <ul>
                <li><strong>Art. 9 ust. 2 lit. a) RODO</strong> – wyraźna zgoda osoby, której dane dotyczą</li>
              </ul>
            </section>

            <section>
              <h2>3. Zakres zbieranych danych</h2>
              <p>W ramach korzystania z Serwisu zbieramy następujące kategorie danych osobowych:</p>
              
              <h3>3.1. Dane identyfikacyjne i kontaktowe</h3>
              <ul>
                <li>Imię i nazwisko</li>
                <li>Adres e-mail</li>
                <li>Numer telefonu (opcjonalnie)</li>
                <li>Zdjęcie profilowe (opcjonalnie)</li>
              </ul>

              <h3>3.2. Dane dotyczące konta</h3>
              <ul>
                <li>Nazwa użytkownika</li>
                <li>Hasło (przechowywane w formie zaszyfrowanej)</li>
                <li>Rola w systemie (Trener/Podopieczny)</li>
                <li>Data rejestracji</li>
                <li>Historia logowań</li>
              </ul>

              <h3>3.3. Dane treningowe</h3>
              <ul>
                <li>Przypisane plany treningowe</li>
                <li>Historia wykonanych treningów</li>
                <li>Postępy treningowe (obciążenia, powtórzenia)</li>
                <li>Raporty tygodniowe</li>
              </ul>

              <h3>3.4. Dane dietetyczne</h3>
              <ul>
                <li>Plany dietetyczne</li>
                <li>Informacje o preferencjach żywieniowych</li>
                <li>Dane o spożywanych posiłkach</li>
              </ul>

              <h3>3.5. Dane dotyczące zdrowia (szczególna kategoria danych)</h3>
              <ul>
                <li>Waga i pomiary ciała</li>
                <li>Informacje o stanie zdrowia podane dobrowolnie</li>
                <li>Wyniki badań medycznych (jeśli udostępnione)</li>
                <li>Informacje o urazach i ograniczeniach zdrowotnych</li>
              </ul>

              <h3>3.6. Dane techniczne</h3>
              <ul>
                <li>Adres IP</li>
                <li>Typ przeglądarki i urządzenia</li>
                <li>System operacyjny</li>
                <li>Dane z plików cookies</li>
              </ul>

              <h3>3.7. Dane płatnicze</h3>
              <ul>
                <li>Historia transakcji</li>
                <li>Informacje o subskrypcji</li>
              </ul>
              <p><strong>Uwaga:</strong> Pełne dane karty płatniczej są przetwarzane wyłącznie przez operatora płatności Stripe i nie są przechowywane przez Administratora.</p>
            </section>

            <section>
              <h2>4. Cele przetwarzania danych</h2>
              <p>Państwa dane osobowe przetwarzane są w następujących celach:</p>
              <ol>
                <li><strong>Świadczenie usług</strong> – realizacja umowy o świadczenie usług drogą elektroniczną, w tym:
                  <ul>
                    <li>tworzenie i zarządzanie kontem użytkownika</li>
                    <li>umożliwienie korzystania z funkcji Serwisu</li>
                    <li>przypisywanie i realizacja planów treningowych</li>
                    <li>komunikacja między Trenerem a Podopiecznym</li>
                  </ul>
                </li>
                <li><strong>Obsługa płatności</strong> – realizacja transakcji i zarządzanie subskrypcjami</li>
                <li><strong>Komunikacja</strong> – odpowiadanie na zapytania, obsługa reklamacji, powiadomienia o zmianach w Serwisie</li>
                <li><strong>Marketing</strong> – przesyłanie informacji handlowych (wyłącznie za zgodą)</li>
                <li><strong>Analityka</strong> – analiza sposobu korzystania z Serwisu w celu jego ulepszania</li>
                <li><strong>Bezpieczeństwo</strong> – wykrywanie i zapobieganie nadużyciom</li>
                <li><strong>Obowiązki prawne</strong> – wypełnianie obowiązków podatkowych i rachunkowych</li>
                <li><strong>Dochodzenie roszczeń</strong> – ustalenie, dochodzenie lub obrona przed roszczeniami</li>
              </ol>
            </section>

            <section>
              <h2>5. Okres przechowywania danych</h2>
              <p>Państwa dane osobowe będą przechowywane przez okres:</p>
              <ul>
                <li><strong>Dane konta użytkownika</strong> – przez czas posiadania konta w Serwisie oraz przez okres przedawnienia roszczeń (3 lata od zakończenia umowy)</li>
                <li><strong>Dane treningowe i dietetyczne</strong> – przez czas posiadania konta, z możliwością wcześniejszego usunięcia na żądanie</li>
                <li><strong>Dane dotyczące zdrowia</strong> – przez czas posiadania konta lub do cofnięcia zgody</li>
                <li><strong>Dane transakcyjne</strong> – przez okres wymagany przepisami podatkowymi (5 lat od końca roku podatkowego)</li>
                <li><strong>Dane marketingowe</strong> – do momentu cofnięcia zgody lub wniesienia sprzeciwu</li>
                <li><strong>Dane z cookies</strong> – zgodnie z czasem życia poszczególnych plików cookies (szczegóły w Polityce Cookies)</li>
              </ul>
              <p>Po upływie okresu przechowywania dane są usuwane lub anonimizowane.</p>
            </section>

            <section>
              <h2>6. Odbiorcy danych</h2>
              <p>Państwa dane osobowe mogą być przekazywane następującym kategoriom odbiorców:</p>
              
              <h3>6.1. Podmioty przetwarzające dane na zlecenie Administratora</h3>
              <ul>
                <li><strong>Stripe Payments Europe, Ltd.</strong> – operator płatności elektronicznych (Irlandia) – w celu realizacji płatności</li>
                <li><strong>Dostawcy usług hostingowych</strong> – w celu przechowywania danych na serwerach</li>
                <li><strong>Dostawcy usług e-mail</strong> – w celu wysyłania wiadomości transakcyjnych i marketingowych</li>
                <li><strong>Dostawcy narzędzi analitycznych</strong> – w celu analizy ruchu w Serwisie</li>
              </ul>

              <h3>6.2. Inni użytkownicy Serwisu</h3>
              <ul>
                <li><strong>Trenerzy</strong> – mają dostęp do danych swoich Podopiecznych w zakresie niezbędnym do świadczenia usług treningowych</li>
                <li><strong>Podopieczni</strong> – mają dostęp do podstawowych danych swojego Trenera</li>
              </ul>

              <h3>6.3. Organy państwowe</h3>
              <p>Dane mogą być udostępniane organom państwowym na podstawie przepisów prawa (np. sądy, organy ścigania, urzędy skarbowe).</p>

              <h3>6.4. Przekazywanie danych poza EOG</h3>
              <p>Niektórzy z naszych dostawców usług mogą przetwarzać dane poza Europejskim Obszarem Gospodarczym. W takich przypadkach transfer danych odbywa się na podstawie:</p>
              <ul>
                <li>Standardowych klauzul umownych zatwierdzonych przez Komisję Europejską</li>
                <li>Decyzji Komisji Europejskiej stwierdzającej odpowiedni poziom ochrony</li>
              </ul>
            </section>

            <section>
              <h2>7. Prawa użytkowników</h2>
              <p>W związku z przetwarzaniem danych osobowych przysługują Państwu następujące prawa:</p>

              <h3>7.1. Prawo dostępu do danych (art. 15 RODO)</h3>
              <p>Mają Państwo prawo uzyskać od Administratora potwierdzenie, czy przetwarzane są Państwa dane osobowe, a jeżeli ma to miejsce – uzyskać dostęp do nich oraz informacje o przetwarzaniu.</p>

              <h3>7.2. Prawo do sprostowania danych (art. 16 RODO)</h3>
              <p>Mają Państwo prawo żądać niezwłocznego sprostowania nieprawidłowych danych osobowych oraz uzupełnienia niekompletnych danych.</p>

              <h3>7.3. Prawo do usunięcia danych (art. 17 RODO)</h3>
              <p>Mają Państwo prawo żądać usunięcia swoich danych osobowych („prawo do bycia zapomnianym"), gdy:</p>
              <ul>
                <li>dane nie są już niezbędne do celów, w których zostały zebrane</li>
                <li>cofnięto zgodę i nie ma innej podstawy prawnej przetwarzania</li>
                <li>wniesiono sprzeciw wobec przetwarzania</li>
                <li>dane były przetwarzane niezgodnie z prawem</li>
              </ul>

              <h3>7.4. Prawo do ograniczenia przetwarzania (art. 18 RODO)</h3>
              <p>Mają Państwo prawo żądać ograniczenia przetwarzania danych w określonych przypadkach.</p>

              <h3>7.5. Prawo do przenoszenia danych (art. 20 RODO)</h3>
              <p>Mają Państwo prawo otrzymać swoje dane osobowe w ustrukturyzowanym, powszechnie używanym formacie nadającym się do odczytu maszynowego oraz przesłać te dane innemu administratorowi.</p>

              <h3>7.6. Prawo do sprzeciwu (art. 21 RODO)</h3>
              <p>Mają Państwo prawo wnieść sprzeciw wobec przetwarzania danych osobowych opartego na prawnie uzasadnionym interesie Administratora, w tym wobec profilowania.</p>

              <h3>7.7. Prawo do cofnięcia zgody</h3>
              <p>W przypadku przetwarzania danych na podstawie zgody, mają Państwo prawo w dowolnym momencie cofnąć zgodę, bez wpływu na zgodność z prawem przetwarzania przed jej cofnięciem.</p>

              <h3>7.8. Prawo do skargi</h3>
              <p>Mają Państwo prawo wnieść skargę do organu nadzorczego – Prezesa Urzędu Ochrony Danych Osobowych (ul. Stawki 2, 00-193 Warszawa).</p>

              <h3>Jak skorzystać z praw</h3>
              <p>Aby skorzystać z powyższych praw, prosimy o kontakt:</p>
              <ul>
                <li>E-mail: kontakt@paneltrenera.pl</li>
                <li>Formularz kontaktowy w Serwisie</li>
                <li>List na adres siedziby Administratora</li>
              </ul>
              <p>Odpowiedź na żądanie zostanie udzielona w terminie miesiąca od jego otrzymania. W przypadku skomplikowanych żądań termin może zostać przedłużony o kolejne dwa miesiące.</p>
            </section>

            <section>
              <h2>8. Bezpieczeństwo danych</h2>
              <p>Administrator stosuje odpowiednie środki techniczne i organizacyjne w celu ochrony danych osobowych, w tym:</p>
              <ul>
                <li>Szyfrowanie transmisji danych (SSL/TLS)</li>
                <li>Szyfrowanie haseł użytkowników</li>
                <li>Regularne kopie zapasowe</li>
                <li>Kontrola dostępu do systemów</li>
                <li>Monitorowanie bezpieczeństwa</li>
                <li>Szkolenia pracowników z zakresu ochrony danych</li>
              </ul>
            </section>

            <section>
              <h2>9. Profilowanie i zautomatyzowane podejmowanie decyzji</h2>
              <p>Administrator nie podejmuje decyzji opartych wyłącznie na zautomatyzowanym przetwarzaniu, w tym profilowaniu, które wywoływałyby skutki prawne lub w podobny sposób istotnie wpływałyby na osobę, której dane dotyczą.</p>
              <p>Dane mogą być wykorzystywane do personalizacji treści i rekomendacji w Serwisie, jednak nie wpływa to na prawa użytkowników ani na dostęp do usług.</p>
            </section>

            <section>
              <h2>10. Pliki cookies</h2>
              <p>Serwis wykorzystuje pliki cookies. Szczegółowe informacje na temat stosowanych cookies znajdują się w odrębnej <Link href="/legal/polityka-cookies" className="text-primary hover:underline">Polityce Cookies</Link>.</p>
            </section>

            <section>
              <h2>11. Zmiany Polityki Prywatności</h2>
              <p>Administrator zastrzega sobie prawo do zmiany niniejszej Polityki Prywatności. O istotnych zmianach użytkownicy będą informowani drogą elektroniczną lub poprzez komunikat w Serwisie.</p>
              <p>Aktualna wersja Polityki Prywatności jest zawsze dostępna w Serwisie.</p>
            </section>

            <section>
              <h2>12. Kontakt</h2>
              <p>W sprawach związanych z ochroną danych osobowych prosimy o kontakt:</p>
              <ul>
                <li><strong>E-mail:</strong> kontakt@paneltrenera.pl</li>
                <li><strong>Adres:</strong> Panel Trenera Sp. z o.o., ul. [Adres do uzupełnienia], 00-000 Warszawa</li>
              </ul>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
