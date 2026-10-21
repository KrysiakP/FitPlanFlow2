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
7. [Ty] Prywatne zdjęcia raportów na prawdziwym magazynie (patrz 64)

## 1. Podopieczny: trening
8. [ ] Widok „dziś w planie" z przyciskiem startu (web)
9. [ ] Timer przerwy: wibracja/dźwięk, praca w tle
10. [ ] Podpowiedź obciążenia z ostatniego treningu
11. [ ] Kopiowanie poprzedniej serii jednym dotknięciem
12. [ ] Notatka do ćwiczenia widoczna dla trenera
13. [ ] RPE po treningu i podsumowanie dla trenera
14. [ ] Trening poza planem (własne ćwiczenia)
15. [ ] Biblioteka filmów z wyszukiwarką i ulubionymi
16. [ ] Zamiennik ćwiczenia za zgodą trenera
17. [ ] Pełnoekranowy tryb treningu
18. [ ] Serie rozgrzewkowe nie liczą się do rekordów
19. [ ] Historia ćwiczenia (lista serii + wykres)
20. [x] Osiągnięcia: 8 odznak liczonych z historii (treningi, regularność tygodniowa, raporty, zdjęcie, wzrost siły), z paskiem postępu; web i mobile

## 2. Podopieczny: postępy, dieta, raporty
21. [x] Porównanie zdjęć przed/po (web: podopieczny i trener; wybór dowolnych dwóch raportów ze zdjęciem; mobile jeszcze nie)
22. [ ] Wykresy obwodów z trendem
23. [ ] Cele z terminem i paskiem postępu
24. [ ] Raport tygodniowy w kreatorze + szkic
25. [ ] Wstępne uzupełnianie raportu
26. [x] Lista zakupów z jadłospisu (web: sumuje składniki z podanymi ilościami z opisów posiłków, odhaczanie i kopiowanie; pozycje bez ilości pomija; mobile jeszcze nie)
27. [ ] Zamienniki posiłków (do zatwierdzenia)
28. [ ] Woda i sen w raporcie
29. [ ] Kalkulator makroskładników
30. [Ty] Widżet ekranu głównego (wymaga natywnego buildu i testu na telefonie)

## 3. Trener: codzienna praca
31. [ ] Akcje zbiorcze na liście „wymaga uwagi"
32. [ ] Szablony i biblioteka gotowych planów
33. [ ] Automatyczna progresja obciążeń
34. [ ] Edycja planu w trakcie bez gubienia historii
35. [ ] Komentarz trenera do treningu/zdjęcia
36. [ ] Szablony odpowiedzi w czacie
37. [ ] Notatki z przypomnieniem na datę
38. [x] Import podopiecznych z CSV (web, strona zaproszeń: podgląd, raport błędów, limit 100; testy parsera)
39. [x] Etykiety podopiecznych (prywatne dla trenera, do 5 po 24 znaki; edytor na karcie, chipy na liście, wyszukiwanie po etykiecie; API + testy; mobile jeszcze nie)
40. [ ] Raport miesięczny PDF
41. [x] Kalendarz .ics (`GET /api/sessions/calendar.ics`, przyciski w web dla trenera i podopiecznego; subskrypcja na żywo wymagałaby tokenu w adresie, więc na razie plik do pobrania)
42. [ ] Wolne terminy i zapisy przez podopiecznego
43. [ ] Zasada odwołania do 24 h
44. [x] Statystyki biznesowe: przychód i zaległości (były) + retencja 90 dni, średni czas współpracy i zakończone współprace (nowe, web; w aplikacji mobilnej jeszcze nie)
45. [ ] Strona wizytówka trenera z opiniami

## 4. Płatności
46. [ ] Przypomnienie o płatności z linkiem
47. [Ty] Faktury/rachunki (decyzja prawna i dane firmy)
48. [Ty] Rozliczenia studia (decyzja biznesowa)
49. [x] Przypomnienie na 3 dni przed końcem okresu próbnego (cron, raz na 4 dni, kliknięcie otwiera profil)
50. [ ] Panel „moja subskrypcja"
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
60. [ ] Dzienne podsumowanie trenera
61. [ ] Czat: załączniki i potwierdzenie odczytu
62. [ ] Głębsze linki z powiadomień
63. [ ] Centrum powiadomień na web

## 7. Bezpieczeństwo i prywatność
64. [ ] Prywatne zdjęcia raportów (kod; test na prawdziwym magazynie po wdrożeniu)
65. [~] Pliki wysyłane przez użytkowników są serwowane z restrykcyjnym CSP (`sandbox`, bez skryptów). Pełne CSP strony webowej [Ty]: strona jest serwowana osobno (hosting statyczny), nagłówek trzeba ustawić tam
66. [ ] TOTP dla trenerów i właścicieli
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
76. [ ] Podział `routes.ts` na moduły
77. [x] Usunięty nieużywany `dla-trenera.tsx`; telefon i cel na karcie podopiecznego działają z prawdziwych danych
78. [x] `docs/ARCHITEKTURA.md`
79. [ ] Migracje bazy jako pliki
80. [Ty] Kopie zapasowe bazy (dostęp do Replit/hostingu)

## 9. Wydajność i wygoda
81. [ ] Paginacja list
82. [x] Indeksy (raporty, relacje, terminy sesji, historia powiadomień); trafią na produkcję przy publikacji
83. [ ] Kolejka zapisu offline
84. [ ] Dopracowanie ciemnego motywu
85. [~] Dostępność web: przejrzane główne ekrany trenera własnym skryptem (przyciski bez nazw, pole bez etykiety, brak H1): poprawione motyw, powiadomienia, zaproszenie, wyszukiwarka, nagłówek listy; do sprawdzenia ekrany podopiecznego i kontrasty
86. [ ] Wersja angielska (przygotowanie tłumaczeń)

## 10. Marketing i wzrost
87. [x] Zamiast osobnej strony: karty funkcji na stronie głównej (strona `dla-trenera` usunięta jako zbędna)
88. [ ] Blog SEO (artykuły)
89. [Ty] Wejście na sklepy (konta deweloperskie, zrzuty ekranu)
90. [ ] Zaproszenie linkiem z podglądem
91. [ ] Program poleceń widoczny od pierwszego dnia
92. [x] Prośba o opinię po 30 dniach współpracy (cron, raz, tylko jeśli nie ma opinii; można wyłączyć w ustawieniach powiadomień; kliknięcie otwiera profil, gdzie jest ocena)
