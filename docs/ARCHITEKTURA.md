# Architektura i uruchamianie lokalne

## Części (monorepo pnpm)
| Folder | Co to jest |
|---|---|
| `artifacts/api-server` | API: Express 5, sesje (cookie) i tokeny mobilne (SHA-256), Drizzle + Postgres, Resend (e-mail), Stripe. Budowane esbuildem (**bez sprawdzania typów**). Trasy: `src/routes/routes.ts` (większość) i `src/routes/gym.ts` (studia); wysyłka powiadomień w `src/services/push.ts`, zadania cron w `src/services/*`, czysta logika w `src/lib/*` (każda z testem jednostkowym). |
| `artifacts/panel-trenera` | Aplikacja webowa: React + Vite, wouter, React Query, shadcn/ui. |
| `artifacts/panel-trenera-mobile` | Aplikacja mobilna: Expo SDK 54, expo-router, React Query; ma też wersję web (podgląd). |
| `lib/db` | Schemat bazy (`src/schema/schema.ts`) i klient Drizzle. Tabele dodawane przez `drizzle-kit push` przy publikacji. |
| `lib/api-zod`, `lib/api-client-react` | Wspólne typy i klient. |
| `docs/` | Checklista wdrożenia, plan ulepszeń, ten dokument. |
| `scripts/` | `check.sh` (typy, buildy, testy), `install-hooks.sh` (uruchamia je przed `git push`), `check-production.sh` (kontrola produkcji, tylko odczyt). |

## Najważniejsze zasady
- Role: `client`, `trainer`, `gym_owner`. Każdy endpoint sprawdza rolę **i** relację (trener ↔ podopieczny, właściciel ↔ studio). Testy `smoke-idor*.mjs` pilnują, żeby obcy użytkownik dostawał 403/404, nigdy 500 ani dane.
- Cron: jeden codzienny `POST /api/cron/payment-notifications` (Bearer `CRON_JOB_TOKEN`) wykonuje: powiadomienia o płatnościach, przypomnienia o treningach, podsumowanie poniedziałkowe (trenerzy, studia), przypomnienie o raporcie (niedziela). Każde zadanie ma deduplikację w historii powiadomień.
- Powiadomienia push: `sendPushToUserAndRecord` zapisuje historię, respektuje wyłączone rodzaje (`notification_preferences`), wysyła przez Expo i usuwa martwe tokeny. Dane powiadomienia zawsze zawierają `type` (po nim aplikacja wybiera ekran: `lib/notificationRoute.ts`).
- Zdjęcia i filmy: magazyn obiektów Replit (`objectStorage.ts`, ACL w `objectAcl.ts`); wysyłanie plików przez `/api/upload` ma twardą walidację (typ z MIME, magic bytes).

## Uruchomienie lokalne
1. Postgres (dowolny, np. Docker) i zmienne: `DATABASE_URL`, `SESSION_SECRET`, `CRON_JOB_TOKEN`, opcjonalnie `RESEND_API_KEY`, `STRIPE_*`.
2. `pnpm install`, potem schemat: `pnpm --filter @workspace/db push`.
3. API: w `artifacts/api-server` `node ./build.mjs`, potem `NODE_ENV=test PORT=3100 node --enable-source-maps ./dist/index.mjs` (`NODE_ENV=test` wyłącza limiter prób logowania, który inaczej psuje testy).
4. Web: w `artifacts/panel-trenera` `PORT=5173 BASE_PATH=/ npx vite`. Vite nie ma proxy `/api` w konfiguracji, więc potrzebny jest mały proxy (`/api` → 3100, reszta → Vite) z nagłówkiem `x-forwarded-proto: https` (inaczej cookie sesji `Secure` nie jest ustawiane).
5. Mobile (podgląd web): `EXPO_PUBLIC_DOMAIN=localhost:3100 CI=1 npx expo start --web --port 8082`. Tryb `CI=1` nie przeładowuje zmian: po edycji zrestartuj serwer.

## Testy
- `scripts/check.sh`: typy (libs, API, mobile), build API, testy jednostkowe API i mobile, build web.
- Testy API przez HTTP: `artifacts/api-server/scripts/README.md` (potrzebują 5 kont testowych ze zweryfikowanym e-mailem i API z `NODE_ENV=test`).
- Po zmianie `routes.ts` / `storage.ts` zawsze uruchom typy: esbuild nie wychwyci brakującego importu.

## Pułapki
- Nie uruchamiaj `pnpm run`/`pnpm exec` w repo bez potrzeby: automatyczna instalacja potrafi zepsuć `node_modules`; używaj `npx` lub `node ./node_modules/.../bin`.
- Tabela `sessions` to sesje logowania Expressa; terminy treningów są w `session_bookings`.
- `expo-notifications` z natywnym API (np. `useLastNotificationResponse`) wywala wersję web: trzymaj je w komponentach tylko dla natywnych platform.
- Zależności: `@hookform/resolvers` 3.x nie pasuje typami do zod v4 (zostały błędy typów w aplikacji web, działają w runtime).
