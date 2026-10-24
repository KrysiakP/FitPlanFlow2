# Plan ulepszeń Panelu Trenera

Legenda: `[ ]` do zrobienia, `[x]` zrobione, `[Ty]` wymaga właściciela (konta, sekrety, sklepy, decyzje), `[~]` zrobione częściowo.
Kolejność prac: sekcja 8 (jakość) → 7 (bezpieczeństwo) → 6 → 3 → 1 → 2 → 4 → 5 → 9 → 10.

## 0. Wdrożenie
1. [Ty] Publikacja API w Replit z zatwierdzeniem zmian w bazie (12 nowych tabel, 12 kolumn, indeksy) albo uruchomienie `docs/migracje/2026-10-nowe-funkcje.sql` w konsoli bazy
2. [Ty] Sekret `CRON_JOB_TOKEN` + codzienny harmonogram
3. [Ty] Nowe buildy EAS iOS/Android
4. [Ty] Sekrety i ceny Stripe
5. [x] Skrypt kontrolny produkcji: `scripts/check-production.sh` (obecnie wskazuje, że produkcja jest starsza niż repo)
6. [x] `GET /api/health` (baza + `cronLastRunAt`); [Ty] podłącz do darmowego monitora (np. UptimeRobot), który zgłosi awarię
7. [Ty] Po publikacji: otwórz zdjęcie z raportu jako podopieczny, jako jego trener i jako obcy użytkownik (powinno: tak, tak, odmowa)

## 1. Podopieczny: trening
8. [x] Karta „Dziś w planie" na pulpicie klienta (web): kolejny trening z planu wg ostatnio zrobionego, przycisk otwiera go od razu
9. [~] Timer przerwy między seriami (aplikacja klienta): liczy do terminu zamiast sekunda po sekundzie, więc po blokadzie telefonu pokazuje właściwy czas; na końcu trzy mocne wibracje (oprócz haptyki), a gdy aplikacja jest w tle, przychodzi lokalne powiadomienie „Koniec przerwy" z dźwiękiem. Sprawdzono typami i testami logiki, nie na urządzeniu (potrzebny nowy build EAS)
10. [x] Podpowiedź obciążenia w formularzu serii (mobile): z ostatniej serii i zakresu powtórzeń w planie („Ostatnio 80 kg × 10: spróbuj 82,5 kg”); zasada podwójnej progresji, krok 2,5 kg (5 kg od 100 kg); testy; web jeszcze nie
11. [x] Już było: formularz serii wypełnia się wynikiem poprzedniej serii z tego treningu lub ostatniego treningu (powtórzenia i ciężar)
12. [x] Notatka do serii (do 500 znaków) widoczna dla trenera: pole w aplikacji klienta, sekcja „Uwagi z treningów" na webie i w aplikacji trenera
13. [x] Ocena trudności treningu 1-10 (RPE): okno po ukończonym treningu w aplikacji (można pominąć), zapis w sesji (API + test, walidacja 1-10), widoczna dla trenera w web i mobile (od 9 wyróżniona); podsumowanie zbiorcze jeszcze nie
14. [ ] Trening poza planem (własne ćwiczenia)
15. [x] Biblioteka ćwiczeń trenera (web): wyszukiwarka (bez względu na wielkość liter i polskie znaki, po nazwie, kategorii i opisie), filtry kategorii i „Tylko z filmem", licznik wyników. ulubione: gwiazdka na karcie ćwiczenia (kolumna `exercise_library.is_favorite` wymaga migracji, endpoint `PUT /api/exercises/library/:id/favorite`), ulubione wyświetlają się na początku, filtr „Ulubione"
16. [~] Zamiennik ćwiczenia za zgodą trenera (API + web): klient prosi o zamiennik pod ćwiczeniem w planie z krótkim powodem, trener dostaje push i kartę z prośbami na pulpicie, zatwierdza z nazwą ćwiczenia zastępczego (opcjonalna uwaga) albo zostawia bez zmian; klient dostaje push i widzi odpowiedź pod ćwiczeniem. Zamiennik dotyczy tylko tego klienta, wspólny plan i historia serii się nie zmieniają. Nowa tabela `exercise_swap_requests`. Aplikacja mobilna: przycisk „Poproś o zamiennik" pod ćwiczeniem w treningu i odpowiedź trenera (sprawdzone tylko typami, nie na urządzeniu)
17. [ ] Pełnoekranowy tryb treningu
18. [x] Serie rozgrzewkowe: pole „Seria rozgrzewkowa” w formularzu serii (mobile), zapisywane z flagą i pomijane w rekordach, historii siły i podpowiedziach/wypełnianiu obciążenia (API + test); web nie ma jeszcze takiego pola
19. [x] Historia ćwiczenia: wykres 1RM (był) + lista serii z ostatnich 6 dni treningowych (nowe, web; API zwraca serie dnia); karta siły widoczna też bez raportów
20. [x] Osiągnięcia: 8 odznak liczonych z historii (treningi, regularność tygodniowa, raporty, zdjęcie, wzrost siły), z paskiem postępu; web i mobile

## 2. Podopieczny: postępy, dieta, raporty
21. [x] Porównanie zdjęć przed/po (web: podopieczny i trener; wybór dowolnych dwóch raportów ze zdjęciem; mobile jeszcze nie)
22. [x] Wykresy obwodów z trendem: wykres 5 obwodów (był) + karty zmian przed/po, teraz także udo (web)
23. [x] Cel wagowy z terminem i paskiem postępu (API + testy, web na stronie progresu; ocena względem prostej linii start→termin; mobile jeszcze nie)
24. [~] Szkic raportu tygodniowego: wpisane pola zapisują się lokalnie (web: localStorage, mobile: AsyncStorage), wracają po zamknięciu (do 14 dni), znikają po zapisie raportu; kreatora krok po kroku jeszcze nie ma
25. [x] Wstępne uzupełnianie raportu: nowy raport zaczyna z obwodami i suplementami z poprzednich (waga, nastrój, sen, zdjęcie zawsze puste); web i mobile
26. [x] Lista zakupów z jadłospisu (web: sumuje składniki z podanymi ilościami z opisów posiłków, odhaczanie i kopiowanie; pozycje bez ilości pomija; mobile jeszcze nie)
27. [~] Zamienniki posiłków za zgodą trenera (API + web): jak przy ćwiczeniach (poz. 16): klient prosi pod posiłkiem w diecie, trener zatwierdza z posiłkiem zastępczym albo zostawia bez zmian w tej samej karcie „Prośby o zamiennik" na pulpicie; dotyczy tylko tego klienta, dieta się nie zmienia. Nowa tabela `meal_swap_requests`. Aplikacja mobilna: przycisk pod posiłkiem w diecie i odpowiedź; skrzynka próśb (ćwiczenia i posiłki) na ekranie głównym trenera, z oknem na wpisanie zamiennika. Widok klienta w diecie web i mobile sprawdzony tylko typami
28. [x] Sen (godziny na dobę) i woda (litry na dobę) w raporcie tygodniowym: formularz i podsumowanie w web i mobile, widok trenera w web i mobile, API (test w kontroli dostępu raportów)
29. [x] Kalkulator kalorii i makroskładników (web, strona diety: wzór Mifflina–St Jeora, cel redukcja/utrzymanie/masa, walidacja, adnotacja że to punkt wyjścia; bez zapisu w profilu; mobile jeszcze nie)
30. [Ty] Widżet ekranu głównego (wymaga natywnego buildu i testu na telefonie)

## 3. Trener: codzienna praca
31. [x] Przycisk „Przypomnij o treningu (N)" na liście „wymaga uwagi" (web): jednym kliknięciem do wszystkich nieaktywnych
32. [x] Gotowe plany: 4 szablony (FBW 3 dni, Push/Pull/Legs, Góra/Dół 4 dni, trening w domu), przycisk „Z szablonu" na liście planów tworzy własną kopię i otwiera ją do edycji (web); własne szablony trenera: przycisk „Szablon" na karcie planu zapisuje migawkę (dni i ćwiczenia, bez powiązań z historią), własne szablony są na górze listy z plakietką, można ich użyć i usunąć (limit 50; tabela `plan_templates`, endpointy `save-as-template`, `from-template/own:<id>`, `DELETE /api/plan-templates/:id`; test dymny + test jednostkowy migawki)
33. [x] Propozycje progresji dla trenera (web): ćwiczenia wykonane w ostatnim treningu w całości na najcięższym ciężarze (wszystkie serie i powtórzenia) dostają propozycję +2,5 kg (+5 kg od 100 kg); trener zatwierdza przyciskiem „Zastosuj" (zmienia ciężar w planie, także dla innych podopiecznych z tym planem). Nic nie dzieje się samo; w aplikacji trenera jeszcze nie ma
34. [x] Edycja planu bez gubienia historii: zapis edycji aktualizuje treningi i ćwiczenia w miejscu (dopasowanie po id, awaryjnie po nazwie), usuwa tylko to, co trener faktycznie wyjął z planu. Wcześniej każda edycja kasowała i tworzyła plan od nowa, a razem z nim serie, rekordy, historię siły i ukończone treningi podopiecznych (kaskada). To samo naprawione w jadłospisach: zapis tygodnia posiłków (`PUT /api/diets/plans/:id/meals/sync`) aktualizuje posiłki w miejscu, więc zaznaczone posiłki i zjedzone makra podopiecznego przetrwają edycję diety
35. [~] Komentarz trenera do ukończonego treningu (do 1000 znaków; push do klienta; web i mobile po obu stronach; kolumny `trainer_comment`, `trainer_commented_at` wymagają migracji); komentarza do zdjęcia jeszcze nie ma
36. [x] Szablony odpowiedzi w czacie trenera: 5 gotowych (web i mobile, wstawiane do pola wiadomości), w web własne szablony zapisywane w przeglądarce („Zapisz jako szablon”, do 8); zaplanowane wiadomości jeszcze nie
37. [x] Przypomnienia trenera o podopiecznym z datą (API, push w dniu terminu przez cron, testy, web na karcie podopiecznego; mobile jeszcze nie)
38. [x] Import podopiecznych z CSV (web, strona zaproszeń: podgląd, raport błędów, limit 100; testy parsera)
39. [x] Etykiety podopiecznych (prywatne dla trenera, do 5 po 24 znaki; edytor na karcie, chipy na liście, wyszukiwanie po etykiecie; API + testy; mobile jeszcze nie)
40. [x] Raport miesięczny (web): strona „Raport miesięczny" z wyborem miesiąca (treningi, czas, średnia trudność, raporty, zmiany ciała i siły) i przyciskiem „Drukuj / zapisz PDF" (drukowanie przeglądarki, sam wydruk nie sprawdzony w podglądzie druku). Dla podopiecznego (Mój progres) i dla trenera (przycisk na stronie progresu podopiecznego, ten sam widok); bez wersji w aplikacji mobilnej
41. [x] Kalendarz .ics (`GET /api/sessions/calendar.ics`, przyciski w web dla trenera i podopiecznego; subskrypcja na żywo wymagałaby tokenu w adresie, więc na razie plik do pobrania)
42. [x] Wolne terminy i rezerwacja przez podopiecznego (web): trener ustawia tygodniowe okna w profilu (czas polski, terminy 30–90 min), podopieczny widzi wolne terminy na 14 dni i rezerwuje jednym kliknięciem; zajęte terminy znikają, minimum 2 h wyprzedzenia, najwyżej 3 zaplanowane terminy naraz, trener dostaje push. Nowa tabela `trainer_availability` (dopisana do pliku migracji). Aplikacja klienta (mobile): karta „Umów trening" na ekranie głównym (tylko typy i testy logiki, nie sprawdzona na urządzeniu); ustawianie godzin przez trenera tylko na webie
43. [x] Odwołanie terminu przez podopiecznego najpóźniej 24 h przed (API 409 po terminie, push do trenera; przycisk na webie i w aplikacji)
44. [x] Statystyki biznesowe: przychód i zaległości (były) + retencja 90 dni, średni czas współpracy i zakończone współprace (nowe, web; w aplikacji mobilnej jeszcze nie)
45. [x] Strona wizytówka trenera z opiniami: profil `/t/:id` z opiniami i oceną już był, dodane tytuł, opis i dane strukturalne (Person + ocena tylko przy istniejących opiniach) dla linków i wyszukiwarek; przycisk kopiowania linku jest w profilu trenera. Uwaga: dane ustawia JavaScript, więc podglądy w komunikatorach, które go nie uruchamiają, nadal pokażą ogólny opis

## 4. Płatności
46. [~] Powiadomienia o płatnościach dla trenera: poprawka błędu (tekst zawierał surowy identyfikator klienta zamiast imienia i nazwiska) + push do trenera (raz na płatność i rodzaj; stuknięcie otwiera płatności w aplikacji i na webie; można wyłączyć w ustawieniach). Przypomnienie dla samego podopiecznego z linkiem do zapłaty wymaga decyzji o sposobie płatności [Ty]
47. [Ty] Faktury/rachunki (decyzja prawna i dane firmy)
48. [Ty] Rozliczenia studia (decyzja biznesowa)
49. [x] Przypomnienie na 3 dni przed końcem okresu próbnego (cron, raz na 4 dni, kliknięcie otwiera profil)
50. [x] Już było: przycisk portalu rozliczeń Stripe na profilu trenera (zmiana planu, anulowanie, historia płatności); wymaga sekretów Stripe po stronie produkcji
51. [ ] Kody rabatowe i saldo bonusów

## 5. Studia
52. [ ] Role w studiu
53. [x] Wspólna biblioteka ćwiczeń studia (web): właściciel dodaje ćwiczenia (nazwa, kategoria, opis, link do filmu, do 300), trenerzy studia widzą je na stronie biblioteki i kopiują do własnej jednym kliknięciem (kopia, późniejsze zmiany studia jej nie dotyczą). Nowa tabela `gym_exercises` (w pliku migracji). Bez edycji istniejących wpisów (usuń i dodaj od nowa) i bez aplikacji mobilnej
54. [x] Porównanie trenerów (bez danych osobowych): lista trenerów studia na webie ma liczbę podopiecznych i pasek aktywności względem najaktywniejszego (treningi z ostatnich 30 dni), a aplikacja właściciela ma wykresy słupkowe podopiecznych i treningów; bez imion podopiecznych, tylko zbiorcze liczby
55. [x] Ogłoszenia studia: przypinanie i „przeczytało X z Y" (API, testy, web, mobile)
56. [ ] Grafik sal i zasobów
57. [x] Zaproszenie trenera do studia linkiem: mail ma przycisk „Zobacz zaproszenie" (`/studio/join?code=…`), strona pokazuje bez logowania nazwę studia i zamaskowany adres (j***@domena), a zalogowany trener dołącza jednym kliknięciem; kod nadal można wpisać ręcznie. Zaproszenie jest przypisane do adresu e-mail, więc nie da się go użyć z cudzego konta

## 6. Powiadomienia i komunikacja
58. [x] Cichy tryb (presety godzin, czas polski; historia zachowana, telefon nie dzwoni)
59. [x] E-mail jako kanał zapasowy: ważne powiadomienia (termin, odwołanie, przypomnienie, nowy plan, zaakceptowane zaproszenie) przychodzą e-mailem, gdy użytkownik nie ma tokenu push i ma zweryfikowany adres; wyłączane w ustawieniach powiadomień („E-mail, gdy nie masz aplikacji"); wymaga działającego Resend (klucz już jest używany do reszty maili)
60. [x] Dzienne podsumowanie trenera: push „Twój dzień" (sesje dziś + nieotwarte raporty, tylko gdy coś jest, raz na 18 h, można wyciszyć); z crona
61. [~] Czat: „Przeczytano" pod ostatnią przeczytaną wiadomością (web + aplikacja klienta i trenera, testy); załączniki jeszcze nie
62. [x] Głębsze linki z powiadomień: nowa wiadomość na czacie wysyła push (gdy odbiorca nie ma otwartego połączenia na żywo; nadawca + podgląd do 100 znaków), a stuknięcie otwiera czat — u trenera od razu rozmowę z danym podopiecznym; web ma mapę rodzaj → strona
63. [x] Centrum powiadomień na web: dzwonek klienta z historią, licznikiem, „oznacz wszystkie" i przejściem do właściwej strony (trener miał już własny dzwonek)

## 7. Bezpieczeństwo i prywatność
64. [~] Zdjęcia raportów: nowe są zapisywane jako prywatne, a odczyt przez `/objects/...` ma regułę „tylko podopieczny i jego trener” także dla starych zdjęć oznaczonych jako publiczne (reguła przetestowana jednostkowo). Zostaje do sprawdzenia na prawdziwym magazynie po publikacji; stare adresy podpisane (7 dni) działają jak dotychczas
65. [~] Pliki wysyłane przez użytkowników są serwowane z restrykcyjnym CSP (`sandbox`, bez skryptów). Pełne CSP strony webowej [Ty]: strona jest serwowana osobno (hosting statyczny), nagłówek trzeba ustawić tam
66. [x] Logowanie dwuskładnikowe (aplikacja uwierzytelniająca, RFC 6238, kody zapasowe, sekret zaszyfrowany w bazie): włączanie i wyłączanie w web (strona konta), pole kodu przy logowaniu w web i w aplikacji mobilnej; konfiguracja tylko w web (bez kodu QR, klucz do wpisania). Przy okazji odpowiedzi API (logowanie, /api/auth/user i inne) nie zawierają już tokenów resetu hasła ani weryfikacji e-mail
67. [x] „Wyloguj ze wszystkich urządzeń" (API, web, mobile, testy) + lista zalogowanych urządzeń: nazwa z przeglądarki/aplikacji („Chrome, macOS", „Aplikacja na Androidzie"), czas logowania, znacznik „to urządzenie", wylogowanie pojedynczego urządzenia (web: strona konta, mobile: ekran profilu); do 20 najnowszych na rodzaj; dwie nowe kolumny w `mobile_tokens`. Przy okazji naprawiono zapis sesji przy każdym żądaniu z tokenem Bearer
68. [x] Dziennik wyświetleń danych podopiecznego (tabela `data_access_log`, jeden wpis na godzinę), widoczny dla podopiecznego w web i mobile („Kto oglądał moje dane")
69. [Ty] Zgody RODO per cel: potrzebne brzmienie od prawnika (dane o zdrowiu); po dostarczeniu tekstu dopiszę zapis zgód z datą
70. [x] Okazało się, że usuwanie konta działa od razu (nie po 30 dniach, jak sugerował tekst): poprawiłem teksty (web, mobile, pomoc) i dodałem anulowanie subskrypcji Stripe przy usunięciu konta (wcześniej usunięty trener mógł być dalej obciążany)
71. [~] Audyt zależności: 0 krytycznych; zostają 2 wysokie i 1 umiarkowana bez wydanej poprawki (narzędzia buildowe: node-forge, braces, sprintf-js), do ponownego sprawdzenia przy następnej aktualizacji

## 8. Jakość i utrzymanie
72. [x] Kontrola przed wypchnięciem: `scripts/check.sh` + hook `scripts/install-hooks.sh` (typy, buildy, testy). [Ty] GitHub Actions: token nie ma zakresu `workflow`; gotowy plik w `docs/ci-github-actions.yml.example`, wystarczy go skopiować do `.github/workflows/ci.yml`
73. [ ] Testy przeglądarkowe kluczowych ścieżek web
74. [ ] Testy mobilne na symulatorze
75. [x] Typy w aplikacji web: 80 → 0 błędów. Przy okazji wyszło, że formularze oparte na współdzielonych schematach (zod 4) nie pokazywały błędów walidacji, bo resolver z `@hookform/resolvers` 3.x rzucał wyjątek; formularz rejestracji miał dodatkowo schemat, który rzucał przy każdej walidacji. Naprawione własnym resolverem (`lib/formResolver.ts`, zod 3 i 4, testy) i poprawionym schematem rejestracji
76. [~] Podział `routes.ts`: wydzielone `routes/gym.ts` (studia, ~950 linii), `services/push.ts` (wysyłka powiadomień) i `middlewares/requireAdmin.ts`; `routes.ts` zmalał z 7776 do 6782 linii. Kolejne bloki (płatności, diety, czat, raporty) do wydzielenia tą samą metodą, testy chronią przed błędami
77. [x] Usunięty nieużywany `dla-trenera.tsx`; telefon i cel na karcie podopiecznego działają z prawdziwych danych
78. [x] `docs/ARCHITEKTURA.md`
79. [x] Migracje bazy jako plik: `docs/migracje/2026-10-nowe-funkcje.sql` (7 nowych tabel, 9 kolumn, indeksy, klucze obce; idempotentny, sprawdzony na pustej bazie, dwukrotnie); projekt nadal używa `drizzle-kit push`, plik to ręczna alternatywa
80. [Ty] Kopie zapasowe bazy (dostęp do Replit/hostingu)

## 9. Wydajność i wygoda
81. [~] Wydajność list: lista podopiecznych i statystyki trenera nie wykonują już zapytań osobno dla każdego podopiecznego/planu (jedno zapytanie zamiast N+1); czat zwraca ostatnie 200 wiadomości (`?limit=`, do 1000) z przyciskiem „Wczytaj starsze" na webie i w aplikacji, bo aplikacja odpytywała cały czat co 5 s; pozostałe listy (serie do wykresów, płatności) bez limitu, bo wykresy i rekordy liczą się z całej historii
82. [x] Indeksy (raporty, relacje, terminy sesji, historia powiadomień); trafią na produkcję przy publikacji
83. [ ] Kolejka zapisu offline
84. [x] Ciemny motyw: własny skrypt kontrastu (z wyłączonymi animacjami) przeszedł 11 ekranów trenera i 11 ekranów klienta po zalogowaniu. Znalezione i naprawione: tekst `text-destructive` miał ok. 2:1 (komunikaty błędów, „Strefa niebezpieczna") i legendy wykresów w kolorze serii (2:1); wcześniej tekst w kolorze marki na stronie głównej. Sprawdzone tylko na webie
85. [x] Dostępność web: audyt (obrazy bez alt, przyciski i linki bez nazwy, pola bez etykiet, liczba H1) na 14 ekranach trenera i 11 klienta po zalogowaniu. Naprawione: przyciski-ikony „usuń trening/ćwiczenie" w kreatorze planu, przyciski edycji raportu (ok. 20 bez nazwy), pole kodu studia, brak H1 na stronie konta i w pustych stanach planu; wcześniej strona główna (jeden H1). Dwa pola `select` oznaczone przez audyt to ukryte kontrolki biblioteki Radix (aria-hidden), nie błąd
86. [ ] Wersja angielska (przygotowanie tłumaczeń)

## 10. Marketing i wzrost
87. [x] Zamiast osobnej strony: karty funkcji na stronie głównej (strona `dla-trenera` usunięta jako zbędna)
88. [x] Blog dla trenerów: `/blog` i 3 artykuły (`/blog/...`) z tytułem, opisem i danymi strukturalnymi Article, wpisy w sitemap, link w stopce, przycisk zakładania konta; testy sprawdzają unikalność adresów, długość opisów i wpisy w sitemap. [Ty] Warto przejrzeć treść artykułów pod własny głos marki i dopisać kolejne
89. [Ty] Wejście na sklepy (konta deweloperskie, zrzuty ekranu)
90. [x] Zaproszenie linkiem z podglądem: trener do studia (poz. 57) i podopieczny (nowe): e-mail z zaproszeniem ma link „Otwórz zaproszenie w przeglądarce" (`/join?code=…`), strona pokazuje bez logowania, kto zaprasza i na jaki adres, a „Załóż konto" otwiera rejestrację z uzupełnionym adresem; po potwierdzeniu adresu zaproszenie czeka na pulpicie. Wysyłki maila z linkiem nie sprawdzono (brak konfiguracji Resend lokalnie), stronę tak
91. [x] Program poleceń od pierwszego dnia: karta na pulpicie trenera (web) z przyciskiem „Kopiuj link" i licznikiem zdobytych dni bonusu, link do szczegółów; mobile jeszcze nie
92. [x] Prośba o opinię po 30 dniach współpracy (cron, raz, tylko jeśli nie ma opinii; można wyłączyć w ustawieniach powiadomień; kliknięcie otwiera profil, gdzie jest ocena)


## Stan końcowy pętli (22.10.2026)
Zrobione 52, częściowo 20, do zrobienia 9, wymaga właściciela 11. Pozostałe `[ ]` to pozycje, których nie da się uczciwie dokończyć bez decyzji lub urządzenia:
- 14 — trening poza planem: wymaga zmiany modelu danych (sesje i serie są powiązane z planem i ćwiczeniem), więc najpierw decyzja, jak to ma działać;
- 17 — pełnoekranowy tryb treningu: ekran w aplikacji, trzeba go sprawdzić na urządzeniu;
- 51 — kody rabatowe i saldo bonusów: dotyka rozliczeń i Stripe;
- 52, 56 — role w studiu i grafik sal: niedookreślone zasady;
- 73, 74 — testy przeglądarkowe i na symulatorze: potrzebna infrastruktura (Playwright/pobranie przeglądarki, zbudowana aplikacja);
- 83 — kolejka zapisu offline: ryzykowna bez testów na telefonie;
- 86 — wersja angielska: duży zakres, najpierw decyzja o języku i zakresie.

Częściowe (`[~]`) to głównie funkcje zrobione w API i na webie, a w aplikacji mobilnej sprawdzone tylko typami i testami logiki: warto je obejrzeć po nowym buildzie EAS.
