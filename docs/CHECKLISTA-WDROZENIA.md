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

**Uwaga — migracja bazy:** ta wersja dodaje nową tabelę `gym_announcements` (ogłoszenia studia; tylko dodanie, nic nie jest usuwane). Podczas publikacji Replit pokaże zmiany w bazie produkcyjnej — zatwierdź je. Bez tego endpointy ogłoszeń zwrócą błąd (reszta aplikacji działa).

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

To samo codzienne wywołanie wysyła też: przypomnienia o treningach (podopiecznym, <24 h przed terminem) i **poniedziałkowe podsumowanie tygodnia dla trenerów** (raz na 5 dni, tylko w poniedziałek czasu polskiego).

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
