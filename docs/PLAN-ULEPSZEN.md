# Plan ulepszeń Panelu Trenera

Legenda: `[ ]` do zrobienia, `[x]` zrobione, `[Ty]` wymaga właściciela (konta, sekrety, sklepy, decyzje), `[~]` zrobione częściowo.
Kolejność prac: sekcja 8 (jakość) → 7 (bezpieczeństwo) → 6 → 3 → 1 → 2 → 4 → 5 → 9 → 10.

## 0. Wdrożenie
1. [Ty] Publikacja API w Replit (zatwierdzić tabele `gym_announcements`, `notification_preferences`)
2. [Ty] Sekret `CRON_JOB_TOKEN` + codzienny harmonogram
3. [Ty] Nowe buildy EAS iOS/Android
4. [Ty] Sekrety i ceny Stripe
5. [x] Skrypt kontrolny produkcji: `scripts/check-production.sh` (obecnie wskazuje, że produkcja jest starsza niż repo)
6. [x] `GET /api/health` (baza + `cronLastRunAt`); [Ty] podłącz do darmowego monitora (np. UptimeRobot), który zgłosi awarię
7. [Ty] Po publikacji: otwórz zdjęcie z raportu jako podopieczny, jako jego trener i jako obcy użytkownik (powinno: tak, tak, odmowa)

## 1. Podopieczny: trening
8. [x] Karta „Dziś w planie" na pulpicie klienta (web): kolejny trening z planu wg ostatnio zrobionego, przycisk otwiera go od razu
9. [ ] Timer przerwy: wibracja/dźwięk, praca w tle
10. [x] Podpowiedź obciążenia w formularzu serii (mobile): z ostatniej serii i zakresu powtórzeń w planie („Ostatnio 80 kg × 10: spróbuj 82,5 kg”); zasada podwójnej progresji, krok 2,5 kg (5 kg od 100 kg); testy; web jeszcze nie
11. [x] Już było: formularz serii wypełnia się wynikiem poprzedniej serii z tego treningu lub ostatniego treningu (powtórzenia i ciężar)
12. [x] Notatka do serii (do 500 znaków) widoczna dla trenera: pole w aplikacji klienta, sekcja „Uwagi z treningów" na webie i w aplikacji trenera
13. [x] Ocena trudności treningu 1-10 (RPE): okno po ukończonym treningu w aplikacji (można pominąć), zapis w sesji (API + test, walidacja 1-10), widoczna dla trenera w web i mobile (od 9 wyróżniona); podsumowanie zbiorcze jeszcze nie
14. [ ] Trening poza planem (własne ćwiczenia)
15. [ ] Biblioteka filmów z wyszukiwarką i ulubionymi
16. [ ] Zamiennik ćwiczenia za zgodą trenera
17. [ ] Pełnoekranowy tryb treningu
18. [x] Serie rozgrzewkowe: pole „Seria rozgrzewkowa” w formularzu serii (mobile), zapisywane z flagą i pomijane w rekordach, historii siły i podpowiedziach/wypełnianiu obciążenia (API + test); web nie ma jeszcze takiego pola
19. [x] Historia ćwiczenia: wykres 1RM (był) + lista serii z ostatnich 6 dni treningowych (nowe, web; API zwraca serie dnia); karta siły widoczna też bez raportów
20. [x] Osiągnięcia: 8 odznak liczonych z historii (treningi, regularność tygodniowa, raporty, zdjęcie, wzrost siły), z paskiem postępu; web i mobile

## 2. Podopieczny: postępy, dieta, raporty
21. [x] Porównanie zdjęć przed/po (web: podopieczny i trener; wybór dowolnych dwóch raportów ze zdjęciem; mobile jeszcze nie)
22. [x] Wykresy obwodów z trendem: wykres 5 obwodów (był) + karty zmian przed/po, teraz także udo (web)
23. [x] Cel wagowy z terminem i paskiem postępu (API + testy, web na stronie progresu; ocena względem prostej linii start→termin; mobile jeszcze nie)
24. [ ] Raport tygodniowy w kreatorze + szkic
25. [x] Wstępne uzupełnianie raportu: nowy raport zaczyna z obwodami i suplementami z poprzednich (waga, nastrój, sen, zdjęcie zawsze puste); web i mobile
26. [x] Lista zakupów z jadłospisu (web: sumuje składniki z podanymi ilościami z opisów posiłków, odhaczanie i kopiowanie; pozycje bez ilości pomija; mobile jeszcze nie)
27. [ ] Zamienniki posiłków (do zatwierdzenia)
28. [x] Sen (godziny na dobę) i woda (litry na dobę) w raporcie tygodniowym: formularz i podsumowanie w web i mobile, widok trenera w web i mobile, API (test w kontroli dostępu raportów)
29. [x] Kalkulator kalorii i makroskładników (web, strona diety: wzór Mifflina–St Jeora, cel redukcja/utrzymanie/masa, walidacja, adnotacja że to punkt wyjścia; bez zapisu w profilu; mobile jeszcze nie)
30. [Ty] Widżet ekranu głównego (wymaga natywnego buildu i testu na telefonie)

## 3. Trener: codzienna praca
31. [x] Przycisk „Przypomnij o treningu (N)" na liście „wymaga uwagi" (web): jednym kliknięciem do wszystkich nieaktywnych
32. [ ] Szablony i biblioteka gotowych planów
33. [ ] Automatyczna progresja obciążeń
34. [ ] Edycja planu w trakcie bez gubienia historii
35. [ ] Komentarz trenera do treningu/zdjęcia
36. [x] Szablony odpowiedzi w czacie trenera: 5 gotowych (web i mobile, wstawiane do pola wiadomości), w web własne szablony zapisywane w przeglądarce („Zapisz jako szablon”, do 8); zaplanowane wiadomości jeszcze nie
37. [x] Przypomnienia trenera o podopiecznym z datą (API, push w dniu terminu przez cron, testy, web na karcie podopiecznego; mobile jeszcze nie)
38. [x] Import podopiecznych z CSV (web, strona zaproszeń: podgląd, raport błędów, limit 100; testy parsera)
39. [x] Etykiety podopiecznych (prywatne dla trenera, do 5 po 24 znaki; edytor na karcie, chipy na liście, wyszukiwanie po etykiecie; API + testy; mobile jeszcze nie)
40. [ ] Raport miesięczny PDF
41. [x] Kalendarz .ics (`GET /api/sessions/calendar.ics`, przyciski w web dla trenera i podopiecznego; subskrypcja na żywo wymagałaby tokenu w adresie, więc na razie plik do pobrania)
42. [ ] Wolne terminy i zapisy przez podopiecznego
43. [x] Odwołanie terminu przez podopiecznego najpóźniej 24 h przed (API 409 po terminie, push do trenera; przycisk na webie i w aplikacji)
44. [x] Statystyki biznesowe: przychód i zaległości (były) + retencja 90 dni, średni czas współpracy i zakończone współprace (nowe, web; w aplikacji mobilnej jeszcze nie)
45. [ ] Strona wizytówka trenera z opiniami

## 4. Płatności
46. [ ] Przypomnienie o płatności z linkiem
47. [Ty] Faktury/rachunki (decyzja prawna i dane firmy)
48. [Ty] Rozliczenia studia (decyzja biznesowa)
49. [x] Przypomnienie na 3 dni przed końcem okresu próbnego (cron, raz na 4 dni, kliknięcie otwiera profil)
50. [x] Już było: przycisk portalu rozliczeń Stripe na profilu trenera (zmiana planu, anulowanie, historia płatności); wymaga sekretów Stripe po stronie produkcji
51. [ ] Kody rabatowe i saldo bonusów

## 5. Studia
52. [ ] Role w studiu
53. [ ] Wspólna biblioteka ćwiczeń studia
54. [ ] Porównanie trenerów (bez danych osobowych)
55. [x] Ogłoszenia studia: przypinanie i „przeczytało X z Y" (API, testy, web, mobile)
56. [ ] Grafik sal i zasobów
57. [ ] Zaproszenia trenerów linkiem

## 6. Powiadomienia i komunikacja
58. [x] Cichy tryb (presety godzin, czas polski; historia zachowana, telefon nie dzwoni)
59. [ ] E-mail jako kanał zapasowy
60. [x] Dzienne podsumowanie trenera: push „Twój dzień" (sesje dziś + nieotwarte raporty, tylko gdy coś jest, raz na 18 h, można wyciszyć); z crona
61. [ ] Czat: załączniki i potwierdzenie odczytu
62. [~] Głębsze linki z powiadomień: web ma mapę rodzaj → strona (testy); aplikacja miała już własną; brakuje przejścia do konkretnego podopiecznego/rozmowy
63. [x] Centrum powiadomień na web: dzwonek klienta z historią, licznikiem, „oznacz wszystkie" i przejściem do właściwej strony (trener miał już własny dzwonek)

## 7. Bezpieczeństwo i prywatność
64. [~] Zdjęcia raportów: nowe są zapisywane jako prywatne, a odczyt przez `/objects/...` ma regułę „tylko podopieczny i jego trener” także dla starych zdjęć oznaczonych jako publiczne (reguła przetestowana jednostkowo). Zostaje do sprawdzenia na prawdziwym magazynie po publikacji; stare adresy podpisane (7 dni) działają jak dotychczas
65. [~] Pliki wysyłane przez użytkowników są serwowane z restrykcyjnym CSP (`sandbox`, bez skryptów). Pełne CSP strony webowej [Ty]: strona jest serwowana osobno (hosting statyczny), nagłówek trzeba ustawić tam
66. [x] Logowanie dwuskładnikowe (aplikacja uwierzytelniająca, RFC 6238, kody zapasowe, sekret zaszyfrowany w bazie): włączanie i wyłączanie w web (strona konta), pole kodu przy logowaniu w web i w aplikacji mobilnej; konfiguracja tylko w web (bez kodu QR, klucz do wpisania). Przy okazji odpowiedzi API (logowanie, /api/auth/user i inne) nie zawierają już tokenów resetu hasła ani weryfikacji e-mail
67. [~] „Wyloguj ze wszystkich urządzeń" (API, web, mobile, testy); lista urządzeń do zrobienia
68. [x] Dziennik wyświetleń danych podopiecznego (tabela `data_access_log`, jeden wpis na godzinę), widoczny dla podopiecznego w web i mobile („Kto oglądał moje dane")
69. [Ty] Zgody RODO per cel: potrzebne brzmienie od prawnika (dane o zdrowiu); po dostarczeniu tekstu dopiszę zapis zgód z datą
70. [x] Okazało się, że usuwanie konta działa od razu (nie po 30 dniach, jak sugerował tekst): poprawiłem teksty (web, mobile, pomoc) i dodałem anulowanie subskrypcji Stripe przy usunięciu konta (wcześniej usunięty trener mógł być dalej obciążany)
71. [~] Audyt zależności: 0 krytycznych; zostają 2 wysokie i 1 umiarkowana bez wydanej poprawki (narzędzia buildowe: node-forge, braces, sprintf-js), do ponownego sprawdzenia przy następnej aktualizacji

## 8. Jakość i utrzymanie
72. [x] Kontrola przed wypchnięciem: `scripts/check.sh` + hook `scripts/install-hooks.sh` (typy, buildy, testy). [Ty] GitHub Actions: token nie ma zakresu `workflow`; gotowy plik w `docs/ci-github-actions.yml.example`, wystarczy go skopiować do `.github/workflows/ci.yml`
73. [ ] Testy przeglądarkowe kluczowych ścieżek web
74. [ ] Testy mobilne na symulatorze
75. [~] Typy w aplikacji web (80 → 32 błędów)
76. [~] Podział `routes.ts`: wydzielone `routes/gym.ts` (studia, ~950 linii), `services/push.ts` (wysyłka powiadomień) i `middlewares/requireAdmin.ts`; `routes.ts` zmalał z 7776 do 6782 linii. Kolejne bloki (płatności, diety, czat, raporty) do wydzielenia tą samą metodą, testy chronią przed błędami
77. [x] Usunięty nieużywany `dla-trenera.tsx`; telefon i cel na karcie podopiecznego działają z prawdziwych danych
78. [x] `docs/ARCHITEKTURA.md`
79. [ ] Migracje bazy jako pliki
80. [Ty] Kopie zapasowe bazy (dostęp do Replit/hostingu)

## 9. Wydajność i wygoda
81. [~] Wydajność list: lista podopiecznych i statystyki trenera nie wykonują już zapytań osobno dla każdego podopiecznego/planu (jedno zapytanie zamiast N+1); właściwa paginacja do dodania przy większej liczbie danych
82. [x] Indeksy (raporty, relacje, terminy sesji, historia powiadomień); trafią na produkcję przy publikacji
83. [ ] Kolejka zapisu offline
84. [~] Ciemny motyw: własny skrypt kontrastu na stronie głównej znalazł niski kontrast niebieskiego tekstu (2:1); w trybie ciemnym tekst w kolorze marki jest teraz jaśniejszy (~7:1). Przyciski bez zmian. Do sprawdzenia ekrany po zalogowaniu
85. [~] Dostępność web (+ strona główna ma teraz jeden nagłówek H1, sekcje są H2, logo w nagłówku nie jest już H1): przejrzane główne ekrany trenera własnym skryptem (przyciski bez nazw, pole bez etykiety, brak H1): poprawione motyw, powiadomienia, zaproszenie, wyszukiwarka, nagłówek listy; do sprawdzenia ekrany podopiecznego i kontrasty
86. [ ] Wersja angielska (przygotowanie tłumaczeń)

## 10. Marketing i wzrost
87. [x] Zamiast osobnej strony: karty funkcji na stronie głównej (strona `dla-trenera` usunięta jako zbędna)
88. [x] Blog dla trenerów: `/blog` i 3 artykuły (`/blog/...`) z tytułem, opisem i danymi strukturalnymi Article, wpisy w sitemap, link w stopce, przycisk zakładania konta; testy sprawdzają unikalność adresów, długość opisów i wpisy w sitemap. [Ty] Warto przejrzeć treść artykułów pod własny głos marki i dopisać kolejne
89. [Ty] Wejście na sklepy (konta deweloperskie, zrzuty ekranu)
90. [ ] Zaproszenie linkiem z podglądem
91. [ ] Program poleceń widoczny od pierwszego dnia
92. [x] Prośba o opinię po 30 dniach współpracy (cron, raz, tylko jeśli nie ma opinii; można wyłączyć w ustawieniach powiadomień; kliknięcie otwiera profil, gdzie jest ocena)
