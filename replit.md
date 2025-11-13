# Panel Trenera

## Przegląd
Profesjonalna platforma webowa dla trenerów i podopiecznych umożliwiająca zarządzanie planami treningowymi. Trenerzy mogą tworzyć szczegółowe plany treningowe i przypisywać je swoim podopiecznym, którzy mają dostęp do przypisanych planów przez przejrzysty interfejs.

## Funkcjonalności MVP
- ✅ Rejestracja i logowanie użytkowników (email/hasło)
- ✅ Wybór roli podczas pierwszego logowania (podopieczny/trener)
- ✅ Panel trenera z dashboard i statystykami
- ✅ Tworzenie, edycja i usuwanie planów treningowych
- ✅ Dodawanie ćwiczeń do planów (nazwa, serie, powtórzenia, opis, odpoczynek)
- ✅ **System zaproszeń** - trener wysyła zaproszenie przez email, podopieczny akceptuje/odrzuca
- ✅ Panel podopiecznego z dostępem do przypisanego planu
- ✅ Lista podopiecznych dla trenera
- ✅ **Logowanie wykonań ćwiczeń** - podopieczni mogą zapisywać swoje wyniki (powtórzenia, obciążenie)
- ✅ **Automatyczne prefill** - formularz ładuje ostatnie zalogowane wartości
- ✅ **System subskrypcji Stripe** - trenerzy płacą za dostęp do platformy (SaaS model)
- ✅ **Free tier (0 zł/mies)** - max 10 podopiecznych, wszystkie funkcje
- ✅ **Premium tier (49 zł/mies)** - nieograniczona liczba podopiecznych
- ✅ **Zarządzanie subskrypcją** - upgrade, downgrade, anulowanie przez Stripe Customer Portal
- ✅ **Webhook handler** - automatyczna synchronizacja statusu subskrypcji
- ✅ **System 5-tier subskrypcji** - START (0 zł, 3 podopiecznych), SOLO (129 zł, 20), PRO (249 zł, 50), ELITE (499 zł, 150), STUDIO (999 zł+, wielutrenerski)
- ✅ **System PomagaMY** - administrator publikuje miesięczne potwierdzenia wpłat charytatywnych, transparentność dla użytkowników
- ✅ **Sekcja "Polska marka"** - podkreślenie lokalnego charakteru platformy w landing page i footer
- ✅ Całkowicie polski interfejs użytkownika
- ✅ Baza danych PostgreSQL z persystencją danych

## Architektura
### Frontend
- React SPA z Wouter routing
- Tailwind CSS + shadcn/ui components
- TanStack Query dla zarządzania stanem i cache
- React Hook Form + Zod validation
- Inter (UI) i Poppins (nagłówki) fonts

### Backend  
- Express.js API server
- Email/hasło autentykacja z bcryptjs
- Express session z PostgreSQL storage
- PostgreSQL (Neon) database
- Drizzle ORM dla typu-bezpiecznego dostępu do bazy

### Model Danych
- `users` - użytkownicy z rolami (trainer/client) + pola subskrypcji:
  - `isAdmin` - flaga administratora platformy (boolean, default false)
  - `stripeCustomerId` - ID klienta w Stripe (unique)
  - `stripeSubscriptionId` - ID aktywnej subskrypcji
  - `subscriptionStatus` - status: active, canceled, past_due, etc.
  - `subscriptionTier` - tier: start, solo, pro, elite, studio
- `sessions` - sesje użytkowników (express-session + connect-pg-simple)
- `trainingPlans` - plany treningowe utworzone przez trenerów
- `workouts` - treningi w planach (relacja 1:N)
- `exercises` - ćwiczenia w treningach (relacja 1:N)
- `planAssignments` - przypisania planów do podopiecznych
- `planInvitations` - zaproszenia do planów (trainerId, clientEmail, planId, status)
- `exerciseLogs` - historia wykonań ćwiczeń (powtórzenia, obciążenie, notatki, timestamp)
- `weeklyReports` - raporty tygodniowe podopiecznych (waga, pomiary, zdjęcia)
- `charityDonations` - miesięczne potwierdzenia wpłat charytatywnych (month, year, documentUrl, uploadedAt) + unique index na (month, year)

## API Endpoints

### Autentykacja
- `POST /api/register` - rejestracja użytkownika (email, hasło, firstName, lastName)
- `POST /api/login` - logowanie (email, hasło)
- `POST /api/logout` - wylogowanie użytkownika
- `GET /api/auth/user` - zwraca zalogowanego użytkownika
- `POST /api/auth/update-role` - ustawia rolę użytkownika

### Trener
- `GET /api/plans` - lista planów trenera
- `POST /api/plans` - tworzy nowy plan
- `GET /api/plans/:id` - szczegóły planu
- `PUT /api/plans/:id` - aktualizuje plan
- `DELETE /api/plans/:id` - usuwa plan
- `POST /api/assignments/bulk` - przypisuje plan do wielu podopiecznych
- `GET /api/trainer/clients` - lista podopiecznych trenera
- `GET /api/trainer/stats` - statystyki trenera

### Zaproszenia
- `POST /api/invitations/send` - trener wysyła zaproszenie do planu (clientEmail, planId)
- `GET /api/invitations` - pobiera zaproszenia (dla trenera: wszystkie, dla podopiecznego: pending)
- `POST /api/invitations/:id/accept` - podopieczny akceptuje zaproszenie
- `POST /api/invitations/:id/reject` - podopieczny odrzuca zaproszenie

### Podopieczny
- `GET /api/client/assignment` - przypisany plan podopiecznego
- `POST /api/exercises/:exerciseId/log` - loguje wykonanie ćwiczenia
- `GET /api/exercises/:exerciseId/logs` - historia wykonań ćwiczenia
- `GET /api/exercises/:exerciseId/latest-log` - ostatnie wykonanie ćwiczenia (optymalizowane)

### Subskrypcje (Stripe)
- `POST /api/subscription/create-checkout` - tworzy Stripe Checkout Session dla upgrade (przyjmuje tier parameter)
- `POST /api/subscription/portal` - tworzy link do Stripe Customer Portal (zarządzanie subskrypcją)
- `POST /api/webhooks/stripe` - webhook handler dla eventów Stripe (require signature verification)
- `GET /api/subscription/status` - zwraca aktualny status subskrypcji trenera

### PomagaMY (Charity Donations)
- `GET /api/charity-donations` - publiczny endpoint, lista wszystkich potwierdzeń wpłat (sortowane DESC)
- `POST /api/admin/charity-donations` - tylko admin, tworzy nowe potwierdzenie (month, year, documentUrl)
- `DELETE /api/admin/charity-donations/:id` - tylko admin, usuwa potwierdzenie

## User Journeys

### Trener
1. Rejestracja/logowanie przez email i hasło
2. Wybór roli "Trener" (przy pierwszym logowaniu) - automatycznie Free tier
3. Dashboard z statystykami (liczba planów, podopiecznych, przypisań)
4. Tworzenie planu treningowego z ćwiczeniami
5. **Wysyłanie zaproszeń do planu:**
   - **Szybki dostęp:** Zakładka "Zaproś podopiecznego" w menu bocznym (ikona UserPlus)
   - **Strona /invite:** Formularz z polem email (pierwsze) + dropdown wyboru planu (drugie)
   - **User-friendly:** Informacja, że plan można też przypisać później z listy podopiecznych
   - **Instrukcje:** Sekcja "Jak to działa?" wyjaśniająca proces
   - **Limit Free tier:** maksymalnie 10 aktywnych podopiecznych
   - Alert z informacją o limicie i CTA do upgrade
6. Przeglądanie listy podopiecznych z informacją o przypisanych planach
7. **Zarządzanie subskrypcją:**
   - Badge Premium/Free w navbar (dropdown menu)
   - Panel w profilu z aktualnym planem i ceną
   - Przycisk "Ulepsz do Premium" dla Free users
   - Przycisk "Zarządzaj subskrypcją" dla Premium users → Stripe Customer Portal
8. **Stripe Checkout flow:**
   - Strona /pricing z porównaniem planów Free vs Premium
   - Checkout Session z metadanymi userId
   - Redirect do Stripe hosted checkout
   - Success/cancel URLs
9. **Automatyczna synchronizacja:**
   - Webhook events (checkout.session.completed, customer.subscription.*)
   - Aktualizacja statusu i tier w bazie danych
   - Real-time enforcement limitów

### Podopieczny
1. Rejestracja/logowanie przez email i hasło
2. Wybór roli "Podopieczny" (przy pierwszym logowaniu)
3. **Dashboard z informacją o przypisanym planie i zaproszeniach:**
   - **Nowe zaproszenia** wyświetlane w widocznej Card z:
     - Border i background w kolorze primary
     - Badge z licznikiem zaproszeń na ikonie Mail
     - Każde zaproszenie w osobnej sekcji z avatarem trenera
     - Przyciski Akceptuj/Odrzuć z ikonami i loading spinners
4. Akceptacja/odrzucenie zaproszeń do planów treningowych
5. Przeglądanie szczegółów planu treningowego z wszystkimi ćwiczeniami
6. **Logowanie wykonań** - dla każdego ćwiczenia formularz z automatycznym prefill ostatnich wartości
7. Zapisywanie powtórzeń, obciążenia i opcjonalnych notatek

## Technologie
- **Frontend**: React, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, Wouter
- **Backend**: Node.js, Express, TypeScript, bcryptjs
- **Database**: PostgreSQL (Neon), Drizzle ORM
- **Auth**: Email/hasło z express-session + connect-pg-simple
- **Payments**: Stripe (Checkout, Customer Portal, Webhooks)
- **Deployment**: Replit

## Uruchomienie
```bash
npm run dev  # Uruchamia Express + Vite dev server na porcie 5000
```

## Database Operations
```bash
npm run db:push  # Synchronizuje schemat z bazą danych
```

## Design System
Aplikacja używa profesjonalnego systemu projektowego opisanego w `design_guidelines.md`:
- Czcionki: Inter (UI) i Poppins (nagłówki)
- Spacing: 2, 4, 6, 8 jednostek Tailwind
- Komponenty: Shadcn UI z własnymi theme tokens
- Ikony: Lucide React
- Język: Polski z właściwymi znakami diakrytycznymi

## Model Biznesowy
**Trenerzy płacą, podopieczni korzystają za darmo:**
- Trenerzy subskrybują platformę (Free lub Premium)
- Podopieczni nie płacą platformie - rozliczają się prywatnie z trenerem
- Free tier: Max 10 podopiecznych, 0 zł/mies
- Premium tier: Nieograniczona liczba podopiecznych, 49 zł/mies

## Zmienne środowiskowe
Wymagane dla funkcjonowania systemu płatności:
- `STRIPE_SECRET_KEY` - Secret key z Stripe Dashboard
- `STRIPE_WEBHOOK_SECRET` - Secret dla webhook signature verification
- `VITE_STRIPE_PUBLIC_KEY` - Publishable key dla frontend (prefiks VITE_)
- `DATABASE_URL`, `SESSION_SECRET` - standardowe zmienne

## System PomagaMY - Administrator
**Administrator platformy** (użytkownik z flagą `isAdmin=true`) ma dostęp do specjalnego panelu:

### Panel Admin (/admin/charity-donations)
1. Formularz do dodawania miesięcznych potwierdzeń wpłat:
   - Wybór miesiąca (polskie nazwy)
   - Rok wpłaty
   - Upload dokumentu (PDF/JPG/PNG) - automatyczny upload do /attached_assets/uploads
   - Walidacja: brak duplikatów dla tego samego miesiąca i roku
2. Lista wszystkich potwierdzeń z możliwością usunięcia

### Publiczna strona PomagaMY (/pomagamy)
- Dostępna dla wszystkich użytkowników (trenerzy i podopieczni)
- Lista wszystkich miesięcznych potwierdzeń wpłat charytatywnych
- Każde potwierdzenie zawiera:
  * Miesiąc i rok (polskie formatowanie)
  * Data uploadu
  * Link do dokumentu (PDF/obrazek)
  * Badge "Zweryfikowane"
- Sortowanie: od najnowszych do najstarszych

### Jak ustawić administratora?
Administrator musi być ustawiony ręcznie w bazie danych:
```sql
UPDATE users SET is_admin = true WHERE email = 'twoj-email@example.com';
```

## Następne Fazy
- ✅ **System płatności 5-tier** - ZAKOŃCZONE
- ✅ **System PomagaMY** - ZAKOŃCZONE  
- ✅ **Sekcja "Polska marka"** - ZAKOŃCZONE
- Widok kalendarza do planowania treningów
- Rozszerzona biblioteka ćwiczeń z kategoryzacją
- System wiadomości trener-podopieczny
- Wykresy analityczne postępów
- Email notifications dla zaproszeń i raportów
- Mobile responsive improvements
