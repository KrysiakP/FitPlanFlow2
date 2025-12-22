import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { PublicHeader } from "@/components/public-header";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

export default function LegalRegulamin() {
  const { user } = useAuth();

  useEffect(() => {
    document.title = "Regulamin | Panel Trenera";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute("content", "Regulamin korzystania z serwisu Panel Trenera - platforma dla trenerów personalnych i ich podopiecznych.");
    }
  }, []);

  return (
    <div className="min-h-screen bg-background" data-testid="page-regulamin">
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
              Regulamin
            </CardTitle>
            <p className="text-muted-foreground text-sm" data-testid="text-last-updated">
              Ostatnia aktualizacja: 22 grudnia 2024
            </p>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none" data-testid="content-regulamin">
            <section>
              <h2>§1. Postanowienia ogólne</h2>
              <ol>
                <li>Niniejszy Regulamin określa zasady korzystania z serwisu internetowego Panel Trenera, dostępnego pod adresem paneltrenera.pl (dalej: „Serwis").</li>
                <li>Operatorem Serwisu jest Panel Trenera Sp. z o.o. z siedzibą w Warszawie, ul. [Adres do uzupełnienia], 00-000 Warszawa, wpisana do rejestru przedsiębiorców Krajowego Rejestru Sądowego pod numerem KRS: [do uzupełnienia], NIP: [do uzupełnienia], REGON: [do uzupełnienia] (dalej: „Operator").</li>
                <li>Kontakt z Operatorem możliwy jest pod adresem e-mail: kontakt@paneltrenera.pl.</li>
                <li>Korzystanie z Serwisu oznacza akceptację niniejszego Regulaminu oraz Polityki Prywatności.</li>
                <li>Serwis przeznaczony jest dla osób pełnoletnich. Osoby niepełnoletnie mogą korzystać z Serwisu wyłącznie za zgodą opiekuna prawnego.</li>
              </ol>
            </section>

            <section>
              <h2>§2. Definicje</h2>
              <p>Użyte w Regulaminie pojęcia oznaczają:</p>
              <ol>
                <li><strong>Użytkownik</strong> – osoba fizyczna, która ukończyła 18 lat i posiada pełną zdolność do czynności prawnych, korzystająca z Serwisu jako Trener lub Podopieczny.</li>
                <li><strong>Trener</strong> – Użytkownik posiadający konto w Serwisie z uprawnieniami do tworzenia planów treningowych, zarządzania podopiecznymi oraz korzystania z funkcji dedykowanych trenerom personalnym.</li>
                <li><strong>Podopieczny</strong> – Użytkownik korzystający z Serwisu w celu realizacji planów treningowych przypisanych przez Trenera, bez możliwości tworzenia własnych planów dla innych osób.</li>
                <li><strong>Usługa</strong> – wszelkie funkcjonalności udostępniane przez Operatora w ramach Serwisu, w tym tworzenie planów treningowych, zarządzanie podopiecznymi, śledzenie postępów, komunikacja oraz inne funkcje dostępne w ramach wybranego planu subskrypcyjnego.</li>
                <li><strong>Konto</strong> – zbiór danych przechowywanych w Serwisie oraz w systemach informatycznych Operatora, dotyczących danego Użytkownika oraz składanych przez niego zamówień i zawieranych umów.</li>
                <li><strong>Subskrypcja</strong> – odpłatna forma dostępu do rozszerzonych funkcji Serwisu dla Trenerów, opłacana cyklicznie zgodnie z wybranym planem.</li>
                <li><strong>Plan Treningowy</strong> – zestaw ćwiczeń, instrukcji i zaleceń treningowych tworzony przez Trenera i przypisywany Podopiecznym.</li>
                <li><strong>Plan Dietetyczny</strong> – zestaw zaleceń żywieniowych i jadłospisów tworzony przez Trenera dla Podopiecznych.</li>
              </ol>
            </section>

            <section>
              <h2>§3. Warunki korzystania z Serwisu</h2>
              <ol>
                <li>Do korzystania z Serwisu niezbędne jest:
                  <ul>
                    <li>urządzenie z dostępem do sieci Internet (komputer, tablet, smartfon),</li>
                    <li>przeglądarka internetowa obsługująca JavaScript i cookies,</li>
                    <li>aktywne konto poczty elektronicznej.</li>
                  </ul>
                </li>
                <li>Użytkownik zobowiązany jest do:
                  <ul>
                    <li>podawania prawdziwych danych podczas rejestracji,</li>
                    <li>nieudostępniania danych dostępowych do Konta osobom trzecim,</li>
                    <li>korzystania z Serwisu zgodnie z jego przeznaczeniem,</li>
                    <li>przestrzegania przepisów prawa oraz postanowień niniejszego Regulaminu.</li>
                  </ul>
                </li>
                <li>Zabrania się:
                  <ul>
                    <li>wykorzystywania Serwisu do działań niezgodnych z prawem,</li>
                    <li>umieszczania treści obraźliwych, wulgarnych lub naruszających prawa osób trzecich,</li>
                    <li>podejmowania prób nieautoryzowanego dostępu do systemów Operatora,</li>
                    <li>automatycznego zbierania danych z Serwisu bez zgody Operatora.</li>
                  </ul>
                </li>
              </ol>
            </section>

            <section>
              <h2>§4. Rejestracja i Konto użytkownika</h2>
              <ol>
                <li>Rejestracja w Serwisie jest bezpłatna i dobrowolna.</li>
                <li>W celu utworzenia Konta należy:
                  <ul>
                    <li>wypełnić formularz rejestracyjny podając wymagane dane (adres e-mail, hasło),</li>
                    <li>zaakceptować niniejszy Regulamin oraz Politykę Prywatności,</li>
                    <li>potwierdzić rejestrację poprzez link aktywacyjny wysłany na podany adres e-mail.</li>
                  </ul>
                </li>
                <li>Po rejestracji Użytkownik wybiera rolę: Trener lub Podopieczny.</li>
                <li>Użytkownik jest odpowiedzialny za bezpieczeństwo swojego hasła i zobowiązany jest do jego nieudostępniania osobom trzecim.</li>
                <li>Konto jest przypisane do jednej osoby i nie może być przenoszone na inne osoby.</li>
                <li>Użytkownik może w każdej chwili usunąć swoje Konto kontaktując się z Operatorem lub korzystając z funkcji dostępnej w ustawieniach Konta.</li>
              </ol>
            </section>

            <section>
              <h2>§5. Subskrypcja i płatności</h2>
              <ol>
                <li>Dostęp do podstawowych funkcji Serwisu dla Podopiecznych jest bezpłatny.</li>
                <li>Trenerzy mogą korzystać z darmowego planu START z ograniczoną liczbą podopiecznych lub wykupić płatną Subskrypcję rozszerzającą możliwości.</li>
                <li>Dostępne plany subskrypcyjne oraz ich ceny są prezentowane na stronie cennika w Serwisie.</li>
                <li>Płatności za Subskrypcję są realizowane za pośrednictwem operatora płatności Stripe Payments Europe, Ltd.</li>
                <li>Subskrypcja jest odnawiana automatycznie na kolejny okres rozliczeniowy (miesiąc), chyba że Użytkownik anuluje ją przed końcem bieżącego okresu.</li>
                <li>Anulowanie Subskrypcji nie powoduje zwrotu opłaty za bieżący okres rozliczeniowy, jednak Użytkownik zachowuje dostęp do funkcji płatnych do końca opłaconego okresu.</li>
                <li>Ceny podane w Serwisie są cenami brutto (zawierają VAT).</li>
                <li>Operator wystawia faktury VAT na życzenie Użytkownika.</li>
                <li>W przypadku zmiany planu na wyższy, różnica w cenie jest pobierana proporcjonalnie do pozostałego czasu w bieżącym okresie rozliczeniowym.</li>
              </ol>
            </section>

            <section>
              <h2>§6. Prawa i obowiązki Użytkowników</h2>
              <ol>
                <li>Użytkownik ma prawo do:
                  <ul>
                    <li>korzystania z Usług zgodnie z wybranym planem,</li>
                    <li>dostępu do swoich danych i ich modyfikacji,</li>
                    <li>zgłaszania uwag i reklamacji dotyczących funkcjonowania Serwisu,</li>
                    <li>usunięcia Konta w dowolnym momencie.</li>
                  </ul>
                </li>
                <li>Użytkownik zobowiązany jest do:
                  <ul>
                    <li>aktualizowania swoich danych kontaktowych,</li>
                    <li>nieprzekazywania haseł i danych logowania osobom trzecim,</li>
                    <li>informowania Operatora o naruszeniach bezpieczeństwa Konta,</li>
                    <li>przestrzegania praw autorskich i praw własności intelektualnej.</li>
                  </ul>
                </li>
              </ol>
            </section>

            <section>
              <h2>§7. Zasady dla Trenerów</h2>
              <ol>
                <li>Trener oświadcza, że posiada odpowiednie kwalifikacje do prowadzenia działalności trenerskiej lub że korzysta z Serwisu w celach edukacyjnych.</li>
                <li>Trener ponosi pełną odpowiedzialność za treść tworzonych planów treningowych i dietetycznych.</li>
                <li>Trener zobowiązuje się do:
                  <ul>
                    <li>tworzenia planów dostosowanych do możliwości i stanu zdrowia podopiecznych,</li>
                    <li>nierekomendowania ćwiczeń lub diet mogących zagrażać zdrowiu,</li>
                    <li>zachowania poufności danych swoich podopiecznych,</li>
                    <li>nienawiązywania kontaktów z podopiecznymi innych trenerów bez ich zgody.</li>
                  </ul>
                </li>
                <li>Operator nie ponosi odpowiedzialności za jakość usług świadczonych przez Trenerów swoim Podopiecznym poza Serwisem.</li>
                <li>Trener może zaprosić podopiecznych do Serwisu poprzez dedykowany link zaproszeniowy.</li>
              </ol>
            </section>

            <section>
              <h2>§8. Zasady dla Podopiecznych</h2>
              <ol>
                <li>Podopieczny korzysta z planów treningowych i dietetycznych na własną odpowiedzialność.</li>
                <li>Przed rozpoczęciem realizacji planu treningowego Podopieczny powinien skonsultować się z lekarzem, szczególnie w przypadku problemów zdrowotnych.</li>
                <li>Podopieczny zobowiązuje się do:
                  <ul>
                    <li>rzetelnego wypełniania raportów tygodniowych i dziennych,</li>
                    <li>informowania Trenera o problemach zdrowotnych mogących wpływać na trening,</li>
                    <li>przestrzegania zaleceń Trenera w zakresie bezpieczeństwa wykonywania ćwiczeń.</li>
                  </ul>
                </li>
                <li>Podopieczny może być przypisany do jednego Trenera w danym czasie.</li>
              </ol>
            </section>

            <section>
              <h2>§9. Odpowiedzialność Operatora</h2>
              <ol>
                <li>Operator dokłada wszelkich starań, aby Serwis funkcjonował prawidłowo i był dostępny nieprzerwanie.</li>
                <li>Operator nie ponosi odpowiedzialności za:
                  <ul>
                    <li>przerwy w dostępie do Serwisu wynikające z przyczyn technicznych, konserwacji lub siły wyższej,</li>
                    <li>skutki zdrowotne wynikające z realizacji planów treningowych lub dietetycznych,</li>
                    <li>działania lub zaniechania Trenerów względem Podopiecznych,</li>
                    <li>treści umieszczane w Serwisie przez Użytkowników,</li>
                    <li>utratę danych wynikającą z działań Użytkownika lub osób trzecich.</li>
                  </ul>
                </li>
                <li>Operator zastrzega sobie prawo do:
                  <ul>
                    <li>czasowego zawieszenia działania Serwisu w celu konserwacji lub aktualizacji,</li>
                    <li>modyfikacji funkcjonalności Serwisu,</li>
                    <li>usunięcia Konta Użytkownika naruszającego Regulamin.</li>
                  </ul>
                </li>
              </ol>
            </section>

            <section>
              <h2>§10. Prawo odstąpienia od umowy</h2>
              <ol>
                <li>Użytkownik będący konsumentem ma prawo odstąpić od umowy o świadczenie Usług w terminie 14 dni od dnia jej zawarcia, bez podawania przyczyny.</li>
                <li>Aby skorzystać z prawa odstąpienia, należy poinformować Operatora o swojej decyzji w drodze jednoznacznego oświadczenia (np. pismo wysłane pocztą elektroniczną na adres: kontakt@paneltrenera.pl).</li>
                <li>W przypadku odstąpienia od umowy, Operator zwraca wszystkie otrzymane płatności niezwłocznie, nie później niż w terminie 14 dni od dnia otrzymania oświadczenia o odstąpieniu.</li>
                <li>Zwrot płatności następuje przy użyciu takich samych metod płatności, jakie zostały użyte przez Użytkownika w pierwotnej transakcji.</li>
                <li>Jeżeli Użytkownik zażądał rozpoczęcia świadczenia usług przed upływem terminu do odstąpienia od umowy, zobowiązany jest do zapłaty za usługi spełnione do chwili poinformowania o odstąpieniu.</li>
              </ol>
            </section>

            <section>
              <h2>§11. Reklamacje</h2>
              <ol>
                <li>Użytkownik ma prawo składać reklamacje dotyczące funkcjonowania Serwisu.</li>
                <li>Reklamacje należy składać drogą elektroniczną na adres: kontakt@paneltrenera.pl lub pisemnie na adres siedziby Operatora.</li>
                <li>Reklamacja powinna zawierać:
                  <ul>
                    <li>dane identyfikacyjne Użytkownika (imię, nazwisko, adres e-mail),</li>
                    <li>opis przedmiotu reklamacji,</li>
                    <li>oczekiwany sposób rozpatrzenia reklamacji.</li>
                  </ul>
                </li>
                <li>Operator rozpatruje reklamacje w terminie 14 dni od dnia ich otrzymania.</li>
                <li>Odpowiedź na reklamację jest przesyłana na adres e-mail Użytkownika.</li>
              </ol>
            </section>

            <section>
              <h2>§12. Ochrona danych osobowych</h2>
              <ol>
                <li>Administratorem danych osobowych Użytkowników jest Operator.</li>
                <li>Dane osobowe są przetwarzane zgodnie z Rozporządzeniem Parlamentu Europejskiego i Rady (UE) 2016/679 (RODO) oraz ustawą o ochronie danych osobowych.</li>
                <li>Szczegółowe informacje dotyczące przetwarzania danych osobowych zawarte są w Polityce Prywatności dostępnej w Serwisie.</li>
              </ol>
            </section>

            <section>
              <h2>§13. Własność intelektualna</h2>
              <ol>
                <li>Serwis oraz jego zawartość (w tym oprogramowanie, grafika, teksty, logotypy) są własnością Operatora i są chronione przepisami prawa autorskiego.</li>
                <li>Użytkownik nie nabywa żadnych praw własności intelektualnej do Serwisu poprzez korzystanie z niego.</li>
                <li>Trenerzy zachowują prawa autorskie do tworzonych przez siebie planów treningowych i dietetycznych, udzielając Operatorowi niewyłącznej licencji na ich przechowywanie i udostępnianie w ramach Serwisu.</li>
                <li>Kopiowanie, rozpowszechnianie lub wykorzystywanie materiałów z Serwisu bez zgody Operatora jest zabronione.</li>
              </ol>
            </section>

            <section>
              <h2>§14. Zmiany Regulaminu</h2>
              <ol>
                <li>Operator zastrzega sobie prawo do zmiany niniejszego Regulaminu w przypadku:
                  <ul>
                    <li>zmiany przepisów prawa wpływających na świadczenie Usług,</li>
                    <li>zmiany zakresu lub sposobu świadczenia Usług,</li>
                    <li>konieczności dostosowania Regulaminu do decyzji lub orzeczeń organów państwowych.</li>
                  </ul>
                </li>
                <li>O zmianach Regulaminu Użytkownicy będą informowani drogą elektroniczną co najmniej 14 dni przed wejściem zmian w życie.</li>
                <li>Użytkownik, który nie akceptuje zmian Regulaminu, ma prawo rozwiązać umowę przed wejściem zmian w życie.</li>
                <li>Korzystanie z Serwisu po wejściu w życie zmian oznacza akceptację nowego Regulaminu.</li>
              </ol>
            </section>

            <section>
              <h2>§15. Postanowienia końcowe</h2>
              <ol>
                <li>W sprawach nieuregulowanych niniejszym Regulaminem zastosowanie mają przepisy prawa polskiego, w szczególności Kodeksu cywilnego oraz ustawy o świadczeniu usług drogą elektroniczną.</li>
                <li>Ewentualne spory wynikające z korzystania z Serwisu będą rozstrzygane przez sąd właściwy dla siedziby Operatora, z zastrzeżeniem że w przypadku sporów z konsumentami zastosowanie mają przepisy o właściwości sądu dla miejsca zamieszkania konsumenta.</li>
                <li>Konsument ma możliwość skorzystania z pozasądowych sposobów rozpatrywania reklamacji i dochodzenia roszczeń, w tym z platformy ODR dostępnej pod adresem: https://ec.europa.eu/consumers/odr/</li>
                <li>Nieważność któregokolwiek postanowienia Regulaminu nie wpływa na ważność pozostałych postanowień.</li>
                <li>Regulamin wchodzi w życie z dniem 22 grudnia 2024 roku.</li>
              </ol>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
