# Platforma Treningowa

## Przegląd
Profesjonalna platforma webowa dla trenerów i podopiecznych umożliwiająca zarządzanie planami treningowymi. Trenerzy mogą tworzyć szczegółowe plany treningowe i przypisywać je swoim podopiecznym, którzy mają dostęp do przypisanych planów przez przejrzysty interfejs.

## Funkcjonalności MVP
- ✅ Rejestracja i logowanie użytkowników z Replit Auth
- ✅ Wybór roli podczas pierwszego logowania (podopieczny/trener)
- ✅ Panel trenera z dashboard i statystykami
- ✅ Tworzenie, edycja i usuwanie planów treningowych
- ✅ Dodawanie ćwiczeń do planów (nazwa, serie, powtórzenia, opis, odpoczynek)
- ✅ Przypisywanie planów do podopiecznych
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
- Replit Auth (OpenID Connect) dla autentykacji
- PostgreSQL (Neon) database
- Drizzle ORM dla typu-bezpiecznego dostępu do bazy

### Model Danych
- `users` - użytkownicy z rolami (trainer/client)
- `sessions` - sesje użytkowników (Replit Auth)
- `trainingPlans` - plany treningowe utworzone przez trenerów
- `exercises` - ćwiczenia w planach (relacja 1:N)
- `planAssignments` - przypisania planów do podopiecznych
- `exerciseLogs` - historia wykonań ćwiczeń (powtórzenia, obciążenie, notatki, timestamp)

## API Endpoints

### Autentykacja
- `GET /api/login` - inicjuje flow logowania
- `GET /api/logout` - wylogowuje użytkownika
- `GET /api/auth/user` - zwraca zalogowanego użytkownika
- `POST /api/auth/update-role` - ustawia rolę użytkownika

### Trener
- `GET /api/plans` - lista planów trenera
- `POST /api/plans` - tworzy nowy plan
- `GET /api/plans/:id` - szczegóły planu
- `PUT /api/plans/:id` - aktualizuje plan
- `DELETE /api/plans/:id` - usuwa plan
- `POST /api/assignments/bulk` - przypisuje plan do wielu podopiecznych
- `GET /api/clients/available` - lista dostępnych podopiecznych
- `GET /api/trainer/clients` - lista podopiecznych trenera
- `GET /api/trainer/stats` - statystyki trenera

### Podopieczny
- `GET /api/client/assignment` - przypisany plan podopiecznego
- `POST /api/exercises/:exerciseId/log` - loguje wykonanie ćwiczenia
- `GET /api/exercises/:exerciseId/logs` - historia wykonań ćwiczenia
- `GET /api/exercises/:exerciseId/latest-log` - ostatnie wykonanie ćwiczenia (optymalizowane)

## User Journeys

### Trener
1. Logowanie przez Replit Auth
2. Wybór roli "Trener" (przy pierwszym logowaniu)
3. Dashboard z statystykami (liczba planów, podopiecznych, przypisań)
4. Tworzenie planu treningowego z ćwiczeniami
5. Przypisanie planu do podopiecznych
6. Przeglądanie listy podopiecznych z informacją o przypisanych planach

### Podopieczny
1. Logowanie przez Replit Auth
2. Wybór roli "Podopieczny" (przy pierwszym logowaniu)
3. Dashboard z informacją o przypisanym planie
4. Przeglądanie szczegółów planu treningowego z wszystkimi ćwiczeniami
5. **Logowanie wykonań** - dla każdego ćwiczenia formularz z automatycznym prefill ostatnich wartości
6. Zapisywanie powtórzeń, obciążenia i opcjonalnych notatek

## Technologie
- **Frontend**: React, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, Wouter
- **Backend**: Node.js, Express, TypeScript, Passport, OpenID Client
- **Database**: PostgreSQL (Neon), Drizzle ORM
- **Auth**: Replit Auth (OpenID Connect)
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
