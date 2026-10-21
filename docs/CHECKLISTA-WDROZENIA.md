# Checklista wdrożenia — Panel Trenera

Rzeczy, które wymagają Twojej akcji (kod jest już gotowy i wypchnięty na GitHub, gałąź `main`).

## 1. Opublikuj serwer (najpierw — zawiera poprawki bezpieczeństwa)

1. Replit → panel **Git** → **Pull** (jeśli są zmiany z GitHuba).
2. **Publish / Deploy** ponownie.
3. Sprawdź z zewnątrz (Terminal na Macu):

   ```bash
   curl -s -o /dev/null -w "%{http_code}\n" https://paneltrenera.pl/api/healthz        # oczekiwane: 200
   curl -s -i -X PATCH https://paneltrenera.pl/api/gym/me | head -1                    # oczekiwane: 401 (a nie 404)
   ```

**Uwaga — migracja bazy:** ta wersja dodaje sześć nowych tabel (oraz trzy kolumny w tabeli `users` dla logowania dwuskładnikowego: `totp_secret`, `totp_enabled`, `totp_backup_codes`; oraz kolumna `is_warmup` w `exercise_logs` i kolumny `sleep_hours`, `water_liters` w `weekly_reports` oraz `rpe`, `trainer_comment`, `trainer_commented_at` w `workout_sessions`): `gym_announcements` (ogłoszenia studia), `notification_preferences` (które przypomnienia użytkownik wyłączył) `data_access_log` (kto oglądał dane podopiecznego) `client_labels` (etykiety trenera) `client_goals` (cele wagowe podopiecznych) i `client_reminders` (przypomnienia trenera); tylko dodanie, nic nie jest usuwane. Podczas publikacji Replit pokaże zmiany w bazie produkcyjnej — zatwierdź je. Bez tego endpointy ogłoszeń i ustawień powiadomień zwrócą błąd (reszta aplikacji działa, przypomnienia nadal będą wysyłane).

W tej publikacji: poprawka luki XSS w wysyłaniu plików, limity prób dla kodów, zabezpieczenia dostępu,
powiadomienia o terminach, edycja studia, zaproszenia jednym kliknięciem.

## 2. Ustaw harmonogram powiadomień (płatności i przypomnienia o treningach)

Dziś zadanie **nie działa**: `POST /api/cron/payment-notifications` odpowiada „Cron job token not configured".

1. Wygeneruj token: `openssl rand -hex 32`.
2. Replit → **Secrets** → dodaj `CRON_JOB_TOKEN` = ten token → opublikuj ponownie.
3. Ustaw codzienne wywołanie (np. o 8:00 czasu polskiego):
   - Replit **Scheduled Deployment**, albo darmowy cron-job.org,
   - `POST https://paneltrenera.pl/api/cron/payment-notifications`
   - nagłówek: `Authorization: Bearer <ten token>`
4. Sprawdź: zapytanie bez tokenu powinno dać **401** (a nie 500).

To samo codzienne wywołanie wysyła też: przypomnienia o treningach (podopiecznym, <24 h przed terminem), **poniedziałkowe podsumowanie tygodnia** dla trenerów i właścicieli studiów **przypomnienia trenera o podopiecznych w dniu terminu**, **prośbę o opinię o trenerze po miesiącu współpracy**, **przypomnienie dla trenerów na 3 dni przed końcem okresu próbnego** oraz **niedzielne przypomnienie o raporcie tygodniowym** dla podopiecznych, którzy nie wysłali raportu od 6 dni (każde najwyżej raz na 5 dni).

## 3. Zbuduj aplikacje mobilne

Zmiany w aplikacji: rejestracja i panel studia, tryb offline, wylogowanie po wygaśnięciu sesji, kalendarz po polsku,
poprawki układu, opisy dla czytników ekranu, powiadomienia o terminach.

W Terminalu, w `artifacts/panel-trenera-mobile` (versionCode/buildNumber rosną automatycznie):

```bash
eas build --platform ios --profile production --non-interactive
eas build --platform android --profile production --non-interactive
```

Potem: iOS → TestFlight, Android → Google Play (Produkcja, następnie „Zgłoś poprawkę").

## 4. Stripe (gdy będziesz gotowy)

W Replit → Secrets: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
`STRIPE_SOLO_PRICE_ID`, `STRIPE_PRO_PRICE_ID`, `STRIPE_ELITE_PRICE_ID`, `STRIPE_MAX_PRICE_ID`.
Webhook w Stripe: `https://paneltrenera.pl/api/webhooks/stripe`, zdarzenia
`checkout.session.completed`, `customer.subscription.created|updated|deleted`, `invoice.payment_failed`, `invoice.paid`.
Logika webhooka jest przetestowana lokalnie (`pnpm --filter @workspace/api-server test:stripe`).

## 5. Do decyzji później

- Billing dla Studio (dziś „wycena indywidualna", kontakt mailowy).
- Zdjęcia raportów w chmurze mają widoczność „publiczną" (dostępną po ścieżce dla zalogowanych) — do przeglądu.
