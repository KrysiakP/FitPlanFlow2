# Plan ulepszeń Panelu Trenera

Legenda: `[ ]` do zrobienia, `[x]` zrobione, `[Ty]` wymaga właściciela (konta, sekrety, sklepy, decyzje), `[~]` zrobione częściowo.
Kolejność prac: sekcja 8 (jakość) → 7 (bezpieczeństwo) → 6 → 3 → 1 → 2 → 4 → 5 → 9 → 10.

## 0. Wdrożenie
1. [Ty] Publikacja API w Replit (zatwierdzić tabele `gym_announcements`, `notification_preferences`)
2. [Ty] Sekret `CRON_JOB_TOKEN` + codzienny harmonogram
3. [Ty] Nowe buildy EAS iOS/Android
4. [Ty] Sekrety i ceny Stripe
5. [ ] Skrypt kontrolny produkcji (tylko odczyt)
6. [ ] Endpoint zdrowia + alert gdy harmonogram milczy
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
20. [ ] Odznaki i serie

## 2. Podopieczny: postępy, dieta, raporty
21. [ ] Porównanie zdjęć przed/po
22. [ ] Wykresy obwodów z trendem
23. [ ] Cele z terminem i paskiem postępu
24. [ ] Raport tygodniowy w kreatorze + szkic
25. [ ] Wstępne uzupełnianie raportu
26. [ ] Lista zakupów z jadłospisu
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
38. [ ] Import podopiecznych z CSV
39. [ ] Etykiety/grupy podopiecznych
40. [ ] Raport miesięczny PDF
41. [ ] Kalendarz .ics
42. [ ] Wolne terminy i zapisy przez podopiecznego
43. [ ] Zasada odwołania do 24 h
44. [ ] Statystyki biznesowe (przychód, retencja)
45. [ ] Strona wizytówka trenera z opiniami

## 4. Płatności
46. [ ] Przypomnienie o płatności z linkiem
47. [Ty] Faktury/rachunki (decyzja prawna i dane firmy)
48. [Ty] Rozliczenia studia (decyzja biznesowa)
49. [ ] Przypomnienie przed końcem okresu próbnego
50. [ ] Panel „moja subskrypcja"
51. [ ] Kody rabatowe i saldo bonusów

## 5. Studia
52. [ ] Role w studiu
53. [ ] Wspólna biblioteka ćwiczeń studia
54. [ ] Porównanie trenerów (bez danych osobowych)
55. [ ] Ogłoszenia: potwierdzenie odczytu i przypięcie
56. [ ] Grafik sal i zasobów
57. [ ] Zaproszenia trenerów linkiem

## 6. Powiadomienia i komunikacja
58. [ ] Cichy tryb
59. [ ] E-mail jako kanał zapasowy
60. [ ] Dzienne podsumowanie trenera
61. [ ] Czat: załączniki i potwierdzenie odczytu
62. [ ] Głębsze linki z powiadomień
63. [ ] Centrum powiadomień na web

## 7. Bezpieczeństwo i prywatność
64. [ ] Prywatne zdjęcia raportów (kod; test na prawdziwym magazynie po wdrożeniu)
65. [ ] Nagłówki bezpieczeństwa i CSP (najpierw tryb raportowania)
66. [ ] TOTP dla trenerów i właścicieli
67. [ ] Aktywne urządzenia i „wyloguj wszędzie"
68. [ ] Dziennik dostępu do danych podopiecznego
69. [ ] Zgody RODO per cel
70. [ ] Automatyczne usuwanie konta po 30 dniach
71. [ ] Aktualizacje zależności z lukami

## 8. Jakość i utrzymanie
72. [x] Kontrola przed wypchnięciem: `scripts/check.sh` + hook `scripts/install-hooks.sh` (typy, buildy, testy). [Ty] GitHub Actions: token nie ma zakresu `workflow`; gotowy plik w `docs/ci-github-actions.yml.example`, wystarczy go skopiować do `.github/workflows/ci.yml`
73. [ ] Testy przeglądarkowe kluczowych ścieżek web
74. [ ] Testy mobilne na symulatorze
75. [~] Typy w aplikacji web (80 → 32 błędów)
76. [ ] Podział `routes.ts` na moduły
77. [ ] Usunięcie martwego kodu
78. [ ] Dokument architektury i uruchamiania lokalnie
79. [ ] Migracje bazy jako pliki
80. [Ty] Kopie zapasowe bazy (dostęp do Replit/hostingu)

## 9. Wydajność i wygoda
81. [ ] Paginacja list
82. [ ] Indeksy dla zapytań harmonogramu
83. [ ] Kolejka zapisu offline
84. [ ] Dopracowanie ciemnego motywu
85. [ ] Dostępność web
86. [ ] Wersja angielska (przygotowanie tłumaczeń)

## 10. Marketing i wzrost
87. [ ] Strona dla trenerów podłączona do routera
88. [ ] Blog SEO (artykuły)
89. [Ty] Wejście na sklepy (konta deweloperskie, zrzuty ekranu)
90. [ ] Zaproszenie linkiem z podglądem
91. [ ] Program poleceń widoczny od pierwszego dnia
92. [ ] Ankieta po 30 dniach współpracy
