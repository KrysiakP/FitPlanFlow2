# Platforma Treningowa

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
- `users` - użytkownicy z rolami (trainer/client)
- `sessions` - sesje użytkowników (express-session + connect-pg-simple)
- `trainingPlans` - plany treningowe utworzone przez trenerów
- `workouts` - treningi w planach (relacja 1:N)
- `exercises` - ćwiczenia w treningach (relacja 1:N)
- `planAssignments` - przypisania planów do podopiecznych
- `planInvitations` - zaproszenia do planów (trainerId, clientEmail, planId, status)
- `exerciseLogs` - historia wykonań ćwiczeń (powtórzenia, obciążenie, notatki, timestamp)
- `weeklyReports` - raporty tygodniowe podopiecznych (waga, pomiary, zdjęcia)

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

## User Journeys

### Trener
1. Rejestracja/logowanie przez email i hasło
2. Wybór roli "Trener" (przy pierwszym logowaniu)
3. Dashboard z statystykami (liczba planów, podopiecznych, przypisań)
4. Tworzenie planu treningowego z ćwiczeniami
5. Wysyłanie zaproszeń do planu przez email podopiecznego
6. Przeglądanie listy podopiecznych z informacją o przypisanych planach

### Podopieczny
1. Rejestracja/logowanie przez email i hasło
2. Wybór roli "Podopieczny" (przy pierwszym logowaniu)
3. Dashboard z informacją o przypisanym planie i zaproszeniach
4. Akceptacja/odrzucenie zaproszeń do planów treningowych
5. Przeglądanie szczegółów planu treningowego z wszystkimi ćwiczeniami
6. **Logowanie wykonań** - dla każdego ćwiczenia formularz z automatycznym prefill ostatnich wartości
7. Zapisywanie powtórzeń, obciążenia i opcjonalnych notatek

## Technologie
- **Frontend**: React, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, Wouter
- **Backend**: Node.js, Express, TypeScript, bcryptjs
- **Database**: PostgreSQL (Neon), Drizzle ORM
- **Auth**: Email/hasło z express-session + connect-pg-simple
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

## Następne Fazy
- Śledzenie postępów (podopieczni logują wykonane treningi)
- Widok kalendarza do planowania treningów
- Biblioteka ćwiczeń z obrazami/wideo
- System wiadomości trener-podopieczny
- Wykresy analityczne postępów
- System płatności dla trenerów (Stripe)
